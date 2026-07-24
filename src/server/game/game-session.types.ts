import type { GameSummary } from "@/shared/contracts/game.contracts";
import type {
  ActiveGameConfig,
  AnswerChoice,
  CategoryId,
  GameMode,
  QuestionRecord,
  SessionStatus,
} from "@/shared/types/game.types";

export interface ServerAttempt {
  questionId: string;
  categoryId: CategoryId;
  questionIndex: number;
  selectedAnswer: AnswerChoice;
  isCorrect: boolean;
  responseTimeMs: number;
  pointsAwarded: number;
  comboAtAnswer: number;
  answeredAt: string;
}

export interface ServerGameState {
  sessionId: string;
  userId: string;
  status: SessionStatus;
  mode: GameMode;
  enabledCategories: CategoryId[];
  config: ActiveGameConfig;
  score: number;
  lives: number | null;
  combo: number;
  highestCombo: number;
  questionNumber: number;
  correctAnswers: number;
  incorrectAnswers: number;
  currentChallenge: QuestionRecord | null;
  challengeStartedAtMs: number | null;
  shownChallengeIds: string[];
  attempts: ServerAttempt[];
  startedAtMs: number;
  endedAtMs: number | null;
  summary: GameSummary | null;
}
