export const scoringConfig = {
  basePoints: 1_000,
  incorrectPoints: 0,
  comboSteps: [
    { minimumCombo: 0, multiplier: 1 },
    { minimumCombo: 3, multiplier: 2 },
    { minimumCombo: 6, multiplier: 3 },
    { minimumCombo: 10, multiplier: 4 },
  ],
} as const;
