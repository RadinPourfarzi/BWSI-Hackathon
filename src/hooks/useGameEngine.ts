import { useGameStore } from '@/store/gameStore';

/**
 * Thin facade over the Zustand game store: exposes current run state slices and bound
 * actions for UI components. All business logic lives in the store / lib pure functions;
 * components never compute scoring or lifecycle themselves.
 */
export function useGameEngine() {
  const mode = useGameStore((s) => s.mode);
  const status = useGameStore((s) => s.status);
  const current = useGameStore((s) => s.current);
  const questionIndex = useGameStore((s) => s.questionIndex);
  const score = useGameStore((s) => s.score);
  const lives = useGameStore((s) => s.lives);
  const combo = useGameStore((s) => s.combo);
  const maxCombo = useGameStore((s) => s.maxCombo);
  const attempts = useGameStore((s) => s.attempts);
  const lastOutcome = useGameStore((s) => s.lastOutcome);
  const remainingInQueue = useGameStore((s) => s.queue.length);

  const startRun = useGameStore((s) => s.startRun);
  const answer = useGameStore((s) => s.answer);
  const next = useGameStore((s) => s.next);
  const endRun = useGameStore((s) => s.endRun);
  const reset = useGameStore((s) => s.reset);

  return {
    mode,
    status,
    current,
    questionIndex,
    score,
    lives,
    combo,
    maxCombo,
    attempts,
    lastOutcome,
    remainingInQueue,
    startRun,
    answer,
    next,
    endRun,
    reset,
  };
}
