import type { GameEvent } from '@/shared/contracts/game.contracts';
import type {
  ActiveGameConfig,
  GameMode,
  QuestionRecord,
  RoundRules,
} from '@/shared/types/game.types';
import { evaluateAnswer } from '@/server/game/answer-evaluator';
import { multiplierForCombo, nextCombo } from '@/server/game/combo';
import { tierForQuestion } from '@/server/game/difficulty';
import { updateLives } from '@/server/game/lives';
import { calculateBasePoints, effectivePlateauMs } from '@/server/game/scoring';

export interface ResolveAnswerInput {
  mode: GameMode;
  questionNumber: number;
  scoreBeforeAnswer: number;
  comboBeforeAnswer: number;
  highestComboBeforeAnswer: number;
  livesBeforeAnswer: number | null;
  selectedOptionId: string;
  responseTimeMs: number;
  question: QuestionRecord;
  config: ActiveGameConfig;
}

export interface ResolveAnswerResult {
  wasCorrect: boolean;
  actuallyCorrect: boolean;
  timedOut: boolean;
  correctOptionId: string;
  basePoints: number;
  comboMultiplier: number;
  pointsAwarded: number;
  scoreAfterAnswer: number;
  comboAfterAnswer: number;
  highestComboAfterAnswer: number;
  livesAfterAnswer: number | null;
  gameEnded: boolean;
  events: GameEvent[];
}

export class GameRuleEngine {
  resolveAnswer(input: ResolveAnswerInput): ResolveAnswerResult {
    const modeRules = input.config.modes[input.mode];
    const evaluation = evaluateAnswer(input.selectedOptionId, input.question);
    const tier = tierForQuestion(input.questionNumber, input.config.difficultyTiers);
    const category = input.config.categories[input.question.categoryId];

    let timedOut = false;
    let rawBasePoints = 0;
    if (modeRules.timeLimitEnabled) {
      const scored = calculateBasePoints({
        responseTimeMs: input.responseTimeMs,
        tier,
        gracePeriodMs: category.gracePeriodMs,
        beta: input.config.scoring.decayExponentBeta,
        timerSlackMs: input.config.scoring.timerSlackMs,
      });
      timedOut = scored.timedOut;
      rawBasePoints = scored.basePoints;
    }

    const wasCorrect = evaluation.wasCorrect && !timedOut;
    const comboMultiplier = modeRules.comboEnabled
      ? multiplierForCombo(
          input.comboBeforeAnswer,
          input.config.scoring.comboMultipliers,
        )
      : 1;
    const basePoints = wasCorrect && modeRules.scoringEnabled ? rawBasePoints : 0;
    const pointsAwarded = Math.round(basePoints * comboMultiplier);
    const comboAfterAnswer = modeRules.comboEnabled
      ? nextCombo(input.comboBeforeAnswer, wasCorrect)
      : 0;
    const highestComboAfterAnswer = Math.max(
      input.highestComboBeforeAnswer,
      comboAfterAnswer,
    );
    const livesAfterAnswer =
      modeRules.startingLives === null
        ? null
        : updateLives(wasCorrect, input.livesBeforeAnswer);
    const gameEnded =
      modeRules.gameOverWhenLivesReachZero &&
      livesAfterAnswer !== null &&
      livesAfterAnswer === 0;

    return {
      wasCorrect,
      actuallyCorrect: evaluation.wasCorrect,
      timedOut,
      correctOptionId: evaluation.correctOptionId,
      basePoints,
      comboMultiplier,
      pointsAwarded,
      scoreAfterAnswer: input.scoreBeforeAnswer + pointsAwarded,
      comboAfterAnswer,
      highestComboAfterAnswer,
      livesAfterAnswer,
      gameEnded,
      events: buildEvents(input, {
        wasCorrect,
        timedOut,
        correctOptionId: evaluation.correctOptionId,
        pointsAwarded,
        comboAfterAnswer,
        livesAfterAnswer,
        gameEnded,
      }),
    };
  }

  roundRulesFor(
    questionNumber: number,
    categoryId: QuestionRecord['categoryId'],
    mode: GameMode,
    comboBeforeAnswer: number,
    config: ActiveGameConfig,
  ): RoundRules {
    const modeRules = config.modes[mode];
    const tier = tierForQuestion(questionNumber, config.difficultyTiers);
    return {
      questionNumber,
      maxPoints: modeRules.scoringEnabled ? tier.maxPoints : 0,
      timerMs: modeRules.timeLimitEnabled ? tier.timerMs : null,
      effectivePlateauMs: effectivePlateauMs(
        tier,
        config.categories[categoryId].gracePeriodMs,
      ),
      comboMultiplier: modeRules.comboEnabled
        ? multiplierForCombo(comboBeforeAnswer, config.scoring.comboMultipliers)
        : 1,
    };
  }
}

function buildEvents(
  input: ResolveAnswerInput,
  result: {
    wasCorrect: boolean;
    timedOut: boolean;
    correctOptionId: string;
    pointsAwarded: number;
    comboAfterAnswer: number;
    livesAfterAnswer: number | null;
    gameEnded: boolean;
  },
): GameEvent[] {
  const modeRules = input.config.modes[input.mode];
  const events: GameEvent[] = [];

  if (result.timedOut) {
    events.push({
      type: 'answer-timeout',
      correctOptionId: result.correctOptionId,
    });
  } else if (result.wasCorrect) {
    events.push({
      type: 'answer-correct',
      pointsAwarded: result.pointsAwarded,
    });
  } else {
    events.push({
      type: 'answer-incorrect',
      correctOptionId: result.correctOptionId,
    });
  }

  if (modeRules.comboEnabled) {
    if (result.wasCorrect) {
      events.push({
        type: 'combo-increased',
        combo: result.comboAfterAnswer,
      });
    } else if (input.comboBeforeAnswer > 0) {
      events.push({ type: 'combo-reset' });
    }
  }

  if (
    result.livesAfterAnswer !== null &&
    result.livesAfterAnswer !== input.livesBeforeAnswer
  ) {
    events.push({
      type: 'life-lost',
      livesRemaining: result.livesAfterAnswer,
    });
  }
  if (result.gameEnded) {
    events.push({
      type: 'game-ended',
      reason: 'lives-depleted',
    });
  }
  return events;
}
