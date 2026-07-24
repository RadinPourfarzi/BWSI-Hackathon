import type { PublicQuestion, QuestionRecord } from "@/shared/types/game.types";

export function toPublicQuestion(question: QuestionRecord): PublicQuestion {
  return {
    id: question.id,
    categoryId: question.categoryId,
    mediaUrl: question.mediaUrl,
    difficultyRating: question.difficultyRating,
    metadata: question.metadata,
    answerChoices: ["AI", "REAL"],
  };
}
