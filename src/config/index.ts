import type { ActiveGameConfig, CategoryConfigEntry, CategoryId } from '@/types/models';
import { GAME_CONFIG } from './game';
import { SCORING_CONFIG } from './scoring';
import { DIFFICULTY_TIERS } from './difficulty';
import { XP_CONFIG } from './xp';
import { CATEGORY_CONFIG } from './categories';

export { GAME_CONFIG, GAME_DEFAULTS } from './game';
export { SCORING_CONFIG } from './scoring';
export { DIFFICULTY_TIERS } from './difficulty';
export { XP_CONFIG } from './xp';
export { CATEGORY_CONFIG, CATEGORY_IDS } from './categories';
export { UI_CONFIG } from './ui';
export type { UiColorKey } from './ui';
export { feedbackMessage, CORRECT_TIERS, WRONG_MESSAGES } from './messages';

function buildCategoryEntries(): Record<CategoryId, CategoryConfigEntry> {
  const entries = {} as Record<CategoryId, CategoryConfigEntry>;
  for (const id of Object.keys(CATEGORY_CONFIG) as CategoryId[]) {
    const c = CATEGORY_CONFIG[id];
    entries[id] = {
      displayName: c.displayName,
      gracePeriodMs: c.gracePeriodMs,
      isActive: true,
      sortOrder: c.sortOrder,
    };
  }
  return entries;
}

/**
 * The default gameplay config assembled from the `/config` seed values. Shape-identical
 * to what `get_active_config()` returns, so it can drive offline/dummy-data play before
 * Supabase is wired in (Phase 5). The DB row remains the runtime source of truth.
 */
export const DEFAULT_ACTIVE_CONFIG: ActiveGameConfig = {
  game: { ...GAME_CONFIG },
  scoring: {
    decayExponentBeta: SCORING_CONFIG.decayExponentBeta,
    comboMultipliers: [...SCORING_CONFIG.comboMultipliers],
  },
  difficultyTiers: DIFFICULTY_TIERS.map((t) => ({ ...t })),
  xp: { ...XP_CONFIG },
  categories: buildCategoryEntries(),
};
