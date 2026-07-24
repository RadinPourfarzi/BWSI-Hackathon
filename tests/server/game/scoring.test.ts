import { describe, expect, it } from "vitest";
import { DEFAULT_GAME_CONFIG } from "@/config/game.config";
import { calculateScore } from "@/server/game/scoring";

describe("calculateScore", () => {
  it("awards full points inside the effective plateau", () => {
    const result = calculateScore({
      isCorrect: true,
      responseTimeMs: 2_000,
      questionNumber: 1,
      categoryId: "image",
      comboBeforeAnswer: 0,
      config: DEFAULT_GAME_CONFIG,
    });

    expect(result.points).toBe(100);
  });

  it("applies score decay after the plateau", () => {
    const result = calculateScore({
      isCorrect: true,
      responseTimeMs: 10_000,
      questionNumber: 1,
      categoryId: "image",
      comboBeforeAnswer: 0,
      config: DEFAULT_GAME_CONFIG,
    });

    expect(result.points).toBeGreaterThan(0);
    expect(result.points).toBeLessThan(100);
  });

  it("awards zero points after the hard timer cap", () => {
    const result = calculateScore({
      isCorrect: true,
      responseTimeMs: 15_001,
      questionNumber: 1,
      categoryId: "image",
      comboBeforeAnswer: 0,
      config: DEFAULT_GAME_CONFIG,
    });

    expect(result).toMatchObject({ points: 0, timedOut: true });
  });

  it("uses the combo that existed before the answer", () => {
    const result = calculateScore({
      isCorrect: true,
      responseTimeMs: 1_000,
      questionNumber: 1,
      categoryId: "image",
      comboBeforeAnswer: 2,
      config: DEFAULT_GAME_CONFIG,
    });

    expect(result.points).toBe(200);
  });
});
