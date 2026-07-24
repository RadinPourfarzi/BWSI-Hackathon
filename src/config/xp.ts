export const xpConfig = {
  correctAnswer: 20,
  incorrectAnswer: 4,
  completedSession: 80,
  perfectSessionBonus: 120,
  dailyFirstGameBonus: 50,
  levelBaseXp: 400,
  levelGrowth: 1.22,
} as const;

export function xpRequiredForLevel(level: number): number {
  const normalizedLevel = Math.max(1, Math.floor(level));
  return Math.round(
    (xpConfig.levelBaseXp *
      (Math.pow(xpConfig.levelGrowth, normalizedLevel - 1) - 1)) /
      (xpConfig.levelGrowth - 1),
  );
}

export function levelFromXp(totalXp: number): number {
  let level = 1;
  while (xpRequiredForLevel(level + 1) <= Math.max(0, totalXp)) level += 1;
  return level;
}
