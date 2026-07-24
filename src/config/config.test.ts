import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ACTIVE_CONFIG,
  DIFFICULTY_TIERS,
  GAME_CONFIG,
  SCORING_CONFIG,
  XP_CONFIG,
} from '@/config';

describe('config contracts', () => {
  it('matches the project-plan difficulty tiers (§7)', () => {
    expect(DIFFICULTY_TIERS).toEqual([
      { minQuestion: 1, maxPoints: 100, timerMs: 15000, plateauMs: 1500, alpha: 1.5 },
      { minQuestion: 6, maxPoints: 150, timerMs: 10000, plateauMs: 1000, alpha: 2.5 },
      { minQuestion: 16, maxPoints: 200, timerMs: 7000, plateauMs: 500, alpha: 4.0 },
      { minQuestion: 31, maxPoints: 300, timerMs: 5000, plateauMs: 200, alpha: 6.0 },
    ]);
  });

  it('tiers are sorted ascending by minQuestion (tier selection relies on this)', () => {
    const mins = DIFFICULTY_TIERS.map((t) => t.minQuestion);
    expect(mins).toEqual([...mins].sort((a, b) => a - b));
  });

  it('has core scoring/game/xp defaults', () => {
    expect(GAME_CONFIG.arcadeLives).toBe(3);
    expect(SCORING_CONFIG.decayExponentBeta).toBe(1.8);
    expect(SCORING_CONFIG.comboMultipliers[0]).toBe(1);
    expect(XP_CONFIG.xpCurveExp).toBe(1.5);
  });

  it('assembles a default ActiveGameConfig with all three categories', () => {
    expect(Object.keys(DEFAULT_ACTIVE_CONFIG.categories).sort()).toEqual([
      'audio',
      'email',
      'image',
    ]);
    expect(DEFAULT_ACTIVE_CONFIG.categories.audio.gracePeriodMs).toBe(5000);
    expect(DEFAULT_ACTIVE_CONFIG.difficultyTiers).toHaveLength(4);
  });
});
