import type { DifficultyTier } from "@/shared/types/game.types";

export function getDifficultyTier(
  questionNumber: number,
  tiers: readonly DifficultyTier[],
): DifficultyTier {
  const sorted = [...tiers].sort((left, right) => left.minQuestion - right.minQuestion);
  const selected = sorted.filter((tier) => tier.minQuestion <= questionNumber).at(-1);

  if (!selected) {
    throw new Error(`No difficulty tier applies to question ${questionNumber}.`);
  }

  return selected;
}
