import type { CategoryId } from '@/types/models';

/**
 * Default seed values for the `categories` table (the runtime source for grace periods,
 * merged into the active config by `get_active_config`).
 *
 * The effective full-points plateau for an attempt is the difficulty tier's `plateauMs`
 * plus the category's `gracePeriodMs` (extra reading/listening time for heavier media).
 *
 * See docs/data-formats.md §6.5 and project-plan.md §5.
 */
export interface CategoryDefaults {
  displayName: string;
  gracePeriodMs: number;
  sortOrder: number;
}

export const CATEGORY_CONFIG = {
  image: { displayName: 'AI Images', gracePeriodMs: 1500, sortOrder: 1 },
  email: { displayName: 'Scam Emails', gracePeriodMs: 2000, sortOrder: 2 },
  audio: { displayName: 'Voice Audio', gracePeriodMs: 5000, sortOrder: 3 },
} as const satisfies Record<CategoryId, CategoryDefaults>;

/** Ordered list of category ids for stable UI rendering. */
export const CATEGORY_IDS = (Object.keys(CATEGORY_CONFIG) as CategoryId[]).sort(
  (a, b) => CATEGORY_CONFIG[a].sortOrder - CATEGORY_CONFIG[b].sortOrder,
);
