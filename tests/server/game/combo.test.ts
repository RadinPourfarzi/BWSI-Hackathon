import { describe, expect, it } from 'vitest';
import { multiplierForCombo, nextCombo } from '@/server/game/combo';

const multipliers = [1, 1.5, 2, 3];

describe('combo rules', () => {
  it.each([
    [0, 1],
    [1, 1.5],
    [2, 2],
  ])('uses the pre-answer combo %i for %fx', (combo, expected) => {
    expect(multiplierForCombo(combo, multipliers)).toBe(expected);
  });

  it('clamps combos above the configured table', () => {
    expect(multiplierForCombo(99, multipliers)).toBe(3);
  });

  it('clamps negative combos to the first multiplier', () => {
    expect(multiplierForCombo(-5, multipliers)).toBe(1);
  });

  it('increments a correct combo', () => {
    expect(nextCombo(3, true)).toBe(4);
  });

  it('resets a wrong combo', () => {
    expect(nextCombo(3, false)).toBe(0);
  });
});
