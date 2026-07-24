import type { GameMode } from "@/config/game";

export const xpConfig = {
  correctAnswer: 20,
  incorrectAnswer: 4,
  arcadeCompletion: 80,
  trainingCompletion: 40,
  perfectSessionBonus: 120,
  dailyFirstGameBonus: 50,
  levelBaseXp: 400,
  levelGrowth: 1.22,
} as const;

export type SessionXpBreakdown = {
  answerXp: number;
  completionXp: number;
  perfectBonusXp: number;
  totalXp: number;
};

export function calculateSessionXp({
  attempts,
  mode,
  completed,
}: {
  attempts: ReadonlyArray<{ isCorrect: boolean }>;
  mode: GameMode;
  completed: boolean;
}): SessionXpBreakdown {
  const answerXp = attempts.reduce(
    (total, attempt) =>
      total +
      (attempt.isCorrect ? xpConfig.correctAnswer : xpConfig.incorrectAnswer),
    0,
  );
  const completionXp =
    completed && attempts.length > 0
      ? mode === "arcade"
        ? xpConfig.arcadeCompletion
        : xpConfig.trainingCompletion
      : 0;
  const perfectBonusXp =
    completed &&
    mode === "arcade" &&
    attempts.length > 0 &&
    attempts.every((attempt) => attempt.isCorrect)
      ? xpConfig.perfectSessionBonus
      : 0;

  return {
    answerXp,
    completionXp,
    perfectBonusXp,
    totalXp: answerXp + completionXp + perfectBonusXp,
  };
}

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
