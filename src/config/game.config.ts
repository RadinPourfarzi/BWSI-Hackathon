import type { ActiveGameConfig } from "@/shared/types/game.types";

/**
 * Local fallback and seed shape. In production, load the active version from
 * `game_config` through the database repository.
 */
export const DEFAULT_GAME_CONFIG: ActiveGameConfig = {
  game: {
    arcadeLives: 3,
    batchSize: 15,
    prefetchThreshold: 5,
  },
  scoring: {
    decayExponentBeta: 1.8,
    comboMultipliers: [1, 1.5, 2, 2.5, 3, 4, 5],
  },
  difficultyTiers: [
    { minQuestion: 1, maxPoints: 100, timerMs: 15_000, plateauMs: 1_500, alpha: 1.5 },
    { minQuestion: 6, maxPoints: 150, timerMs: 10_000, plateauMs: 1_000, alpha: 2.5 },
    { minQuestion: 16, maxPoints: 200, timerMs: 7_000, plateauMs: 500, alpha: 4 },
    { minQuestion: 31, maxPoints: 300, timerMs: 5_000, plateauMs: 200, alpha: 6 },
  ],
  xp: {
    baseXpPerCorrect: 10,
    comboBonusPerMaxCombo: 5,
    runCompletionBonus: 50,
    xpCurveBase: 100,
    xpCurveExp: 1.5,
  },
  categories: {
    image: {
      displayName: "AI Images",
      gracePeriodMs: 1_500,
      isActive: true,
      sortOrder: 1,
    },
    email: {
      displayName: "Scam Emails",
      gracePeriodMs: 2_000,
      isActive: true,
      sortOrder: 2,
    },
    audio: {
      displayName: "Voice Audio",
      gracePeriodMs: 5_000,
      isActive: true,
      sortOrder: 3,
    },
  },
};
