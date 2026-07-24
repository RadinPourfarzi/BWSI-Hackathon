import type {
  ActiveGameConfig,
  AnswerChoice,
  CategoryId,
  GameMode,
  PublicQuestion,
} from "@/shared/types/game.types";

export interface PublicGameState {
  sessionId: string;
  status: "active" | "completed" | "abandoned";
  mode: GameMode;
  enabledCategories: CategoryId[];
  score: number;
  lives: number | null;
  combo: number;
  highestCombo: number;
  questionNumber: number;
  correctAnswers: number;
  incorrectAnswers: number;
}

export interface StartGameRequest {
  mode: GameMode;
  categories: CategoryId[];
}

export interface StartGameResponse {
  state: PublicGameState;
  config: ActiveGameConfig;
  challenge: PublicQuestion;
}

export interface SubmitAnswerRequest {
  sessionId: string;
  challengeId: string;
  selectedAnswer: AnswerChoice;
}

export type GameEvent =
  | { type: "answer-correct"; pointsAwarded: number }
  | { type: "answer-incorrect"; correctAnswer: AnswerChoice }
  | { type: "combo-increased"; combo: number }
  | { type: "combo-reset" }
  | { type: "life-lost"; livesRemaining: number }
  | { type: "game-ended" }
  | { type: "level-up"; newLevel: number };

export interface SubmitAnswerResponse {
  wasCorrect: boolean;
  correctAnswer: AnswerChoice;
  explanation?: string;
  awardedPoints: number;
  responseTimeMs: number;
  state: PublicGameState;
  events: GameEvent[];
  nextChallenge?: PublicQuestion;
  summary?: GameSummary;
}

export interface EndGameRequest {
  sessionId: string;
}

export interface GameSummary {
  sessionId: string;
  mode: GameMode;
  finalScore: number;
  xpAwarded: number;
  correctAnswers: number;
  incorrectAnswers: number;
  questionsAnswered: number;
  highestCombo: number;
  startedAt: string;
  endedAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  rank: number;
}

export interface PlayerAnalytics {
  attempts: number;
  correct: number;
  accuracyPercent: number;
  averageResponseTimeMs: number;
}
