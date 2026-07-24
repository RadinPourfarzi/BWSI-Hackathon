import { describe, expect, it } from "vitest";

import { categoryConfig, categoryIds } from "@/config/categories";
import { gameConfig } from "@/config/game";
import { scoringConfig } from "@/config/scoring";
import { levelFromXp, xpRequiredForLevel } from "@/config/xp";

describe("game configuration", () => {
  it("defines every supported category with two distinct labels", () => {
    expect(Object.keys(categoryConfig).sort()).toEqual([...categoryIds].sort());

    for (const category of Object.values(categoryConfig)) {
      expect(category.optionA).not.toBe(category.optionB);
      expect(category.rendererKey).toBe(category.id);
    }
  });

  it("uses valid round limits", () => {
    expect(gameConfig.questionCount.arcade).toBeGreaterThan(0);
    expect(gameConfig.questionCount.training).toBeGreaterThan(0);
    expect(gameConfig.maxResponseMs).toBeGreaterThan(0);
  });

  it("keeps score factors within valid bounds", () => {
    expect(scoringConfig.minimumTimeFactor).toBeGreaterThan(0);
    expect(scoringConfig.minimumTimeFactor).toBeLessThanOrEqual(1);
    expect(scoringConfig.decayWindowMs).toBeGreaterThan(0);
    expect(scoringConfig.basePoints).toBeGreaterThan(0);
  });

  it("keeps XP thresholds strictly increasing", () => {
    const thresholds = Array.from({ length: 20 }, (_value, index) =>
      xpRequiredForLevel(index + 1),
    );

    thresholds.slice(1).forEach((threshold, index) => {
      expect(threshold).toBeGreaterThan(thresholds[index] ?? -1);
    });
    expect(levelFromXp(xpRequiredForLevel(8))).toBe(8);
  });
});
