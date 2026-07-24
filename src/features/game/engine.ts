import { z } from "zod";

import {
  categoryConfig,
  categoryIds,
  type CategoryId,
} from "@/config/categories";
import { getProgressionStep } from "@/config/difficulty";
import { gameConfig, type GameMode } from "@/config/game";
import { scoringConfig } from "@/config/scoring";
import { calculateSessionXp } from "@/config/xp";
import { binaryChoiceSchema, challengeSchema } from "@/features/game/schemas";
import type {
  ActiveGameStatus,
  AttemptResolution,
  BinaryChoice,
  CategoryPerformance,
  Challenge,
  GameEndReason,
  GameEngineState,
  GameRunSubmission,
  GameSummary,
  QuestionRules,
} from "@/features/game/types";
import { clamp } from "@/lib/utils";

const activeStatusSchema = z.enum(["loading", "playing", "feedback"]);
const gameStatusSchema = z.enum([
  "idle",
  "loading",
  "playing",
  "feedback",
  "paused",
  "completed",
  "error",
]);
const endReasonSchema = z.enum([
  "lives_depleted",
  "training_exit",
  "challenge_pool_exhausted",
]);

const attemptResolutionSchema = z.object({
  sequence: z.number().int().positive(),
  challengeId: z.string().min(1),
  category: z.enum(categoryIds),
  selectedChoice: binaryChoiceSchema.nullable(),
  correctChoice: binaryChoiceSchema,
  isCorrect: z.boolean(),
  timedOut: z.boolean(),
  responseMs: z.number().int().nonnegative(),
  obtainablePoints: z.number().int().nonnegative(),
  awardedPoints: z.number().int().nonnegative(),
  comboBefore: z.number().int().nonnegative(),
  comboAfter: z.number().int().nonnegative(),
  comboMultiplier: z.number().positive(),
  livesBefore: z.number().int().nonnegative().nullable(),
  livesAfter: z.number().int().nonnegative().nullable(),
  questionNumber: z.number().int().positive(),
  difficultyStepId: z.string().min(1),
  maximumPoints: z.number().int().positive(),
  plateauMs: z.number().int().nonnegative(),
  timeLimitMs: z.number().int().positive(),
  decayAlpha: z.number().nonnegative(),
  decayBeta: z.number().positive(),
});

const gameEngineStateSchema = z.object({
  schemaVersion: z.literal(1),
  runId: z.string().min(1),
  mode: z.enum(gameConfig.modes),
  enabledCategories: z.array(z.enum(categoryIds)).min(1),
  status: gameStatusSchema,
  pausedFromStatus: activeStatusSchema.nullable(),
  challengeQueue: z.array(challengeSchema),
  currentChallenge: challengeSchema.nullable(),
  seenChallengeIds: z.array(z.string().min(1)),
  cycleSeenChallengeIds: z.array(z.string().min(1)),
  cycleNumber: z.number().int().positive(),
  attempts: z.array(attemptResolutionSchema),
  score: z.number().int().nonnegative(),
  combo: z.number().int().nonnegative(),
  longestCombo: z.number().int().nonnegative(),
  lives: z.number().int().nonnegative().nullable(),
  questionNumber: z.number().int().nonnegative(),
  questionStartedAtMs: z.number().nonnegative().nullable(),
  questionElapsedBeforePauseMs: z.number().nonnegative(),
  startedAtMs: z.number().nonnegative(),
  endedAtMs: z.number().nonnegative().nullable(),
  endReason: endReasonSchema.nullable(),
  errorMessage: z.string().nullable(),
  shuffleSeed: z.number().int(),
});

function normalizedTime(value: number): number {
  if (Number.isNaN(value) || value === Number.NEGATIVE_INFINITY) return 0;
  if (value === Number.POSITIVE_INFINITY) return Number.MAX_SAFE_INTEGER;
  return Math.max(0, value);
}

function uniqueChallenges(challenges: readonly Challenge[]): Challenge[] {
  const seen = new Set<string>();

  return challenges.filter((challenge) => {
    if (seen.has(challenge.id)) return false;
    seen.add(challenge.id);
    return true;
  });
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function shuffleChallenges(
  challenges: readonly Challenge[],
  seed: number,
): Challenge[] {
  const shuffled = [...challenges];
  const random = seededRandom(seed);

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = shuffled[index]!;
    shuffled[index] = shuffled[swapIndex]!;
    shuffled[swapIndex] = current;
  }

  return shuffled;
}

export function getComboMultiplier(combo: number): number {
  const normalizedCombo = Math.max(0, Math.floor(combo));

  return scoringConfig.comboSteps.reduce(
    (multiplier, step) =>
      normalizedCombo >= step.minimumCombo ? step.multiplier : multiplier,
    1,
  );
}

export function getQuestionRules(
  category: CategoryId,
  questionNumber: number,
): QuestionRules {
  const categoryRules = categoryConfig[category];
  const progression = getProgressionStep(questionNumber);
  const maximumPoints = Math.round(
    scoringConfig.basePoints * progression.maximumPointsMultiplier,
  );
  const timeLimitMs = Math.round(
    categoryRules.timeLimitMs * progression.timeLimitMultiplier,
  );
  const plateauMs = Math.min(
    timeLimitMs - 1,
    Math.round(categoryRules.plateauMs * progression.plateauMultiplier),
  );
  const decayWindowMs = Math.max(1, timeLimitMs - plateauMs);
  const decayAlpha =
    maximumPoints / Math.pow(decayWindowMs, categoryRules.decayBeta);

  return {
    difficultyStepId: progression.id,
    difficultyLabel: progression.label,
    maximumPoints,
    plateauMs,
    timeLimitMs,
    decayAlpha,
    decayBeta: categoryRules.decayBeta,
  };
}

/**
 * Scores with the plateau-and-power-decay curve:
 * max(0, M - alpha * (t - tp) ^ beta), after t exceeds tp.
 */
export function calculateObtainablePoints({
  responseMs,
  challenge,
  category = challenge?.category,
  questionNumber = 1,
}: {
  responseMs: number;
  challenge?: Challenge;
  category?: CategoryId;
  questionNumber?: number;
  combo?: number;
}): number {
  if (!category) throw new Error("A challenge category is required");

  const rules = getQuestionRules(category, questionNumber);
  const elapsedMs = clamp(
    Math.round(normalizedTime(responseMs)),
    0,
    rules.timeLimitMs,
  );

  if (elapsedMs <= rules.plateauMs) return rules.maximumPoints;

  const decayedPoints =
    rules.maximumPoints -
    rules.decayAlpha * Math.pow(elapsedMs - rules.plateauMs, rules.decayBeta);

  return Math.round(clamp(decayedPoints, 0, rules.maximumPoints));
}

export function resolveAnswer({
  challenge,
  selectedChoice,
  responseMs,
  combo,
  questionNumber = 1,
  sequence = questionNumber,
  lives = null,
}: {
  challenge: Challenge;
  selectedChoice: BinaryChoice | null;
  responseMs: number;
  combo: number;
  questionNumber?: number;
  sequence?: number;
  lives?: number | null;
  mode?: GameMode;
}): AttemptResolution {
  const rules = getQuestionRules(challenge.category, questionNumber);
  const normalizedResponseMs = clamp(
    Math.round(normalizedTime(responseMs)),
    0,
    Math.min(gameConfig.maxResponseMs, rules.timeLimitMs),
  );
  const timedOut =
    selectedChoice === null || normalizedResponseMs >= rules.timeLimitMs;
  const normalizedChoice = timedOut ? null : selectedChoice;
  const isCorrect =
    normalizedChoice !== null && normalizedChoice === challenge.correctChoice;
  const comboAfter = isCorrect ? combo + 1 : 0;
  const comboMultiplier = isCorrect ? getComboMultiplier(comboAfter) : 1;
  const obtainablePoints = calculateObtainablePoints({
    category: challenge.category,
    questionNumber,
    responseMs: normalizedResponseMs,
  });
  const livesAfter =
    lives === null || isCorrect ? lives : Math.max(0, lives - 1);

  return {
    sequence,
    challengeId: challenge.id,
    category: challenge.category,
    selectedChoice: normalizedChoice,
    correctChoice: challenge.correctChoice,
    isCorrect,
    timedOut,
    responseMs: normalizedResponseMs,
    obtainablePoints,
    awardedPoints: isCorrect
      ? Math.round(obtainablePoints * comboMultiplier)
      : scoringConfig.incorrectPoints,
    comboBefore: combo,
    comboAfter,
    comboMultiplier,
    livesBefore: lives,
    livesAfter,
    questionNumber,
    difficultyStepId: rules.difficultyStepId,
    maximumPoints: rules.maximumPoints,
    plateauMs: rules.plateauMs,
    timeLimitMs: rules.timeLimitMs,
    decayAlpha: rules.decayAlpha,
    decayBeta: rules.decayBeta,
  };
}

function activateNextChallenge(
  state: GameEngineState,
  nowMs: number,
): GameEngineState {
  const [currentChallenge, ...challengeQueue] = state.challengeQueue;

  if (!currentChallenge) {
    return {
      ...state,
      status: "loading",
      currentChallenge: null,
      questionStartedAtMs: null,
      questionElapsedBeforePauseMs: 0,
    };
  }

  return {
    ...state,
    status: "playing",
    challengeQueue,
    currentChallenge,
    seenChallengeIds: Array.from(
      new Set([...state.seenChallengeIds, currentChallenge.id]),
    ),
    cycleSeenChallengeIds: Array.from(
      new Set([...state.cycleSeenChallengeIds, currentChallenge.id]),
    ),
    questionNumber: state.questionNumber + 1,
    questionStartedAtMs: normalizedTime(nowMs),
    questionElapsedBeforePauseMs: 0,
  };
}

export function createGameState({
  runId,
  mode,
  enabledCategories,
  initialChallenges,
  nowMs,
  shuffleSeed,
}: {
  runId: string;
  mode: GameMode;
  enabledCategories: readonly CategoryId[];
  initialChallenges: readonly Challenge[];
  nowMs: number;
  shuffleSeed: number;
}): GameEngineState {
  const categories = categoryIds.filter((category) =>
    enabledCategories.includes(category),
  );

  if (categories.length === 0) {
    throw new Error("At least one challenge category must be enabled");
  }

  const eligibleChallenges = uniqueChallenges(initialChallenges).filter(
    (challenge) => categories.includes(challenge.category),
  );
  const startedAtMs = normalizedTime(nowMs);
  const state: GameEngineState = {
    schemaVersion: 1,
    runId,
    mode,
    enabledCategories: categories,
    status: "loading",
    pausedFromStatus: null,
    challengeQueue: shuffleChallenges(eligibleChallenges, shuffleSeed),
    currentChallenge: null,
    seenChallengeIds: [],
    cycleSeenChallengeIds: [],
    cycleNumber: 1,
    attempts: [],
    score: 0,
    combo: 0,
    longestCombo: 0,
    lives: mode === "arcade" ? gameConfig.initialLives : null,
    questionNumber: 0,
    questionStartedAtMs: null,
    questionElapsedBeforePauseMs: 0,
    startedAtMs,
    endedAtMs: null,
    endReason: null,
    errorMessage: null,
    shuffleSeed,
  };

  return activateNextChallenge(state, startedAtMs);
}

export function getCurrentQuestionElapsedMs(
  state: GameEngineState,
  nowMs: number,
): number {
  if (state.questionStartedAtMs === null) {
    return Math.round(state.questionElapsedBeforePauseMs);
  }

  return Math.round(
    state.questionElapsedBeforePauseMs +
      Math.max(0, normalizedTime(nowMs) - state.questionStartedAtMs),
  );
}

export function appendChallengeBatch(
  state: GameEngineState,
  challenges: readonly Challenge[],
  nowMs: number,
): GameEngineState {
  if (state.status === "completed" || state.status === "error") return state;

  const excludedIds = new Set(getBatchExclusionIds(state));
  const additions = uniqueChallenges(challenges).filter(
    (challenge) =>
      state.enabledCategories.includes(challenge.category) &&
      !excludedIds.has(challenge.id),
  );

  if (additions.length === 0) return state;

  const challengeQueue = [
    ...state.challengeQueue,
    ...shuffleChallenges(
      additions,
      state.shuffleSeed + state.cycleNumber * 1_009 + state.questionNumber * 31,
    ),
  ];
  const nextState = {
    ...state,
    challengeQueue,
    errorMessage: null,
  };

  if (state.status === "loading" && state.currentChallenge === null) {
    return activateNextChallenge(nextState, nowMs);
  }

  return nextState;
}

export function getBatchExclusionIds(state: GameEngineState): string[] {
  return Array.from(
    new Set([
      ...state.cycleSeenChallengeIds,
      ...(state.currentChallenge ? [state.currentChallenge.id] : []),
      ...state.challengeQueue.map((challenge) => challenge.id),
    ]),
  );
}

export function needsBatchRefill(state: GameEngineState): boolean {
  return (
    state.status !== "idle" &&
    state.status !== "completed" &&
    state.status !== "error" &&
    state.challengeQueue.length < gameConfig.batch.refillThreshold
  );
}

export function beginNewChallengeCycle(
  state: GameEngineState,
): GameEngineState {
  if (state.status === "completed" || state.status === "error") return state;

  const retainedIds = [
    ...(state.currentChallenge ? [state.currentChallenge.id] : []),
    ...state.challengeQueue.map((challenge) => challenge.id),
  ];

  return {
    ...state,
    cycleNumber: state.cycleNumber + 1,
    cycleSeenChallengeIds: Array.from(new Set(retainedIds)),
  };
}

export function answerCurrentChallenge(
  state: GameEngineState,
  selectedChoice: BinaryChoice,
  nowMs: number,
): GameEngineState {
  if (
    state.status !== "playing" ||
    !state.currentChallenge ||
    state.questionStartedAtMs === null
  ) {
    return state;
  }

  const responseMs = getCurrentQuestionElapsedMs(state, nowMs);
  const rules = getQuestionRules(
    state.currentChallenge.category,
    state.questionNumber,
  );

  if (responseMs >= rules.timeLimitMs) {
    return expireCurrentChallenge(state, nowMs);
  }

  return applyResolution(
    state,
    resolveAnswer({
      challenge: state.currentChallenge,
      selectedChoice,
      responseMs,
      combo: state.combo,
      questionNumber: state.questionNumber,
      sequence: state.attempts.length + 1,
      lives: state.lives,
      mode: state.mode,
    }),
  );
}

export function expireCurrentChallenge(
  state: GameEngineState,
  nowMs: number,
): GameEngineState {
  if (
    state.status !== "playing" ||
    !state.currentChallenge ||
    state.questionStartedAtMs === null
  ) {
    return state;
  }

  const rules = getQuestionRules(
    state.currentChallenge.category,
    state.questionNumber,
  );
  const responseMs = getCurrentQuestionElapsedMs(state, nowMs);

  if (responseMs < rules.timeLimitMs) return state;

  return applyResolution(
    state,
    resolveAnswer({
      challenge: state.currentChallenge,
      selectedChoice: null,
      responseMs: rules.timeLimitMs,
      combo: state.combo,
      questionNumber: state.questionNumber,
      sequence: state.attempts.length + 1,
      lives: state.lives,
      mode: state.mode,
    }),
  );
}

function applyResolution(
  state: GameEngineState,
  resolution: AttemptResolution,
): GameEngineState {
  return {
    ...state,
    status: "feedback",
    attempts: [...state.attempts, resolution],
    score: state.score + resolution.awardedPoints,
    combo: resolution.comboAfter,
    longestCombo: Math.max(state.longestCombo, resolution.comboAfter),
    lives: resolution.livesAfter,
    questionStartedAtMs: null,
    questionElapsedBeforePauseMs: resolution.responseMs,
  };
}

function completeGame(
  state: GameEngineState,
  endReason: GameEndReason,
  nowMs: number,
): GameEngineState {
  return {
    ...state,
    status: "completed",
    pausedFromStatus: null,
    currentChallenge: null,
    challengeQueue: [],
    questionStartedAtMs: null,
    endedAtMs: normalizedTime(nowMs),
    endReason,
    errorMessage: null,
  };
}

export function advanceToNextChallenge(
  state: GameEngineState,
  nowMs: number,
): GameEngineState {
  if (state.status !== "feedback") return state;

  if (state.mode === "arcade" && state.lives === 0) {
    return completeGame(state, "lives_depleted", nowMs);
  }

  return activateNextChallenge(
    {
      ...state,
      currentChallenge: null,
      questionStartedAtMs: null,
      questionElapsedBeforePauseMs: 0,
    },
    nowMs,
  );
}

export function exitTraining(
  state: GameEngineState,
  nowMs: number,
): GameEngineState {
  if (state.mode !== "training" || state.status === "completed") return state;
  return completeGame(state, "training_exit", nowMs);
}

export function finishForExhaustedPool(
  state: GameEngineState,
  nowMs: number,
): GameEngineState {
  if (state.status === "completed") return state;
  return completeGame(state, "challenge_pool_exhausted", nowMs);
}

export function pauseGame(
  state: GameEngineState,
  nowMs: number,
): GameEngineState {
  if (!["loading", "playing", "feedback"].includes(state.status)) return state;

  const activeStatus = state.status as ActiveGameStatus;
  const elapsed =
    activeStatus === "playing"
      ? getCurrentQuestionElapsedMs(state, nowMs)
      : state.questionElapsedBeforePauseMs;

  return {
    ...state,
    status: "paused",
    pausedFromStatus: activeStatus,
    questionStartedAtMs: null,
    questionElapsedBeforePauseMs: elapsed,
  };
}

export function resumeGame(
  state: GameEngineState,
  nowMs: number,
): GameEngineState {
  if (state.status !== "paused" || state.pausedFromStatus === null)
    return state;

  const restoredStatus = state.pausedFromStatus;

  return {
    ...state,
    status: restoredStatus,
    pausedFromStatus: null,
    questionStartedAtMs:
      restoredStatus === "playing" ? normalizedTime(nowMs) : null,
  };
}

export function failGame(
  state: GameEngineState,
  message: string,
): GameEngineState {
  if (state.status === "completed") return state;

  return {
    ...state,
    status: "error",
    pausedFromStatus: null,
    questionStartedAtMs: null,
    errorMessage: message.trim() || "The game could not continue.",
  };
}

export function getGameSummary(state: GameEngineState): GameSummary | null {
  if (state.status !== "completed" || state.endReason === null) return null;

  const answered = state.attempts.length;
  const correct = state.attempts.filter((attempt) => attempt.isCorrect).length;
  const timedOut = state.attempts.filter((attempt) => attempt.timedOut).length;
  const responseTotal = state.attempts.reduce(
    (total, attempt) => total + attempt.responseMs,
    0,
  );
  const responseTimes = state.attempts.map((attempt) => attempt.responseMs);
  const categoryBreakdown = state.attempts.reduce<
    Partial<
      Record<CategoryId, CategoryPerformance & { responseTotalMs: number }>
    >
  >((breakdown, attempt) => {
    const current = breakdown[attempt.category] ?? {
      answered: 0,
      correct: 0,
      incorrect: 0,
      timedOut: 0,
      score: 0,
      averageResponseMs: 0,
      responseTotalMs: 0,
    };
    const nextAnswered = current.answered + 1;
    const responseTotalMs = current.responseTotalMs + attempt.responseMs;

    breakdown[attempt.category] = {
      answered: nextAnswered,
      correct: current.correct + Number(attempt.isCorrect),
      incorrect: current.incorrect + Number(!attempt.isCorrect),
      timedOut: current.timedOut + Number(attempt.timedOut),
      score: current.score + attempt.awardedPoints,
      averageResponseMs: Math.round(responseTotalMs / nextAnswered),
      responseTotalMs,
    };

    return breakdown;
  }, {});

  const cleanedBreakdown = Object.fromEntries(
    Object.entries(categoryBreakdown).map(([category, performance]) => {
      return [
        category,
        {
          answered: performance.answered,
          correct: performance.correct,
          incorrect: performance.incorrect,
          timedOut: performance.timedOut,
          score: performance.score,
          averageResponseMs: performance.averageResponseMs,
        },
      ];
    }),
  ) as Partial<Record<CategoryId, CategoryPerformance>>;
  const xp = calculateSessionXp({
    attempts: state.attempts,
    mode: state.mode,
    completed: true,
  });

  return {
    runId: state.runId,
    mode: state.mode,
    endReason: state.endReason,
    score: state.score,
    answered,
    correct,
    incorrect: answered - correct,
    timedOut,
    accuracy: answered === 0 ? 0 : Math.round((correct / answered) * 100),
    averageResponseMs:
      answered === 0 ? 0 : Math.round(responseTotal / answered),
    fastestResponseMs:
      responseTimes.length === 0 ? null : Math.min(...responseTimes),
    slowestResponseMs:
      responseTimes.length === 0 ? null : Math.max(...responseTimes),
    longestCombo: state.longestCombo,
    livesRemaining: state.lives,
    xpEarned: xp.totalXp,
    categoryBreakdown: cleanedBreakdown,
  };
}

export function createGameRunSubmission(
  state: GameEngineState,
): GameRunSubmission | null {
  const summary = getGameSummary(state);

  if (!summary) return null;

  return {
    runId: state.runId,
    mode: state.mode,
    enabledCategories: state.enabledCategories,
    attempts: state.attempts,
    summary,
  };
}

export function serializeGameState(state: GameEngineState): string {
  return JSON.stringify(state);
}

export function deserializeGameState(value: string): GameEngineState | null {
  try {
    const result = gameEngineStateSchema.safeParse(JSON.parse(value));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
