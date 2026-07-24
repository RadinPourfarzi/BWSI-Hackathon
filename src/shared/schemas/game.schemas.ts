import { z } from "zod";

export const categoryIdSchema = z.enum(["image", "email", "audio"]);
export const gameModeSchema = z.enum(["ARCADE", "TRAINING"]);
export const answerChoiceSchema = z.enum(["AI", "REAL"]);
export const difficultyRatingSchema = z.enum(["EASY", "MEDIUM", "HARD", "EXPERT"]);

export const questionMetadataSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("image"),
    altText: z.string().optional(),
    widthPx: z.number().int().positive().optional(),
    heightPx: z.number().int().positive().optional(),
    source: z.string().optional(),
  }),
  z.object({
    kind: z.literal("email"),
    subject: z.string(),
    senderName: z.string(),
    senderAddress: z.string(),
    receivedAt: z.string().optional(),
    bodyFormat: z.enum(["image", "html"]),
  }),
  z.object({
    kind: z.literal("audio"),
    durationMs: z.number().int().nonnegative(),
    transcript: z.string().optional(),
    mimeType: z.string().optional(),
  }),
]);

export const difficultyTierSchema = z.object({
  minQuestion: z.number().int().positive(),
  maxPoints: z.number().int().nonnegative(),
  timerMs: z.number().int().positive(),
  plateauMs: z.number().int().nonnegative(),
  alpha: z.number().nonnegative(),
});

const categoryConfigurationSchema = z.object({
  displayName: z.string(),
  gracePeriodMs: z.number().int().nonnegative(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
});

export const activeGameConfigSchema = z.object({
  game: z.object({
    arcadeLives: z.number().int().positive(),
    batchSize: z.number().int().positive(),
    prefetchThreshold: z.number().int().nonnegative(),
  }),
  scoring: z.object({
    decayExponentBeta: z.number().positive(),
    comboMultipliers: z.array(z.number().positive()).min(1),
  }),
  difficultyTiers: z.array(difficultyTierSchema).min(1),
  xp: z.object({
    baseXpPerCorrect: z.number().int().nonnegative(),
    comboBonusPerMaxCombo: z.number().int().nonnegative(),
    runCompletionBonus: z.number().int().nonnegative(),
    xpCurveBase: z.number().positive(),
    xpCurveExp: z.number().positive(),
  }),
  categories: z.record(categoryIdSchema, categoryConfigurationSchema),
});

export const questionRecordSchema = z
  .object({
    id: z.uuid(),
    categoryId: categoryIdSchema,
    mediaUrl: z.string().min(1),
    isAi: z.boolean(),
    difficultyRating: difficultyRatingSchema,
    explanationText: z.string().nullable(),
    metadata: questionMetadataSchema,
    isActive: z.boolean(),
  })
  .superRefine((question, context) => {
    if (question.categoryId !== question.metadata.kind) {
      context.addIssue({
        code: "custom",
        path: ["metadata", "kind"],
        message: "metadata.kind must match categoryId.",
      });
    }
  });

export const startGameSchema = z.object({
  mode: gameModeSchema,
  categories: z.array(categoryIdSchema).min(1).max(3),
});

export const submitAnswerSchema = z.object({
  sessionId: z.uuid(),
  challengeId: z.uuid(),
  selectedAnswer: answerChoiceSchema,
});

export const endGameSchema = z.object({
  sessionId: z.uuid(),
});

export const sessionIdSchema = z.uuid();
