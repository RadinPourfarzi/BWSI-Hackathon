import type { ActiveGameConfig, GameMode } from "@/shared/types/game.types";

export interface XpInput {
  mode: GameMode;
  correctAnswers: number;
  highestCombo: number;
  completed: boolean;
}

export function calculateXp(input: XpInput, config: ActiveGameConfig): number {
  if (input.mode === "TRAINING") {
    return 0;
  }

  return (
    input.correctAnswers * config.xp.baseXpPerCorrect +
    input.highestCombo * config.xp.comboBonusPerMaxCombo +
    (input.completed ? config.xp.runCompletionBonus : 0)
  );
}

export function calculateLevel(totalXp: number, config: ActiveGameConfig): number {
  if (totalXp <= 0) {
    return 1;
  }

  return (
    Math.floor(Math.pow(totalXp / config.xp.xpCurveBase, 1 / config.xp.xpCurveExp)) + 1
  );
}
