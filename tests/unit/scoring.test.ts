import { describe, expect, it } from "vitest";

import { gameConfig } from "@/config/game";
import { scoringConfig } from "@/config/scoring";
import {
  calculateObtainablePoints,
  getComboMultiplier,
  resolveAnswer,
} from "@/features/game/engine";
import type { Challenge } from "@/features/game/types";

const challenge: Challenge = {
  id: "00000000-0000-4000-8000-000000009999",
  category: "image",
  contentType: "image",
  payload: {
    kind: "image",
    src: "/example.webp",
    alt: "Example",
    width: 768,
    height: 768,
  },
  correctChoice: "option_a",
  labels: { optionA: "AI", optionB: "Real" },
  difficulty: { tier: "medium", signals: [] },
  explanation: "Example explanation.",
  sourceDataset: "Test",
  originalSourceUrl: "https://example.com",
  license: "CC0-1.0",
  attribution: "Test fixture.",
  contentHash: "a".repeat(64),
  active: true,
  metadata: {},
};

describe("scoring engine", () => {
  it("preserves full base points inside the grace period", () => {
    expect(
      calculateObtainablePoints({
        challenge,
        combo: 0,
        responseMs: scoringConfig.gracePeriodMs,
      }),
    ).toBe(scoringConfig.basePoints);
  });

  it("decreases obtainable points with elapsed time", () => {
    const fast = calculateObtainablePoints({
      challenge,
      combo: 0,
      responseMs: 3_000,
    });
    const slow = calculateObtainablePoints({
      challenge,
      combo: 0,
      responseMs: 14_000,
    });

    expect(fast).toBeGreaterThan(slow);
    expect(slow).toBeGreaterThanOrEqual(
      Math.round(scoringConfig.basePoints * scoringConfig.minimumTimeFactor),
    );
  });

  it("never lowers the multiplier as combo increases", () => {
    const values = Array.from({ length: 20 }, (_value, combo) =>
      getComboMultiplier(combo),
    );

    values.slice(1).forEach((value, index) => {
      expect(value).toBeGreaterThanOrEqual(values[index] ?? 0);
    });
  });

  it("awards zero points and resets combo for an incorrect answer", () => {
    const resolution = resolveAnswer({
      challenge,
      selectedChoice: "option_b",
      responseMs: 2_000,
      combo: 5,
    });

    expect(resolution.isCorrect).toBe(false);
    expect(resolution.awardedPoints).toBe(0);
    expect(resolution.comboAfter).toBe(0);
    expect(resolution.obtainablePoints).toBeGreaterThan(0);
  });

  it("caps client response times at the configured persistence limit", () => {
    const resolution = resolveAnswer({
      challenge,
      selectedChoice: "option_a",
      responseMs: Number.POSITIVE_INFINITY,
      combo: 0,
    });

    expect(resolution.responseMs).toBe(gameConfig.maxResponseMs);
  });
});
