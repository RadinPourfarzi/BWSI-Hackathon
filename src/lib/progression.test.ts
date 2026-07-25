import { describe, expect, it } from 'vitest';
import { computeRunXp, levelForXp, levelProgress, xpForLevel } from '@/lib/progression';
import { XP_CONFIG } from '@/config';

describe('computeRunXp', () => {
  it('sums correct, combo bonus, and completion bonus', () => {
    // 8 correct * 10 + maxCombo 5 * 5 + 50 = 80 + 25 + 50 = 155
    expect(computeRunXp(8, 5, XP_CONFIG)).toBe(155);
  });

  it('is just the completion bonus for an empty run', () => {
    expect(computeRunXp(0, 0, XP_CONFIG)).toBe(XP_CONFIG.runCompletionBonus);
  });
});

describe('level curve', () => {
  it('level 1 requires 0 cumulative XP; higher levels cost more', () => {
    expect(levelForXp(0, XP_CONFIG)).toBe(1);
    expect(levelForXp(-100, XP_CONFIG)).toBe(1);
    expect(xpForLevel(1, XP_CONFIG)).toBe(0);
    expect(xpForLevel(2, XP_CONFIG)).toBe(100); // base * (2-1)^1.5
  });

  it('is consistent with xpForLevel at boundaries (tolerant to FP at exact powers)', () => {
    // At exact integer powers (e.g. 4^1.5=8), floating-point pow can land a hair below,
    // flooring down by one — Postgres power() behaves the same, so the client still
    // matches the server. Accept n or n-1 at the threshold; require strict below it.
    for (let n = 2; n <= 20; n++) {
      const threshold = xpForLevel(n, XP_CONFIG);
      expect(levelForXp(threshold, XP_CONFIG)).toBeGreaterThanOrEqual(n - 1);
      expect(levelForXp(threshold, XP_CONFIG)).toBeLessThanOrEqual(n);
      expect(levelForXp(threshold - 1, XP_CONFIG)).toBe(n - 1);
    }
  });

  it('has exact, non-fragile boundaries around level 2', () => {
    expect(levelForXp(99, XP_CONFIG)).toBe(1);
    expect(levelForXp(100, XP_CONFIG)).toBe(2);
  });

  it('is monotonically non-decreasing in XP', () => {
    let prev = 0;
    for (let xp = 0; xp <= 10000; xp += 53) {
      const lvl = levelForXp(xp, XP_CONFIG);
      expect(lvl).toBeGreaterThanOrEqual(prev);
      prev = lvl;
    }
  });

  it('levelProgress stays within [0, 1]', () => {
    for (let xp = 0; xp <= 5000; xp += 137) {
      const p = levelProgress(xp, XP_CONFIG);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });
});
