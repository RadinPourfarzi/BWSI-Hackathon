import type { PublicQuestion, QuestionRecord } from '@/shared/types/game.types';

/** The only conversion from a private question to its HTTP-safe shape. */
export function toPublicQuestion(question: QuestionRecord): PublicQuestion {
  return {
    id: question.id,
    categoryId: question.categoryId,
    content: structuredClone(question.content),
    options: question.options.map((option) => ({ ...option })),
    displayedDifficulty: question.difficulty,
  };
}
