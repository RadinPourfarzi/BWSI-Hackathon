/**
 * Domain types shared by the API and its consumers.
 *
 * `QuestionRecord` is deliberately server-only even though it lives beside
 * the shared public types: it contains `correctOptionId`. Client code must
 * import `PublicQuestion`, never `QuestionRecord`.
 */
export type CategoryId = 'image' | 'email' | 'audio';
export type DifficultyRating = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
export type GameMode = 'ARCADE' | 'TRAINING';
export type SessionStatus = 'active' | 'completed' | 'abandoned';
export type EndReason = 'lives-depleted' | 'pool-exhausted' | 'abandoned';

export interface AnswerOption {
  id: string;
  label: string;
}

export type ChallengeContent =
  | {
      kind: 'image';
      mediaPath: string;
      alt?: string;
    }
  | {
      kind: 'email';
      senderName: string;
      senderAddress: string;
      subject: string;
      body: string;
      receivedAt?: string;
      mediaPath?: string;
    }
  | {
      kind: 'audio';
      mediaPath: string;
      durationSeconds?: number;
      transcript?: string;
    };

/** Private server/database representation. Never serialize it directly. */
export interface QuestionRecord {
  id: string;
  categoryId: CategoryId;
  content: ChallengeContent;
  options: AnswerOption[];
  correctOptionId: string;
  difficulty: DifficultyRating;
  explanation: string | null;
  active: boolean;
}

/** Public representation. It intentionally omits the answer and explanation. */
export interface PublicQuestion {
  id: string;
  categoryId: CategoryId;
  content: ChallengeContent;
  options: AnswerOption[];
  displayedDifficulty: DifficultyRating;
}

export interface ModeRules {
  startingLives: number | null;
  scoringEnabled: boolean;
  comboEnabled: boolean;
  timeLimitEnabled: boolean;
  gameOverWhenLivesReachZero: boolean;
  detailedFeedbackEnabled: boolean;
}

export interface CategoryConfiguration {
  displayName: string;
  gracePeriodMs: number;
  isActive: boolean;
  sortOrder: number;
  rendererKind: ChallengeContent['kind'];
  answerOptions: AnswerOption[];
  aiOptionId: string;
  nonAiOptionId: string;
}

export interface DifficultyTier {
  minQuestion: number;
  maxPoints: number;
  timerMs: number;
  plateauMs: number;
  alpha: number;
}

export interface ActiveGameConfig {
  version: number;
  modes: Record<GameMode, ModeRules>;
  scoring: {
    decayExponentBeta: number;
    comboMultipliers: number[];
    timerSlackMs: number;
  };
  difficultyTiers: DifficultyTier[];
  xp: {
    baseXpPerCorrect: number;
    comboBonusPerMaxCombo: number;
    runCompletionBonus: number;
    xpCurveBase: number;
    xpCurveExp: number;
  };
  categories: Record<CategoryId, CategoryConfiguration>;
}

export interface RoundRules {
  questionNumber: number;
  maxPoints: number;
  timerMs: number | null;
  effectivePlateauMs: number;
  comboMultiplier: number;
}

export interface PlayerProfile {
  userId: string;
  displayName: string;
  totalXp: number;
  level: number;
  highestScore: number;
  longestCombo: number;
  currentStreak: number;
  longestStreak: number;
  lastPlayedAt: string | null;
  gamesPlayed: number;
  arcadeGamesPlayed: number;
  trainingGamesPlayed: number;
  createdAt: string;
}
