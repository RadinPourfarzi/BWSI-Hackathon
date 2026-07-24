import { describe, expect, it } from 'vitest';
import { selectTier } from '@/lib/difficulty';
import { DIFFICULTY_TIERS } from '@/config';

describe('selectTier', () => {
  it('selects the correct tier at each threshold boundary', () => {
    expect(selectTier(1, DIFFICULTY_TIERS).minQuestion).toBe(1);
    expect(selectTier(5, DIFFICULTY_TIERS).minQuestion).toBe(1);
    expect(selectTier(6, DIFFICULTY_TIERS).minQuestion).toBe(6);
    expect(selectTier(15, DIFFICULTY_TIERS).minQuestion).toBe(6);
    expect(selectTier(16, DIFFICULTY_TIERS).minQuestion).toBe(16);
    expect(selectTier(30, DIFFICULTY_TIERS).minQuestion).toBe(16);
    expect(selectTier(31, DIFFICULTY_TIERS).minQuestion).toBe(31);
    expect(selectTier(999, DIFFICULTY_TIERS).minQuestion).toBe(31);
  });

  it('falls back to the first tier below the lowest threshold', () => {
    expect(selectTier(0, DIFFICULTY_TIERS).minQuestion).toBe(1);
  });

  it('throws when no tiers are configured', () => {
    expect(() => selectTier(1, [])).toThrow();
  });
});
