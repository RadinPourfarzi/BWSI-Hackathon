/**
 * Domain + DB types for the AI Detection Game.
 *
 * Single source of truth for data shapes across the app. Mirrors the contracts in
 * `docs/data-formats.md` and the schema in `docs/database-schema.md`.
 *
 * Convention: DB columns are snake_case; everything in TS is camelCase. The snake_case
 * shapes live in the `*Row` interfaces and are converted in `src/lib/mappers.ts`.
 */

// ---------------------------------------------------------------------------
// Enumerations / vocabularies
// ---------------------------------------------------------------------------

/** Category slug. Widen as new categories are added. */
export type CategoryId = 'image' | 'email' | 'audio';

export type DifficultyRating = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';

export type GameMode = 'ARCADE' | 'TRAINING';

// ---------------------------------------------------------------------------
// Per-category metadata (discriminated union; `kind` equals the category id)
// ---------------------------------------------------------------------------

export interface ImageMetadata {
  kind: 'image';
  /** Accessibility alt text. */
  altText?: string;
  widthPx?: number;
  heightPx?: number;
  /** Provenance note; not shown mid-run. */
  source?: string;
}

export interface EmailMetadata {
  kind: 'email';
  subject: string;
  senderName: string;
  senderAddress: string;
  /** ISO 8601, display-only. */
  receivedAt?: string;
  /** 'image' => mediaUrl is a screenshot; 'html' => sanitized HTML body. */
  bodyFormat: 'image' | 'html';
}

export interface AudioMetadata {
  kind: 'audio';
  /** Clip length; combines with the category grace period. */
  durationMs: number;
  /** Training-mode hint / accessibility. */
  transcript?: string;
  /** e.g. 'audio/mpeg'. */
  mimeType?: string;
}

export type QuestionMetadata = ImageMetadata | EmailMetadata | AudioMetadata;

// ---------------------------------------------------------------------------
// Core domain entities (camelCase; mirror DB rows 1:1)
// ---------------------------------------------------------------------------

export interface Category {
  id: CategoryId;
  displayName: string;
  isActive: boolean;
  gracePeriodMs: number;
  sortOrder: number;
}

/** A single challenge as delivered to the client (includes the answer key). */
export interface Question {
  id: string;
  categoryId: CategoryId;
  /** Resolved public URL or storage-relative path. */
  mediaUrl: string;
  /** TRUE = AI/Scam/Synthetic, FALSE = Real. */
  isAi: boolean;
  difficultyRating: DifficultyRating;
  /** Shown in Training mode only. */
  explanationText: string | null;
  metadata: QuestionMetadata;
}

export interface Profile {
  id: string;
  username: string;
  totalXp: number;
  currentLevel: number;
  dailyStreak: number;
  /** ISO 8601. */
  lastPlayedAt: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Server-authoritative config (shape returned by get_active_config)
// ---------------------------------------------------------------------------

export interface DifficultyTier {
  /** Tier applies when questionIndex >= this. */
  minQuestion: number;
  /** Maximum obtainable points (M). */
  maxPoints: number;
  /** Hard cap; answering later scores 0. */
  timerMs: number;
  /** Base full-points window; category grace is added on top. */
  plateauMs: number;
  /** Decay severity (α) for this tier. */
  alpha: number;
}

export interface GameSettings {
  arcadeLives: number;
  batchSize: number;
  /** Refetch when unused questions fall below this. */
  prefetchThreshold: number;
}

export interface ScoringSettings {
  /** Exponential acceleration factor (β). */
  decayExponentBeta: number;
  /** Indexed by combo count (clamped to the last entry). */
  comboMultipliers: number[];
}

export interface XpSettings {
  baseXpPerCorrect: number;
  comboBonusPerMaxCombo: number;
  runCompletionBonus: number;
  /** Level curve: XP required for level N = xpCurveBase * N^xpCurveExp. */
  xpCurveBase: number;
  xpCurveExp: number;
}

export interface CategoryConfigEntry {
  displayName: string;
  gracePeriodMs: number;
  isActive: boolean;
  sortOrder: number;
}

/** Authoritative gameplay ruleset the client fetches once at run start. */
export interface ActiveGameConfig {
  game: GameSettings;
  scoring: ScoringSettings;
  difficultyTiers: DifficultyTier[];
  xp: XpSettings;
  /** Merged in by the RPC from the categories table. */
  categories: Record<CategoryId, CategoryConfigEntry>;
}

// ---------------------------------------------------------------------------
// Client <-> server payloads
// ---------------------------------------------------------------------------

export interface AttemptRecord {
  questionId: string;
  categoryId: CategoryId;
  /** Position in the run; selects the difficulty tier. */
  questionIndex: number;
  isCorrect: boolean;
  responseTimeMs: number;
  /** 1-based consecutive-correct streak this answer produced (0 if wrong). */
  comboAtAnswer: number;
  /** Optional; client display only — server recomputes. */
  pointsAwarded?: number;
}

/** Sent to submit_run. No score/XP fields — those are derived server-side. */
export interface RunSubmission {
  mode: GameMode;
  categoriesPlayed: CategoryId[];
  attempts: AttemptRecord[];
}

/** Authoritative result returned by submit_run. */
export interface RunResult {
  sessionId: string;
  finalScore: number;
  maxCombo: number;
  questionsAnswered: number;
  xpAwarded: number;
  totalXp: number;
  level: number;
  dailyStreak: number;
}

export interface QuestionBatchRequest {
  categories: CategoryId[];
  limit: number;
  excludeIds?: string[];
}

// ---------------------------------------------------------------------------
// In-memory game-engine state (never persisted mid-run)
// ---------------------------------------------------------------------------

export type GameStatus = 'idle' | 'running' | 'gameover';

export interface GameEngineState {
  mode: GameMode;
  /** Fetched once at run start; drives local timers/decay. */
  config: ActiveGameConfig;
  enabledCategories: CategoryId[];
  /** Prefetched, unshown. */
  queue: Question[];
  current: Question | null;
  /** Drives difficulty tier. */
  questionIndex: number;
  score: number;
  /** Arcade only. */
  lives: number;
  combo: number;
  maxCombo: number;
  /** Accumulates for final submission. */
  attempts: AttemptRecord[];
  status: GameStatus;
}

// ---------------------------------------------------------------------------
// Raw DB row shapes (snake_case) — converted via src/lib/mappers.ts
// ---------------------------------------------------------------------------

export interface CategoryRow {
  id: CategoryId;
  display_name: string;
  is_active: boolean;
  grace_period_ms: number;
  sort_order: number;
}

export interface QuestionRow {
  id: string;
  category_id: CategoryId;
  media_url: string;
  is_ai: boolean;
  difficulty_rating: DifficultyRating;
  explanation_text: string | null;
  metadata: QuestionMetadata;
}

export interface ProfileRow {
  id: string;
  username: string;
  total_xp: number;
  current_level: number;
  daily_streak: number;
  last_played_at: string | null;
  created_at: string;
}
