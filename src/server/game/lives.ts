import type { GameMode } from "@/shared/types/game.types";

export function updateLives(
  mode: GameMode,
  wasCorrect: boolean,
  currentLives: number | null,
): number | null {
  if (mode === "TRAINING" || currentLives === null || wasCorrect) {
    return currentLives;
  }

  return Math.max(0, currentLives - 1);
}

export function shouldEndGame(mode: GameMode, lives: number | null): boolean {
  return mode === "ARCADE" && lives === 0;
}
