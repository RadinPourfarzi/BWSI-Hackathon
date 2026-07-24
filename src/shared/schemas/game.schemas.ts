import { z } from "zod";

export const categoryIdSchema = z.enum(["image", "email", "audio"]);
export const gameModeSchema = z.enum(["ARCADE", "TRAINING"]);
export const answerChoiceSchema = z.enum(["AI", "REAL"]);

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
