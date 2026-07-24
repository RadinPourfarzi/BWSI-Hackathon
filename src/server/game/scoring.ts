import type { ActiveGameConfig, CategoryId } from "@/shared/types/game.types";
import { getDifficultyTier } from "@/server/game/difficulty";

export interface ScoreInput {
  isCorrect: boolean;
  responseTimeMs: number;
  questionNumber: number;
  categoryId: CategoryId;
  comboBeforeAnswer: number;
  config: ActiveGameConfig;
}

export interface ScoreResult {
  points: number;
  timedOut: boolean;
  obtainablePoints: number;
}

export function calculateScore(input: ScoreInput): ScoreResult {
  const tier = getDifficultyTier(input.questionNumber, input.config.difficultyTiers);
  const timedOut = input.responseTimeMs > tier.timerMs;

  if (!input.isCorrect || timedOut) {
    return { points: 0, timedOut, obtainablePoints: tier.maxPoints };
  }

  const categoryGrace = input.config.categories[input.categoryId].gracePeriodMs;
  const effectivePlateauMs = tier.plateauMs + categoryGrace;
  const secondsAfterPlateau = Math.max(
    0,
    (input.responseTimeMs - effectivePlateauMs) / 1_000,
  );
  const decayed = Math.max(
    0,
    Math.round(
      tier.maxPoints -
        tier.alpha *
          Math.pow(secondsAfterPlateau, input.config.scoring.decayExponentBeta),
    ),
  );
  const multiplierIndex = Math.min(
    Math.max(input.comboBeforeAnswer, 0),
    input.config.scoring.comboMultipliers.length - 1,
  );
  const multiplier = input.config.scoring.comboMultipliers[multiplierIndex] ?? 1;

  return {
    points: Math.max(0, Math.round(decayed * multiplier)),
    timedOut: false,
    obtainablePoints: tier.maxPoints,
  };
}
