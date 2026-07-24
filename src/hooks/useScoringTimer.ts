import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { selectTier } from '@/lib/difficulty';
import { computeObtainablePoints } from '@/lib/scoring';
import type { DifficultyTier } from '@/types/models';

export interface ScoringTimerState {
  /** Time since the current question was shown (ms). */
  elapsedMs: number;
  /** Time left before the hard timeout (ms). */
  remainingMs: number;
  /** Points obtainable right now if answered correctly (before combo). */
  obtainablePoints: number;
  /** remainingMs / tier.timerMs, in [0, 1] — for the timer bar. */
  fraction: number;
  /** Active tier, or null when not running. */
  tier: DifficultyTier | null;
}

const IDLE: ScoringTimerState = {
  elapsedMs: 0,
  remainingMs: 0,
  obtainablePoints: 0,
  fraction: 0,
  tier: null,
};

/**
 * Live countdown + decaying obtainable-points value for the current question. Runs a
 * requestAnimationFrame loop locally (0ms latency); reads timing/config from the store.
 */
export function useScoringTimer(): ScoringTimerState {
  const status = useGameStore((s) => s.status);
  const questionStartedAt = useGameStore((s) => s.questionStartedAt);
  const questionIndex = useGameStore((s) => s.questionIndex);
  const current = useGameStore((s) => s.current);
  const config = useGameStore((s) => s.config);

  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (status !== 'running' || questionStartedAt === null) {
      return;
    }
    let raf = 0;
    const tick = () => {
      setNowMs(Date.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [status, questionStartedAt, questionIndex]);

  return useMemo(() => {
    if (status !== 'running' || questionStartedAt === null || current === null) {
      return IDLE;
    }
    const tier = selectTier(questionIndex, config.difficultyTiers);
    const graceMs = config.categories[current.categoryId]?.gracePeriodMs ?? 0;
    const elapsedMs = Math.max(0, nowMs - questionStartedAt);
    const remainingMs = Math.max(0, tier.timerMs - elapsedMs);
    const obtainablePoints = computeObtainablePoints(
      elapsedMs,
      tier,
      graceMs,
      config.scoring.decayExponentBeta,
    );
    const fraction = tier.timerMs > 0 ? remainingMs / tier.timerMs : 0;
    return { elapsedMs, remainingMs, obtainablePoints, fraction, tier };
  }, [status, questionStartedAt, questionIndex, current, config, nowMs]);
}
