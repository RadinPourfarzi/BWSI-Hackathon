import { describe, expect, it } from 'vitest';
import { updateLives } from '@/server/game/lives';

describe('lives', () => {
  it('keeps lives after a correct answer', () => {
    expect(updateLives(true, 3)).toBe(3);
  });

  it('removes one life after a wrong answer', () => {
    expect(updateLives(false, 3)).toBe(2);
  });

  it('does not go below zero', () => {
    expect(updateLives(false, 0)).toBe(0);
  });

  it('preserves null for modes with infinite lives', () => {
    expect(updateLives(false, null)).toBeNull();
  });
});
