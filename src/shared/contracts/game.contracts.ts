import type {
  CategoryId,
  EndReason,
  GameMode,
  PlayerProfile,
  PublicQuestion,
  RoundRules,
  SessionStatus,
} from '@/shared/types/game.types';

export interface PublicGameState {
  sessionId: string;
  status: SessionStatus;
  mode: GameMode;
  enabledCategories: CategoryId[];
  configVersion: number;
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
  /** Omitted or empty means every active category, in configured order. */
  categories?: CategoryId[];
}

export interface StartGameResponse {
  state: PublicGameState;
  challenge: PublicQuestion;
  roundRules: RoundRules;
}

export interface GetGameSessionResponse {
  state: PublicGameState | null;
  challenge: PublicQuestion | null;
  roundRules: RoundRules | null;
  summary: GameSummary | null;
}

export interface SubmitAnswerRequest {
  sessionId: string;
  challengeId: string;
  selectedOptionId: string;
}

export type GameEvent =
  | { type: 'answer-correct'; pointsAwarded: number }
  | { type: 'answer-incorrect'; correctOptionId: string }
  | { type: 'answer-timeout'; correctOptionId: string }
  | { type: 'combo-increased'; combo: number }
  | { type: 'combo-reset' }
  | { type: 'life-lost'; livesRemaining: number }
  | { type: 'game-ended'; reason: EndReason }
  | { type: 'level-up'; newLevel: number };

export interface SubmitAnswerResponse {
  wasCorrect: boolean;
  timedOut: boolean;
  correctOptionId: string;
  basePoints: number;
  comboMultiplier: number;
  pointsAwarded: number;
  responseTimeMs: number;
  explanation: string | null;
  state: PublicGameState;
  events: GameEvent[];
  gameEnded: boolean;
  nextChallenge: PublicQuestion | null;
  nextRoundRules: RoundRules | null;
  summary: GameSummary | null;
}

export interface EndGameRequest {
  sessionId: string;
}

export interface GameSummaryCore {
  sessionId: string;
  mode: GameMode;
  endReason: EndReason;
  finalScore: number;
  xpEarned: number;
  correctCount: number;
  incorrectCount: number;
  questionsAnswered: number;
  highestCombo: number;
  averageResponseTimeMs: number;
  startedAt: string;
  endedAt: string;
}

export interface GameSummary extends GameSummaryCore {
  totalXp: number;
  level: number;
  leveledUp: boolean;
  currentStreak: number;
  newHighScore: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  highestScore: number;
  level: number;
}

export interface CategoryAnalytics {
  categoryId: CategoryId;
  attempts: number;
  correct: number;
  accuracyPercent: number;
  averageResponseTimeMs: number;
}

export interface AccuracyTrendPoint {
  date: string;
  accuracyPercent: number;
}

export interface PlayerAnalytics {
  attempts: number;
  correct: number;
  accuracyPercent: number;
  averageResponseTimeMs: number;
  averageArcadeScore: number;
  bestArcadeScore: number;
  longestCombo: number;
  leaderboardRank: number | null;
  strongestCategory: CategoryId | null;
  weakestCategory: CategoryId | null;
  byCategory: CategoryAnalytics[];
  accuracyTrend: AccuracyTrendPoint[];
}

export interface ProfileResponse {
  profile: PlayerProfile;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    issues?: unknown;
  };
}
