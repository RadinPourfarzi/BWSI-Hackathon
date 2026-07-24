import type { ScoringSettings } from '@/types/models';

/**
 * Default seed values + TS shape contract for `game_config.scoring`.
 *
 * Per-tier max points, plateau, and α live in `difficulty.ts`; per-category grace
 * periods live in `categories.ts` / the categories table. They are combined at scoring
 * time (see src/lib/scoring.ts). See docs/data-formats.md §6.2 and project-plan.md §7.
 */
export const SCORING_CONFIG = {
  /** Exponential acceleration factor (β). */
  decayExponentBeta: 1.8,
  /** Indexed by combo count (clamped to the last entry). */
  comboMultipliers: [1, 1.5, 2, 2.5, 3, 4, 5],
} as const satisfies ScoringSettings;
