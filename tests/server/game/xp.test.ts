import { describe, expect, it } from "vitest";
import { DEFAULT_GAME_CONFIG } from "@/config/game.config";
import { calculateLevel, calculateXp } from "@/server/game/xp";

describe("XP rules", () => {
  it("awards configured Arcade XP", () => {
    expect(
      calculateXp(
        {
          mode: "ARCADE",
          correctAnswers: 3,
          highestCombo: 2,
          completed: true,
        },
        DEFAULT_GAME_CONFIG,
      ),
    ).toBe(90);
  });

  it("awards no Training XP", () => {
    expect(
      calculateXp(
        {
          mode: "TRAINING",
          correctAnswers: 100,
          highestCombo: 100,
          completed: true,
        },
        DEFAULT_GAME_CONFIG,
      ),
    ).toBe(0);
  });

  it("never produces a level below one", () => {
    expect(calculateLevel(0, DEFAULT_GAME_CONFIG)).toBe(1);
  });
});
