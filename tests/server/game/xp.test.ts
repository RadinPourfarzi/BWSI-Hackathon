import { describe, expect, it } from 'vitest';
import { DEFAULT_GAME_CONFIG } from '@/config/game.config';
import { calculateLevel, calculateXp, xpForNextLevel } from '@/server/game/xp';

describe('XP and levels', () => {
  it('awards correct, combo, and completion XP in Arcade', () => {
    expect(
      calculateXp(
        {
          mode: 'ARCADE',
          correctAnswers: 3,
          highestCombo: 2,
          completed: true,
        },
        DEFAULT_GAME_CONFIG,
      ),
    ).toBe(90);
  });

  it('withholds the completion bonus for abandonment', () => {
    expect(
      calculateXp(
        {
          mode: 'ARCADE',
          correctAnswers: 3,
          highestCombo: 2,
          completed: false,
        },
        DEFAULT_GAME_CONFIG,
      ),
    ).toBe(40);
  });

  it('awards no Training XP', () => {
    expect(
      calculateXp(
        {
          mode: 'TRAINING',
          correctAnswers: 100,
          highestCombo: 100,
          completed: true,
        },
        DEFAULT_GAME_CONFIG,
      ),
    ).toBe(0);
  });

  it.each([
    [0, 1],
    [99, 1],
    [100, 2],
    [282, 2],
    [283, 3],
  ])('maps %i total XP to level %i', (xp, level) => {
    expect(calculateLevel(xp, DEFAULT_GAME_CONFIG)).toBe(level);
  });

  it('never produces a level below one', () => {
    expect(calculateLevel(-100, DEFAULT_GAME_CONFIG)).toBe(1);
  });

  it('computes the next-level threshold', () => {
    expect(xpForNextLevel(1, DEFAULT_GAME_CONFIG)).toBe(100);
    expect(xpForNextLevel(2, DEFAULT_GAME_CONFIG)).toBe(283);
  });
});
