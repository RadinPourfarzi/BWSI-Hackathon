import type { QuestionRecord } from '@/shared/types/game.types';

export interface AnswerEvaluation {
  selectedOptionId: string;
  correctOptionId: string;
  wasCorrect: boolean;
}

/** The browser sends an option ID; only the server compares it to the key. */
export function evaluateAnswer(
  selectedOptionId: string,
  question: QuestionRecord,
): AnswerEvaluation {
  return {
    selectedOptionId,
    correctOptionId: question.correctOptionId,
    wasCorrect: selectedOptionId === question.correctOptionId,
  };
}
