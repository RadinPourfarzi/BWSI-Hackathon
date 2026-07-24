import type { DifficultyTier } from '@/types/models';

/**
 * Default seed values + TS shape contract for `game_config.difficultyTiers`.
 *
 * Difficulty escalates purely through evolving game constraints keyed on the question
 * count within a run (not content filtering). The active tier is the one with the
 * highest `minQuestion` <= the current 1-based question index.
 *
 * See docs/data-formats.md §6.3 and project-plan.md §7.
 */
export const DIFFICULTY_TIERS = [
  { minQuestion: 1, maxPoints: 100, timerMs: 15000, plateauMs: 1500, alpha: 1.5 },
  { minQuestion: 6, maxPoints: 150, timerMs: 10000, plateauMs: 1000, alpha: 2.5 },
  { minQuestion: 16, maxPoints: 200, timerMs: 7000, plateauMs: 500, alpha: 4.0 },
  { minQuestion: 31, maxPoints: 300, timerMs: 5000, plateauMs: 200, alpha: 6.0 },
] as const satisfies readonly DifficultyTier[];
