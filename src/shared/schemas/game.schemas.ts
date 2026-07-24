import { z } from 'zod';

export const categoryIdSchema = z.enum(['image', 'email', 'audio']);
export const gameModeSchema = z.enum(['ARCADE', 'TRAINING']);
export const difficultyRatingSchema = z.enum(['EASY', 'MEDIUM', 'HARD', 'EXPERT']);
export const sessionIdSchema = z.uuid();

const answerOptionSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(100),
});

const challengeContentSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('image'),
    mediaPath: z.string().min(1),
    alt: z.string().max(500).optional(),
  }),
  z.object({
    kind: z.literal('email'),
    senderName: z.string().max(200),
    senderAddress: z.string().max(320),
    subject: z.string().max(500),
    body: z.string().max(50_000),
    receivedAt: z.iso.datetime().optional(),
    mediaPath: z.string().min(1).optional(),
  }),
  z.object({
    kind: z.literal('audio'),
    mediaPath: z.string().min(1),
    durationSeconds: z.number().nonnegative().optional(),
    transcript: z.string().max(50_000).optional(),
  }),
]);

export const questionRecordSchema = z
  .object({
    id: z.uuid(),
    categoryId: categoryIdSchema,
    content: challengeContentSchema,
    options: z.array(answerOptionSchema).min(2),
    correctOptionId: z.string().min(1).max(64),
    difficulty: difficultyRatingSchema,
    explanation: z.string().nullable(),
    active: z.boolean(),
  })
  .superRefine((question, context) => {
    if (question.content.kind !== question.categoryId) {
      context.addIssue({
        code: 'custom',
        path: ['content', 'kind'],
        message: 'content.kind must match categoryId.',
      });
    }
    if (!question.options.some((option) => option.id === question.correctOptionId)) {
      context.addIssue({
        code: 'custom',
        path: ['correctOptionId'],
        message: 'correctOptionId must reference one of the question options.',
      });
    }
  });

const modeRulesSchema = z.object({
  startingLives: z.number().int().positive().nullable(),
  scoringEnabled: z.boolean(),
  comboEnabled: z.boolean(),
  timeLimitEnabled: z.boolean(),
  gameOverWhenLivesReachZero: z.boolean(),
  detailedFeedbackEnabled: z.boolean(),
});

const categoryConfigurationSchema = z
  .object({
    displayName: z.string().min(1),
    gracePeriodMs: z.number().int().nonnegative(),
    isActive: z.boolean(),
    sortOrder: z.number().int(),
    rendererKind: categoryIdSchema,
    answerOptions: z.array(answerOptionSchema).min(2),
    aiOptionId: z.string().min(1).max(64),
    nonAiOptionId: z.string().min(1).max(64),
  })
  .superRefine((category, context) => {
    const optionIds = new Set(category.answerOptions.map((option) => option.id));
    if (!optionIds.has(category.aiOptionId)) {
      context.addIssue({
        code: 'custom',
        path: ['aiOptionId'],
        message: 'aiOptionId must reference an answer option.',
      });
    }
    if (!optionIds.has(category.nonAiOptionId)) {
      context.addIssue({
        code: 'custom',
        path: ['nonAiOptionId'],
        message: 'nonAiOptionId must reference an answer option.',
      });
    }
    if (category.aiOptionId === category.nonAiOptionId) {
      context.addIssue({
        code: 'custom',
        path: ['nonAiOptionId'],
        message: 'AI and non-AI option IDs must differ.',
      });
    }
  });

const difficultyTierSchema = z.object({
  minQuestion: z.number().int().positive(),
  maxPoints: z.number().int().nonnegative(),
  timerMs: z.number().int().positive(),
  plateauMs: z.number().int().nonnegative(),
  alpha: z.number().nonnegative(),
});

export const activeGameConfigSchema = z
  .object({
    version: z.number().int().positive(),
    modes: z.object({
      ARCADE: modeRulesSchema,
      TRAINING: modeRulesSchema,
    }),
    scoring: z.object({
      decayExponentBeta: z.number().positive(),
      comboMultipliers: z.array(z.number().positive()).min(1),
      timerSlackMs: z.number().int().nonnegative(),
    }),
    difficultyTiers: z.array(difficultyTierSchema).min(1),
    xp: z.object({
      baseXpPerCorrect: z.number().int().nonnegative(),
      comboBonusPerMaxCombo: z.number().int().nonnegative(),
      runCompletionBonus: z.number().int().nonnegative(),
      xpCurveBase: z.number().positive(),
      xpCurveExp: z.number().positive(),
    }),
    categories: z.object({
      image: categoryConfigurationSchema,
      email: categoryConfigurationSchema,
      audio: categoryConfigurationSchema,
    }),
  })
  .superRefine((config, context) => {
    const tiers = config.difficultyTiers;
    if (tiers[0]?.minQuestion !== 1) {
      context.addIssue({
        code: 'custom',
        path: ['difficultyTiers', 0, 'minQuestion'],
        message: 'The first difficulty tier must start at question 1.',
      });
    }
    for (let index = 1; index < tiers.length; index += 1) {
      if (tiers[index]!.minQuestion <= tiers[index - 1]!.minQuestion) {
        context.addIssue({
          code: 'custom',
          path: ['difficultyTiers', index, 'minQuestion'],
          message: 'Difficulty tiers must be strictly increasing.',
        });
      }
    }
    for (const categoryId of categoryIdSchema.options) {
      if (config.categories[categoryId].rendererKind !== categoryId) {
        context.addIssue({
          code: 'custom',
          path: ['categories', categoryId, 'rendererKind'],
          message: 'rendererKind must match the category key.',
        });
      }
    }
  });

export const startGameSchema = z.object({
  mode: gameModeSchema,
  categories: z.array(categoryIdSchema).max(3).optional(),
});

export const submitAnswerSchema = z.object({
  sessionId: sessionIdSchema,
  challengeId: z.uuid(),
  selectedOptionId: z.string().min(1).max(64),
});

export const endGameSchema = z.object({
  sessionId: sessionIdSchema,
});

export const leaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
