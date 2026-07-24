import { describe, expect, it } from 'vitest';
import { DEFAULT_GAME_CONFIG } from '@/config/game.config';
import { tierForQuestion } from '@/server/game/difficulty';

describe('difficulty tiers', () => {
  it.each([
    [1, 1],
    [5, 1],
    [6, 6],
    [15, 6],
    [16, 16],
    [30, 16],
    [31, 31],
    [1_000, 31],
  ])('maps question %i to tier %i', (question, minQuestion) => {
    expect(
      tierForQuestion(question, DEFAULT_GAME_CONFIG.difficultyTiers).minQuestion,
    ).toBe(minQuestion);
  });

  it('rejects an empty tier list', () => {
    expect(() => tierForQuestion(1, [])).toThrow('At least one difficulty tier');
  });
});
