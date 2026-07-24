import type { DifficultyTier } from '@/types/models';

/**
 * Scoring math — Plateau + Exponential Ease-In Decay.
 *
 * Pure, framework-free functions shared conceptually with the server-side `score_attempt`
 * (docs/database-schema.md §6.4). Both read the same config so displayed and recorded
 * scores agree. Model (docs/data-formats.md §6.2, project-plan.md §7):
 *
 *   t_p  = tier.plateauMs + category.gracePeriodMs      (effective plateau)
 *   M    = tier.maxPoints
 *   S(t) = M                                    if t <= t_p
 *   S(t) = max(0, round(M - alpha * (t - t_p)^beta))   if t > t_p  (seconds past t_p)
 *   S(t) = 0                                    if t > tier.timerMs (timed out)
 *   awarded = round(S(t) * comboMultiplier)
 */

/** Effective full-points window (ms): tier plateau plus the category grace period. */
export function effectivePlateauMs(tier: DifficultyTier, categoryGraceMs: number): number {
  return tier.plateauMs + categoryGraceMs;
}

/**
 * Obtainable points S(t) for a response at `responseTimeMs`, before any combo multiplier.
 * Returns an integer in [0, tier.maxPoints].
 */
export function computeObtainablePoints(
  responseTimeMs: number,
  tier: DifficultyTier,
  categoryGraceMs: number,
  decayExponentBeta: number,
): number {
  if (responseTimeMs > tier.timerMs) {
    return 0; // timed out
  }
  const plateau = effectivePlateauMs(tier, categoryGraceMs);
  if (responseTimeMs <= plateau) {
    return tier.maxPoints;
  }
  const secondsPastPlateau = (responseTimeMs - plateau) / 1000;
  const decayed = tier.maxPoints - tier.alpha * Math.pow(secondsPastPlateau, decayExponentBeta);
  return Math.max(0, Math.round(decayed));
}

/**
 * Combo multiplier for a 0-based combo index (number of consecutive correct answers so
 * far). Clamped to the last configured multiplier.
 */
export function comboMultiplier(comboIndex: number, multipliers: readonly number[]): number {
  if (multipliers.length === 0) {
    return 1;
  }
  const clamped = Math.min(Math.max(comboIndex, 0), multipliers.length - 1);
  return multipliers[clamped];
}

/** Final awarded points = round(S(t) * comboMultiplier). */
export function awardedPoints(
  responseTimeMs: number,
  tier: DifficultyTier,
  categoryGraceMs: number,
  decayExponentBeta: number,
  comboIndex: number,
  multipliers: readonly number[],
): number {
  const obtainable = computeObtainablePoints(
    responseTimeMs,
    tier,
    categoryGraceMs,
    decayExponentBeta,
  );
  return Math.round(obtainable * comboMultiplier(comboIndex, multipliers));
}
