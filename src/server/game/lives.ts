export function updateLives(
  wasCorrect: boolean,
  currentLives: number | null,
): number | null {
  if (currentLives === null || wasCorrect) {
    return currentLives;
  }
  return Math.max(0, currentLives - 1);
}
