import { describe, expect, it } from 'vitest';
import { DEFAULT_GAME_CONFIG } from '@/config/game.config';
import { calculateBasePoints, effectivePlateauMs } from '@/server/game/scoring';

const tier = DEFAULT_GAME_CONFIG.difficultyTiers[0]!;

function score(responseTimeMs: number) {
  return calculateBasePoints({
    responseTimeMs,
    tier,
    gracePeriodMs: DEFAULT_GAME_CONFIG.categories.image.gracePeriodMs,
    beta: DEFAULT_GAME_CONFIG.scoring.decayExponentBeta,
    timerSlackMs: DEFAULT_GAME_CONFIG.scoring.timerSlackMs,
  });
}

describe('scoring', () => {
  it('adds category grace to the tier plateau', () => {
    expect(
      effectivePlateauMs(tier, DEFAULT_GAME_CONFIG.categories.image.gracePeriodMs),
    ).toBe(3_000);
  });

  it.each([0, 1_000, 3_000])(
    'awards full points at %i ms inside the plateau',
    (responseTimeMs) => {
      expect(score(responseTimeMs)).toEqual({
        basePoints: 100,
        timedOut: false,
      });
    },
  );

  it('decays after the plateau', () => {
    const result = score(10_000);
    expect(result.basePoints).toBeGreaterThan(0);
    expect(result.basePoints).toBeLessThan(100);
    expect(result.timedOut).toBe(false);
  });

  it('accelerates decay over time', () => {
    const earlyLoss = 100 - score(5_000).basePoints;
    const lateLoss = 100 - score(10_000).basePoints;
    expect(lateLoss).toBeGreaterThan(earlyLoss);
  });

  it('allows the configured network slack at the hard cap', () => {
    expect(score(15_750).timedOut).toBe(false);
  });

  it('times out beyond the hard cap plus slack', () => {
    expect(score(15_751)).toEqual({
      basePoints: 0,
      timedOut: true,
    });
  });

  it('never returns negative points', () => {
    const severe = calculateBasePoints({
      responseTimeMs: 14_000,
      tier: { ...tier, alpha: 10_000 },
      gracePeriodMs: 0,
      beta: 2,
      timerSlackMs: 0,
    });
    expect(severe.basePoints).toBe(0);
  });
});
