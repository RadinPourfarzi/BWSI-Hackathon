import { describe, expect, it } from "vitest";

import { difficultyConfig, difficultyIds } from "@/config/difficulty";

describe("difficulty configuration", () => {
  it("defines every tier", () => {
    expect(Object.keys(difficultyConfig)).toEqual([...difficultyIds]);
  });

  it("rewards harder questions with larger score and XP multipliers", () => {
    expect(difficultyConfig.easy.scoreMultiplier).toBeLessThan(
      difficultyConfig.medium.scoreMultiplier,
    );
    expect(difficultyConfig.medium.scoreMultiplier).toBeLessThan(
      difficultyConfig.hard.scoreMultiplier,
    );
    expect(difficultyConfig.easy.xpMultiplier).toBeLessThan(
      difficultyConfig.medium.xpMultiplier,
    );
    expect(difficultyConfig.medium.xpMultiplier).toBeLessThan(
      difficultyConfig.hard.xpMultiplier,
    );
  });

  it("uses shorter target times for harder questions", () => {
    expect(difficultyConfig.easy.targetResponseMs).toBeGreaterThan(
      difficultyConfig.medium.targetResponseMs,
    );
    expect(difficultyConfig.medium.targetResponseMs).toBeGreaterThan(
      difficultyConfig.hard.targetResponseMs,
    );
  });
});
