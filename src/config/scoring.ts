export const scoringConfig = {
  basePoints: 1_000,
  gracePeriodMs: 2_500,
  decayWindowMs: 12_500,
  minimumTimeFactor: 0.35,
  incorrectPoints: 0,
  comboSteps: [
    { minimumCombo: 0, multiplier: 1 },
    { minimumCombo: 3, multiplier: 1.15 },
    { minimumCombo: 6, multiplier: 1.35 },
    { minimumCombo: 10, multiplier: 1.6 },
  ],
} as const;
