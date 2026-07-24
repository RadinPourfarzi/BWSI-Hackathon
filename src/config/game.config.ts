import type { ActiveGameConfig } from '@/shared/types/game.types';

/**
 * Local fallback and the seed contract for Supabase. Production sessions load
 * the active database version once and keep that immutable snapshot for the
 * entire run.
 */
export const DEFAULT_GAME_CONFIG: ActiveGameConfig = {
  version: 1,
  modes: {
    ARCADE: {
      startingLives: 3,
      scoringEnabled: true,
      comboEnabled: true,
      timeLimitEnabled: true,
      gameOverWhenLivesReachZero: true,
      detailedFeedbackEnabled: false,
    },
    TRAINING: {
      startingLives: null,
      scoringEnabled: false,
      comboEnabled: false,
      timeLimitEnabled: false,
      gameOverWhenLivesReachZero: false,
      detailedFeedbackEnabled: true,
    },
  },
  scoring: {
    decayExponentBeta: 1.8,
    comboMultipliers: [1, 1.5, 2, 2.5, 3, 4, 5],
    timerSlackMs: 750,
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
      displayName: 'AI Images',
      gracePeriodMs: 1_500,
      isActive: true,
      sortOrder: 1,
      rendererKind: 'image',
      answerOptions: [
        { id: 'ai', label: 'AI Generated' },
        { id: 'real', label: 'Real Photo' },
      ],
      aiOptionId: 'ai',
      nonAiOptionId: 'real',
    },
    email: {
      displayName: 'Scam Emails',
      gracePeriodMs: 2_000,
      isActive: true,
      sortOrder: 2,
      rendererKind: 'email',
      answerOptions: [
        { id: 'scam', label: 'Scam' },
        { id: 'legit', label: 'Legitimate' },
      ],
      aiOptionId: 'scam',
      nonAiOptionId: 'legit',
    },
    audio: {
      displayName: 'Voice Audio',
      gracePeriodMs: 5_000,
      isActive: true,
      sortOrder: 3,
      rendererKind: 'audio',
      answerOptions: [
        { id: 'ai', label: 'AI Voice' },
        { id: 'human', label: 'Human Voice' },
      ],
      aiOptionId: 'ai',
      nonAiOptionId: 'human',
    },
  },
};
