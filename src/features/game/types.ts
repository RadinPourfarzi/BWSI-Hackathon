import type { z } from "zod";

import type { CategoryId } from "@/config/categories";
import type { GameMode } from "@/config/game";
import type {
  binaryChoiceSchema,
  challengeSchema,
  datasetManifestSchema,
} from "@/features/game/schemas";

export type BinaryChoice = z.infer<typeof binaryChoiceSchema>;
export type Challenge = z.infer<typeof challengeSchema>;
export type DatasetManifest = z.infer<typeof datasetManifestSchema>;

export type GameStatus =
  | "idle"
  | "loading"
  | "playing"
  | "feedback"
  | "paused"
  | "completed"
  | "error";

export type ActiveGameStatus = Extract<
  GameStatus,
  "loading" | "playing" | "feedback"
>;

export type GameEndReason =
  "lives_depleted" | "training_exit" | "challenge_pool_exhausted";

export type QuestionRules = {
  difficultyStepId: string;
  difficultyLabel: string;
  maximumPoints: number;
  plateauMs: number;
  timeLimitMs: number;
  decayAlpha: number;
  decayBeta: number;
};

export type AttemptResolution = {
  sequence: number;
  challengeId: string;
  category: CategoryId;
  selectedChoice: BinaryChoice | null;
  correctChoice: BinaryChoice;
  isCorrect: boolean;
  timedOut: boolean;
  responseMs: number;
  obtainablePoints: number;
  awardedPoints: number;
  comboBefore: number;
  comboAfter: number;
  comboMultiplier: number;
  livesBefore: number | null;
  livesAfter: number | null;
  questionNumber: number;
  difficultyStepId: string;
  maximumPoints: number;
  plateauMs: number;
  timeLimitMs: number;
  decayAlpha: number;
  decayBeta: number;
};

export type CategoryPerformance = {
  answered: number;
  correct: number;
  incorrect: number;
  timedOut: number;
  score: number;
  averageResponseMs: number;
};

export type GameSummary = {
  runId: string;
  mode: GameMode;
  endReason: GameEndReason;
  score: number;
  answered: number;
  correct: number;
  incorrect: number;
  timedOut: number;
  accuracy: number;
  averageResponseMs: number;
  fastestResponseMs: number | null;
  slowestResponseMs: number | null;
  longestCombo: number;
  livesRemaining: number | null;
  xpEarned: number;
  categoryBreakdown: Partial<Record<CategoryId, CategoryPerformance>>;
};

export type GameEngineState = {
  schemaVersion: 1;
  runId: string;
  mode: GameMode;
  enabledCategories: CategoryId[];
  status: GameStatus;
  pausedFromStatus: ActiveGameStatus | null;
  challengeQueue: Challenge[];
  currentChallenge: Challenge | null;
  seenChallengeIds: string[];
  cycleSeenChallengeIds: string[];
  cycleNumber: number;
  attempts: AttemptResolution[];
  score: number;
  combo: number;
  longestCombo: number;
  lives: number | null;
  questionNumber: number;
  questionStartedAtMs: number | null;
  questionElapsedBeforePauseMs: number;
  startedAtMs: number;
  endedAtMs: number | null;
  endReason: GameEndReason | null;
  errorMessage: string | null;
  shuffleSeed: number;
};

export type GameRunSubmission = {
  runId: string;
  mode: GameMode;
  enabledCategories: CategoryId[];
  attempts: AttemptResolution[];
  summary: GameSummary;
};

export type PersistedGameResult = {
  sessionId: string;
  score: number;
  xpEarned: number;
  currentStreak: number;
  isNewHighScore: boolean;
  duplicate: boolean;
};
