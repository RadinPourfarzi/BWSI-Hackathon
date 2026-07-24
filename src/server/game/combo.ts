export interface ComboResult {
  combo: number;
  highestCombo: number;
}

export function updateCombo(
  wasCorrect: boolean,
  currentCombo: number,
  highestCombo: number,
): ComboResult {
  const combo = wasCorrect ? currentCombo + 1 : 0;
  return { combo, highestCombo: Math.max(highestCombo, combo) };
}
