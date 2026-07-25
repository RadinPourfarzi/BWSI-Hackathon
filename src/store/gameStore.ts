import { create } from 'zustand';
import type {
  ActiveGameConfig,
  AttemptRecord,
  CategoryId,
  DifficultyTier,
  GameMode,
  GameStatus,
  Question,
} from '@/types/models';
import { DEFAULT_ACTIVE_CONFIG } from '@/config';
import { selectTier } from '@/lib/difficulty';
import { awardedPoints } from '@/lib/scoring';

/** Result of a single answer, surfaced for the UI feedback flash. */
export interface AnswerOutcome {
  isCorrect: boolean;
  pointsAwarded: number;
  /** The true answer for the question just answered. */
  correctIsAi: boolean;
  responseTimeMs: number;
  /** Consecutive-correct streak after this answer (0 if it was wrong). */
  comboAfter: number;
}

export interface StartRunOptions {
  mode: GameMode;
  pool: Question[];
  enabledCategories: CategoryId[];
  config?: ActiveGameConfig;
  /** Injectable clock for deterministic tests. */
  now?: number;
}

interface GameActions {
  startRun: (opts: StartRunOptions) => void;
  /** Register the player's choice; returns the outcome (or null if not answerable). */
  answer: (choiceIsAi: boolean, now?: number) => AnswerOutcome | null;
  /** Advance to the next question (or end the run if the queue is empty). */
  next: (now?: number) => void;
  /** Append newly fetched questions to the queue (background top-up); dedupes by id. */
  enqueue: (questions: Question[]) => void;
  endRun: () => void;
  reset: () => void;
  /** Active difficulty tier for the current question index. */
  currentTier: () => DifficultyTier;
  /** Grace period (ms) for the current question's category. */
  currentGraceMs: () => number;
}

export interface GameStore extends GameActions {
  mode: GameMode;
  config: ActiveGameConfig;
  enabledCategories: CategoryId[];
  queue: Question[];
  current: Question | null;
  questionIndex: number;
  score: number;
  lives: number;
  combo: number;
  maxCombo: number;
  attempts: AttemptRecord[];
  status: GameStatus;
  questionStartedAt: number | null;
  lastOutcome: AnswerOutcome | null;
  /** Ids of every question loaded into this run (current + queue + already shown). */
  loadedIds: string[];
}

/** Fisher–Yates shuffle (returns a new array; does not mutate input). */
function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const initialState = {
  mode: 'ARCADE' as GameMode,
  config: DEFAULT_ACTIVE_CONFIG,
  enabledCategories: [] as CategoryId[],
  queue: [] as Question[],
  current: null as Question | null,
  questionIndex: 0,
  score: 0,
  lives: 0,
  combo: 0,
  maxCombo: 0,
  attempts: [] as AttemptRecord[],
  status: 'idle' as GameStatus,
  questionStartedAt: null as number | null,
  lastOutcome: null as AnswerOutcome | null,
  loadedIds: [] as string[],
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  startRun: ({ mode, pool, enabledCategories, config, now }) => {
    const activeConfig = config ?? DEFAULT_ACTIVE_CONFIG;
    const filtered = pool.filter((q) => enabledCategories.includes(q.categoryId));
    const queue = shuffle(filtered);
    const current = queue.shift() ?? null;
    const loadedIds = [...(current ? [current.id] : []), ...queue.map((q) => q.id)];
    set({
      ...initialState,
      mode,
      config: activeConfig,
      enabledCategories,
      queue,
      current,
      questionIndex: current ? 1 : 0,
      lives: mode === 'ARCADE' ? activeConfig.game.arcadeLives : Number.POSITIVE_INFINITY,
      status: current ? 'running' : 'gameover',
      questionStartedAt: current ? (now ?? Date.now()) : null,
      loadedIds,
    });
  },

  answer: (choiceIsAi, now) => {
    const state = get();
    const { current, status, questionStartedAt } = state;
    if (status !== 'running' || current === null || questionStartedAt === null) {
      return null;
    }

    const at = now ?? Date.now();
    const responseTimeMs = Math.max(0, at - questionStartedAt);
    const tier = selectTier(state.questionIndex, state.config.difficultyTiers);
    const graceMs = state.config.categories[current.categoryId]?.gracePeriodMs ?? 0;
    const isCorrect = choiceIsAi === current.isAi;

    let { score, combo, maxCombo, lives } = state;
    let pointsAwarded = 0;

    if (isCorrect) {
      const streak = combo + 1; // 1-based streak this answer creates
      pointsAwarded = awardedPoints(
        responseTimeMs,
        tier,
        graceMs,
        state.config.scoring.decayExponentBeta,
        streak - 1, // 0-based multiplier index
        state.config.scoring.comboMultipliers,
      );
      // Training mode carries no competitive score.
      if (state.mode === 'ARCADE') {
        score += pointsAwarded;
      }
      combo = streak;
      maxCombo = Math.max(maxCombo, streak);
    } else {
      combo = 0;
      if (state.mode === 'ARCADE') {
        lives -= 1;
      }
    }

    const comboAtAnswer = isCorrect ? combo : 0; // 1-based streak (0 for wrong)
    const attempt: AttemptRecord = {
      questionId: current.id,
      categoryId: current.categoryId,
      questionIndex: state.questionIndex,
      isCorrect,
      responseTimeMs,
      comboAtAnswer,
      pointsAwarded,
    };
    const outcome: AnswerOutcome = {
      isCorrect,
      pointsAwarded,
      correctIsAi: current.isAi,
      responseTimeMs,
      comboAfter: combo,
    };

    set({
      score,
      combo,
      maxCombo,
      lives,
      attempts: [...state.attempts, attempt],
      lastOutcome: outcome,
    });
    return outcome;
  },

  next: (now) => {
    const state = get();
    if (state.status !== 'running') {
      return;
    }
    if (state.mode === 'ARCADE' && state.lives <= 0) {
      set({ status: 'gameover', current: null, questionStartedAt: null });
      return;
    }
    const queue = [...state.queue];
    const nextQuestion = queue.shift() ?? null;
    if (nextQuestion === null) {
      set({ status: 'gameover', current: null, questionStartedAt: null });
      return;
    }
    set({
      queue,
      current: nextQuestion,
      questionIndex: state.questionIndex + 1,
      questionStartedAt: now ?? Date.now(),
      lastOutcome: null,
    });
  },

  enqueue: (questions) => {
    const state = get();
    const known = new Set(state.loadedIds);
    const fresh = questions.filter((q) => !known.has(q.id));
    if (fresh.length === 0) {
      return;
    }
    set({
      queue: [...state.queue, ...fresh],
      loadedIds: [...state.loadedIds, ...fresh.map((q) => q.id)],
    });
  },

  endRun: () => set({ status: 'gameover', current: null, questionStartedAt: null }),

  reset: () => set({ ...initialState }),

  currentTier: () => selectTier(get().questionIndex, get().config.difficultyTiers),

  currentGraceMs: () => {
    const state = get();
    if (state.current === null) {
      return 0;
    }
    return state.config.categories[state.current.categoryId]?.gracePeriodMs ?? 0;
  },
}));
