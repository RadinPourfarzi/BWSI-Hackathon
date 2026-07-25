import type { DifficultyTier } from '@/types/models';

/**
 * Select the active difficulty tier for a 1-based question index.
 *
 * Returns the tier with the highest `minQuestion` that is <= `questionIndex`. Assumes
 * `tiers` is non-empty and sorted ascending by `minQuestion` (the config guarantees this;
 * we still guard by scanning defensively). Falls back to the first tier for indices below
 * the lowest threshold.
 */
export function selectTier(
  questionIndex: number,
  tiers: readonly DifficultyTier[],
): DifficultyTier {
  if (tiers.length === 0) {
    throw new Error('selectTier: no difficulty tiers configured');
  }
  let selected = tiers[0];
  for (const tier of tiers) {
    if (questionIndex >= tier.minQuestion && tier.minQuestion >= selected.minQuestion) {
      selected = tier;
    }
  }
  return selected;
}
