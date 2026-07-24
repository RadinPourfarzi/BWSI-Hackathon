import type { DifficultyTier } from '@/shared/types/game.types';

export interface BasePointsInput {
  responseTimeMs: number;
  tier: DifficultyTier;
  gracePeriodMs: number;
  beta: number;
  timerSlackMs: number;
}

export interface BasePointsResult {
  basePoints: number;
  timedOut: boolean;
}

export function effectivePlateauMs(
  tier: DifficultyTier,
  gracePeriodMs: number,
): number {
  return tier.plateauMs + gracePeriodMs;
}

/**
 * Plateau + exponential ease-in. The network allowance affects only timeout
 * classification; it never adds points or changes the decay curve.
 */
export function calculateBasePoints(input: BasePointsInput): BasePointsResult {
  const { responseTimeMs, tier, gracePeriodMs, beta, timerSlackMs } = input;
  if (responseTimeMs > tier.timerMs + timerSlackMs) {
    return { basePoints: 0, timedOut: true };
  }

  const plateau = effectivePlateauMs(tier, gracePeriodMs);
  if (responseTimeMs <= plateau) {
    return { basePoints: tier.maxPoints, timedOut: false };
  }

  const secondsPastPlateau = (responseTimeMs - plateau) / 1_000;
  const decayed = tier.maxPoints - tier.alpha * Math.pow(secondsPastPlateau, beta);
  return {
    basePoints: Math.max(0, Math.round(decayed)),
    timedOut: false,
  };
}
