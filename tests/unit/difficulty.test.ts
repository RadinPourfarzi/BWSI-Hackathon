import { describe, expect, it } from "vitest";

import {
  difficultyConfig,
  difficultyIds,
  getProgressionStep,
  progressionSteps,
} from "@/config/difficulty";

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

  it("increases gameplay difficulty as question count rises", () => {
    expect(getProgressionStep(1).id).toBe("rookie");
    expect(getProgressionStep(6).id).toBe("analyst");
    expect(getProgressionStep(13).id).toBe("specialist");
    expect(getProgressionStep(21).id).toBe("expert");

    progressionSteps.slice(1).forEach((step, index) => {
      const previous = progressionSteps[index]!;
      expect(step.timeLimitMultiplier).toBeLessThan(
        previous.timeLimitMultiplier,
      );
      expect(step.maximumPointsMultiplier).toBeGreaterThan(
        previous.maximumPointsMultiplier,
      );
    });
  });
});
