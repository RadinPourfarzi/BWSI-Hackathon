import { describe, expect, it } from "vitest";
import { evaluateAnswer } from "@/server/game/answer-evaluator";
import type { QuestionRecord } from "@/shared/types/game.types";

const question: QuestionRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  categoryId: "image",
  mediaUrl: "image/test.webp",
  isAi: true,
  difficultyRating: "EASY",
  explanationText: null,
  metadata: { kind: "image" },
  isActive: true,
};

describe("evaluateAnswer", () => {
  it("accepts the correct choice", () => {
    expect(evaluateAnswer("AI", question)).toEqual({
      selectedAnswer: "AI",
      correctAnswer: "AI",
      wasCorrect: true,
    });
  });

  it("rejects the wrong choice", () => {
    expect(evaluateAnswer("REAL", question).wasCorrect).toBe(false);
  });
});
