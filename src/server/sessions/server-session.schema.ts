import { z } from "zod";
import {
  activeGameConfigSchema,
  answerChoiceSchema,
  categoryIdSchema,
  gameModeSchema,
  questionRecordSchema,
} from "@/shared/schemas/game.schemas";

const attemptSchema = z.object({
  questionId: z.uuid(),
  categoryId: categoryIdSchema,
  questionIndex: z.number().int().positive(),
  selectedAnswer: answerChoiceSchema,
  isCorrect: z.boolean(),
  responseTimeMs: z.number().int().nonnegative(),
  pointsAwarded: z.number().int().nonnegative(),
  comboAtAnswer: z.number().int().nonnegative(),
  answeredAt: z.iso.datetime(),
});

const summarySchema = z.object({
  sessionId: z.uuid(),
  mode: gameModeSchema,
  finalScore: z.number().int().nonnegative(),
  xpAwarded: z.number().int().nonnegative(),
  correctAnswers: z.number().int().nonnegative(),
  incorrectAnswers: z.number().int().nonnegative(),
  questionsAnswered: z.number().int().nonnegative(),
  highestCombo: z.number().int().nonnegative(),
  startedAt: z.iso.datetime(),
  endedAt: z.iso.datetime(),
});

export const serverGameStateSchema = z.object({
  version: z.number().int().nonnegative(),
  sessionId: z.uuid(),
  userId: z.uuid(),
  status: z.enum(["active", "completed", "abandoned"]),
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
  currentChallenge: questionRecordSchema.nullable(),
  challengeStartedAtMs: z.number().int().nonnegative().nullable(),
  shownChallengeIds: z.array(z.uuid()),
  attempts: z.array(attemptSchema),
  startedAtMs: z.number().int().nonnegative(),
  endedAtMs: z.number().int().nonnegative().nullable(),
  summary: summarySchema.nullable(),
});
