import { describe, expect, it } from "vitest";

import { categoryConfig, categoryIds } from "@/config/categories";
import { gameConfig } from "@/config/game";
import { scoringConfig } from "@/config/scoring";
import { levelFromXp, xpRequiredForLevel } from "@/config/xp";

describe("game configuration", () => {
  it("defines every category with labels and valid timing parameters", () => {
    expect(Object.keys(categoryConfig).sort()).toEqual([...categoryIds].sort());

    for (const category of Object.values(categoryConfig)) {
      expect(category.optionA).not.toBe(category.optionB);
      expect(category.rendererKey).toBe(category.id);
      expect(category.plateauMs).toBeGreaterThan(0);
      expect(category.timeLimitMs).toBeGreaterThan(category.plateauMs);
      expect(category.decayBeta).toBeGreaterThan(1);
    }
  });

  it("uses bounded batches and three Arcade lives", () => {
    expect(gameConfig.initialLives).toBe(3);
    expect(gameConfig.batch.initialSize).toBeGreaterThanOrEqual(10);
    expect(gameConfig.batch.initialSize).toBeLessThanOrEqual(20);
    expect(gameConfig.batch.refillThreshold).toBeLessThan(
      gameConfig.batch.refillSize,
    );
    expect(gameConfig.batch.refillSize).toBeLessThanOrEqual(
      gameConfig.batch.maximumRequestSize,
    );
  });

  it("defines exact 1x through 4x combo tiers", () => {
    expect(scoringConfig.comboSteps.map((step) => step.multiplier)).toEqual([
      1, 2, 3, 4,
    ]);
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
