import type { AnswerChoice, QuestionRecord } from "@/shared/types/game.types";

export interface AnswerEvaluation {
  selectedAnswer: AnswerChoice;
  correctAnswer: AnswerChoice;
  wasCorrect: boolean;
}

export function evaluateAnswer(
  selectedAnswer: AnswerChoice,
  question: QuestionRecord,
): AnswerEvaluation {
  const correctAnswer: AnswerChoice = question.isAi ? "AI" : "REAL";
  return {
    selectedAnswer,
    correctAnswer,
    wasCorrect: selectedAnswer === correctAnswer,
  };
}
