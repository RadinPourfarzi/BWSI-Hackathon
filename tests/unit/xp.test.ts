import { describe, expect, it } from "vitest";

import { calculateSessionXp, xpConfig } from "@/config/xp";

describe("session XP", () => {
  it("rewards correct and incorrect attempts explicitly", () => {
    const xp = calculateSessionXp({
      attempts: [{ isCorrect: true }, { isCorrect: false }],
      mode: "training",
      completed: true,
    });

    expect(xp.answerXp).toBe(xpConfig.correctAnswer + xpConfig.incorrectAnswer);
    expect(xp.completionXp).toBe(xpConfig.trainingCompletion);
    expect(xp.perfectBonusXp).toBe(0);
  });

  it("awards the perfect bonus only to non-empty perfect Arcade runs", () => {
    const perfect = calculateSessionXp({
      attempts: [{ isCorrect: true }, { isCorrect: true }],
      mode: "arcade",
      completed: true,
    });
    const empty = calculateSessionXp({
      attempts: [],
      mode: "arcade",
      completed: true,
    });

    expect(perfect.perfectBonusXp).toBe(xpConfig.perfectSessionBonus);
    expect(empty.totalXp).toBe(0);
  });
});
