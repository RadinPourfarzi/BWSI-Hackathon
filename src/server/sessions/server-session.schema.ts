import { z } from 'zod';
import {
  activeGameConfigSchema,
  categoryIdSchema,
  gameModeSchema,
  questionRecordSchema,
} from '@/shared/schemas/game.schemas';

const attemptSchema = z.object({
  id: z.uuid(),
  questionId: z.uuid(),
  categoryId: categoryIdSchema,
  questionNumber: z.number().int().positive(),
  selectedOptionId: z.string().min(1).max(64),
  wasCorrect: z.boolean(),
  timedOut: z.boolean(),
  responseTimeMs: z.number().int().nonnegative(),
  basePoints: z.number().int().nonnegative(),
  comboMultiplier: z.number().positive(),
  comboBeforeAnswer: z.number().int().nonnegative(),
  pointsAwarded: z.number().int().nonnegative(),
  answeredAt: z.iso.datetime(),
});

const summaryCoreSchema = z.object({
  sessionId: z.uuid(),
  mode: gameModeSchema,
  endReason: z.enum(['lives-depleted', 'pool-exhausted', 'abandoned']),
  finalScore: z.number().int().nonnegative(),
  xpEarned: z.number().int().nonnegative(),
  correctCount: z.number().int().nonnegative(),
  incorrectCount: z.number().int().nonnegative(),
  questionsAnswered: z.number().int().nonnegative(),
  highestCombo: z.number().int().nonnegative(),
  averageResponseTimeMs: z.number().int().nonnegative(),
  startedAt: z.iso.datetime(),
  endedAt: z.iso.datetime(),
});

export const serverGameStateSchema = z.object({
  version: z.number().int().nonnegative(),
  sessionId: z.uuid(),
  userId: z.uuid(),
  status: z.enum(['active', 'completed', 'abandoned']),
  mode: gameModeSchema,
  enabledCategories: z.array(categoryIdSchema).min(1),
  config: activeGameConfigSchema,
  score: z.number().int().nonnegative(),
  lives: z.number().int().nonnegative().nullable(),
  combo: z.number().int().nonnegative(),
  highestCombo: z.number().int().nonnegative(),
  questionNumber: z.number().int().positive(),
  correctAnswers: z.number().int().nonnegative(),
  incorrectAnswers: z.number().int().nonnegative(),
  currentQuestion: questionRecordSchema.nullable(),
  challengeStartedAtMs: z.number().int().nonnegative().nullable(),
  shownChallengeIds: z.array(z.uuid()),
  attempts: z.array(attemptSchema),
  startedAtMs: z.number().int().nonnegative(),
  completion: summaryCoreSchema.nullable(),
});
