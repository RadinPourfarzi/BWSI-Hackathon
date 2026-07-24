export type CategoryId = "image" | "email" | "audio";
export type DifficultyRating = "EASY" | "MEDIUM" | "HARD" | "EXPERT";
export type GameMode = "ARCADE" | "TRAINING";
export type AnswerChoice = "AI" | "REAL";
export type SessionStatus = "active" | "completed" | "abandoned";

export interface ImageMetadata {
  kind: "image";
  altText?: string;
  widthPx?: number;
  heightPx?: number;
  source?: string;
}

export interface EmailMetadata {
  kind: "email";
  subject: string;
  senderName: string;
  senderAddress: string;
  receivedAt?: string;
  bodyFormat: "image" | "html";
}

export interface AudioMetadata {
  kind: "audio";
  durationMs: number;
  transcript?: string;
  mimeType?: string;
}

export type QuestionMetadata = ImageMetadata | EmailMetadata | AudioMetadata;

/** Private server/database representation. Never serialize this type to the browser. */
export interface QuestionRecord {
  id: string;
  categoryId: CategoryId;
  mediaUrl: string;
  isAi: boolean;
  difficultyRating: DifficultyRating;
  explanationText: string | null;
  metadata: QuestionMetadata;
  isActive: boolean;
}

/** Public representation intentionally omits the answer key (`isAi`). */
export interface PublicQuestion {
  id: string;
  categoryId: CategoryId;
  mediaUrl: string;
  difficultyRating: DifficultyRating;
  metadata: QuestionMetadata;
  answerChoices: readonly AnswerChoice[];
}

export interface CategoryConfiguration {
  displayName: string;
  gracePeriodMs: number;
  isActive: boolean;
  sortOrder: number;
}

export interface DifficultyTier {
  minQuestion: number;
  maxPoints: number;
  timerMs: number;
  plateauMs: number;
  alpha: number;
}

export interface ActiveGameConfig {
  game: {
    arcadeLives: number;
    batchSize: number;
    prefetchThreshold: number;
  };
  scoring: {
    decayExponentBeta: number;
    comboMultipliers: number[];
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

export interface Profile {
  id: string;
  username: string;
  totalXp: number;
  currentLevel: number;
  dailyStreak: number;
  lastPlayedAt: string | null;
  createdAt: string;
}
