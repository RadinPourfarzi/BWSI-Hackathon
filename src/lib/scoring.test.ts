import { describe, expect, it } from 'vitest';
import {
  awardedPoints,
  comboMultiplier,
  computeObtainablePoints,
  effectivePlateauMs,
} from '@/lib/scoring';
import type { DifficultyTier } from '@/types/models';

// Tier 1 defaults: M=100, plateau 1500ms, alpha 1.5, timer 15000ms.
const TIER: DifficultyTier = {
  minQuestion: 1,
  maxPoints: 100,
  timerMs: 15000,
  plateauMs: 1500,
  alpha: 1.5,
};
const BETA = 1.8;
const IMAGE_GRACE = 1500; // effective plateau = 1500 + 1500 = 3000ms
const MULTIPLIERS = [1, 1.5, 2, 2.5, 3, 4, 5];

describe('effectivePlateauMs', () => {
  it('adds the category grace to the tier plateau', () => {
    expect(effectivePlateauMs(TIER, IMAGE_GRACE)).toBe(3000);
  });
});

describe('computeObtainablePoints', () => {
  it('returns full points during the plateau (incl. the boundary)', () => {
    expect(computeObtainablePoints(0, TIER, IMAGE_GRACE, BETA)).toBe(100);
    expect(computeObtainablePoints(1500, TIER, IMAGE_GRACE, BETA)).toBe(100);
    expect(computeObtainablePoints(3000, TIER, IMAGE_GRACE, BETA)).toBe(100);
  });

  it('decays past the plateau per the exponential model', () => {
    // 5000ms: 2.0s past plateau -> 100 - 1.5 * 2^1.8 = 94.78 -> 95
    expect(computeObtainablePoints(5000, TIER, IMAGE_GRACE, BETA)).toBe(95);
  });

  it('decreases monotonically as response time grows', () => {
    let prev = Infinity;
    for (let t = 3000; t <= 15000; t += 500) {
      const pts = computeObtainablePoints(t, TIER, IMAGE_GRACE, BETA);
      expect(pts).toBeLessThanOrEqual(prev);
      prev = pts;
    }
  });

  it('never goes below zero and returns 0 after the hard timer', () => {
    expect(computeObtainablePoints(15000, TIER, IMAGE_GRACE, BETA)).toBeGreaterThanOrEqual(0);
    expect(computeObtainablePoints(15001, TIER, IMAGE_GRACE, BETA)).toBe(0);
    expect(computeObtainablePoints(999999, TIER, IMAGE_GRACE, BETA)).toBe(0);
  });
});

describe('comboMultiplier', () => {
  it('indexes multipliers and clamps to the last entry', () => {
    expect(comboMultiplier(0, MULTIPLIERS)).toBe(1);
    expect(comboMultiplier(1, MULTIPLIERS)).toBe(1.5);
    expect(comboMultiplier(3, MULTIPLIERS)).toBe(2.5);
    expect(comboMultiplier(6, MULTIPLIERS)).toBe(5);
    expect(comboMultiplier(50, MULTIPLIERS)).toBe(5);
  });

  it('handles negative indices and empty arrays defensively', () => {
    expect(comboMultiplier(-2, MULTIPLIERS)).toBe(1);
    expect(comboMultiplier(3, [])).toBe(1);
  });
});

describe('awardedPoints', () => {
  it('multiplies obtainable points by the combo multiplier', () => {
    // plateau (100 pts) * multiplier[1] (1.5) = 150
    expect(awardedPoints(0, TIER, IMAGE_GRACE, BETA, 1, MULTIPLIERS)).toBe(150);
    // plateau * multiplier[0] (1) = 100
    expect(awardedPoints(0, TIER, IMAGE_GRACE, BETA, 0, MULTIPLIERS)).toBe(100);
  });

  it('awards zero after timeout regardless of combo', () => {
    expect(awardedPoints(20000, TIER, IMAGE_GRACE, BETA, 5, MULTIPLIERS)).toBe(0);
  });
});
