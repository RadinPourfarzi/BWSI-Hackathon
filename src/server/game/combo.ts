export function multiplierForCombo(
  comboBeforeAnswer: number,
  multipliers: readonly number[],
): number {
  const index = Math.min(Math.max(comboBeforeAnswer, 0), multipliers.length - 1);
  return multipliers[index] ?? 1;
}

export function nextCombo(comboBeforeAnswer: number, wasCorrect: boolean): number {
  return wasCorrect ? comboBeforeAnswer + 1 : 0;
}
