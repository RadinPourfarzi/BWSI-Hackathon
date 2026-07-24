import type { GameSummaryCore } from '@/shared/contracts/game.contracts';
import type {
  ActiveGameConfig,
  CategoryId,
  GameMode,
  QuestionRecord,
  SessionStatus,
} from '@/shared/types/game.types';

export interface ServerAttempt {
  id: string;
  questionId: string;
  categoryId: CategoryId;
  questionNumber: number;
  selectedOptionId: string;
  wasCorrect: boolean;
  timedOut: boolean;
  responseTimeMs: number;
  basePoints: number;
  comboMultiplier: number;
  comboBeforeAnswer: number;
  pointsAwarded: number;
  answeredAt: string;
}

export interface ServerGameState {
  version: number;
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
  currentQuestion: QuestionRecord | null;
  challengeStartedAtMs: number | null;
  shownChallengeIds: string[];
  attempts: ServerAttempt[];
  startedAtMs: number;
  completion: GameSummaryCore | null;
}
