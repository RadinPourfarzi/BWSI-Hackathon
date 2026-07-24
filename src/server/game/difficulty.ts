import type { DifficultyTier } from '@/shared/types/game.types';

/**
 * Configuration validation guarantees sorted tiers beginning at question 1,
 * so selection is a small linear scan and never silently falls back.
 */
export function tierForQuestion(
  questionNumber: number,
  tiers: readonly DifficultyTier[],
): DifficultyTier {
  let selected = tiers[0];
  if (!selected) {
    throw new Error('At least one difficulty tier is required.');
  }

  for (const tier of tiers) {
    if (tier.minQuestion > questionNumber) {
      break;
    }
    selected = tier;
  }
  return selected;
}
