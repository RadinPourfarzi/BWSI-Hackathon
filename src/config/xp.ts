import type { XpSettings } from '@/types/models';

/**
 * Default seed values + TS shape contract for `game_config.xp`.
 *
 * Total XP = (correct * baseXpPerCorrect) + (maxCombo * comboBonusPerMaxCombo)
 *          + runCompletionBonus
 * Level curve: XP required for level N = xpCurveBase * N^xpCurveExp
 *
 * See docs/data-formats.md §6.4 and project-plan.md §9.
 */
export const XP_CONFIG = {
  baseXpPerCorrect: 10,
  comboBonusPerMaxCombo: 5,
  runCompletionBonus: 50,
  xpCurveBase: 100,
  xpCurveExp: 1.5,
} as const satisfies XpSettings;
