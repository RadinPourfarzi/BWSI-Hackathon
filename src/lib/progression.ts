import type { XpSettings } from '@/types/models';

/**
 * Progression math (XP + level curve). Mirrors the server-authoritative logic in
 * `submit_run` (docs/database-schema.md §6.5) so the client can display projected XP/level
 * during offline/dummy play. Once Supabase is wired, the server values are authoritative.
 *
 *   Total XP = (correct * baseXpPerCorrect) + (maxCombo * comboBonusPerMaxCombo)
 *            + runCompletionBonus
 *   level(xp) = floor((xp / xpCurveBase)^(1/xpCurveExp)) + 1   (server formula)
 *
 * NOTE: the spec text "XP for level N = base * N^xpCurveExp" is inconsistent with the
 * server's level(xp) inverse (they differ by one level). We follow the server so the
 * client shows the same level the server persists; `xpForLevel` below is the exact inverse
 * of `levelForXp`: the cumulative XP threshold to *reach* level N is base * (N-1)^exp.
 */

/** XP earned for a completed Arcade run. */
export function computeRunXp(correct: number, maxCombo: number, xp: XpSettings): number {
  return (
    correct * xp.baseXpPerCorrect + maxCombo * xp.comboBonusPerMaxCombo + xp.runCompletionBonus
  );
}

/** Cumulative XP threshold required to reach level N (level 1 = 0 XP). */
export function xpForLevel(level: number, xp: XpSettings): number {
  if (level <= 1) {
    return 0;
  }
  return Math.round(xp.xpCurveBase * Math.pow(level - 1, xp.xpCurveExp));
}

/** Current level for a given cumulative XP total (server formula; min 1). */
export function levelForXp(totalXp: number, xp: XpSettings): number {
  if (totalXp <= 0) {
    return 1;
  }
  return Math.max(1, Math.floor(Math.pow(totalXp / xp.xpCurveBase, 1 / xp.xpCurveExp)) + 1);
}

/** Progress toward the next level as a fraction in [0, 1], for progress bars. */
export function levelProgress(totalXp: number, xp: XpSettings): number {
  const level = levelForXp(totalXp, xp);
  const floor = xpForLevel(level, xp);
  const ceil = xpForLevel(level + 1, xp);
  if (ceil <= floor) {
    return 0;
  }
  return Math.min(1, Math.max(0, (totalXp - floor) / (ceil - floor)));
}
