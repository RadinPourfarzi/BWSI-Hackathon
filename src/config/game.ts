import type { CategoryId, GameMode, GameSettings } from '@/types/models';

/**
 * Default seed values + TS shape contract for `game_config.game`.
 *
 * Runtime source of truth is the active `game_config` DB row; this mirrors it so the
 * client has sane defaults and a typed contract. See docs/data-formats.md §6.1.
 */
export const GAME_CONFIG = {
  arcadeLives: 3,
  batchSize: 15,
  /** Refetch when unused questions fall below this. */
  prefetchThreshold: 5,
} as const satisfies GameSettings;

/** Client-only run defaults (not part of the server config blob). */
export const GAME_DEFAULTS = {
  defaultMode: 'ARCADE' as GameMode,
  defaultCategories: ['image', 'email', 'audio'] as CategoryId[],
} as const;
