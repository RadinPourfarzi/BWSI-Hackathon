import { describe, expect, it } from "vitest";

import { categoryConfig } from "@/config/categories";
import {
  calculateObtainablePoints,
  getComboMultiplier,
  getQuestionRules,
  resolveAnswer,
} from "@/features/game/engine";
import { makeChallenge } from "../fixtures/challenges";

const challenge = makeChallenge({
  index: 999,
  category: "image",
  correctChoice: "option_a",
});

describe("plateau and power-decay scoring", () => {
  it("keeps maximum points throughout the category plateau", () => {
    const rules = getQuestionRules("image", 1);

    expect(
      calculateObtainablePoints({
        category: "image",
        questionNumber: 1,
        responseMs: 0,
      }),
    ).toBe(rules.maximumPoints);
    expect(
      calculateObtainablePoints({
        category: "image",
        questionNumber: 1,
        responseMs: rules.plateauMs,
      }),
    ).toBe(rules.maximumPoints);
  });

  it("decays monotonically to zero after the plateau", () => {
    const rules = getQuestionRules("image", 1);
    const values = [
      rules.plateauMs,
      rules.plateauMs + 1_000,
      rules.plateauMs + 4_000,
      rules.timeLimitMs,
    ].map((responseMs) =>
      calculateObtainablePoints({
        category: "image",
        questionNumber: 1,
        responseMs,
      }),
    );

    expect(values[0]).toBe(rules.maximumPoints);
    expect(values[1]).toBeLessThan(values[0] ?? 0);
    expect(values[2]).toBeLessThan(values[1] ?? 0);
    expect(values[3]).toBe(0);
  });

  it("gives voice challenges a longer plateau than images", () => {
    const elapsedMs = categoryConfig.voice.plateauMs;
    const voice = calculateObtainablePoints({
      category: "voice",
      responseMs: elapsedMs,
    });
    const image = calculateObtainablePoints({
      category: "image",
      responseMs: elapsedMs,
    });

    expect(voice).toBe(getQuestionRules("voice", 1).maximumPoints);
    expect(image).toBeLessThan(getQuestionRules("image", 1).maximumPoints);
  });

  it("uses exact combo thresholds", () => {
    expect(getComboMultiplier(0)).toBe(1);
    expect(getComboMultiplier(2)).toBe(1);
    expect(getComboMultiplier(3)).toBe(2);
    expect(getComboMultiplier(6)).toBe(3);
    expect(getComboMultiplier(10)).toBe(4);
  });

  it("applies the multiplier after the correct answer extends the combo", () => {
    const resolution = resolveAnswer({
      challenge,
      selectedChoice: "option_a",
      responseMs: 500,
      combo: 2,
    });

    expect(resolution.comboAfter).toBe(3);
    expect(resolution.comboMultiplier).toBe(2);
    expect(resolution.awardedPoints).toBe(resolution.obtainablePoints * 2);
  });

  it("awards zero and resets combo for incorrect or timed-out answers", () => {
    const incorrect = resolveAnswer({
      challenge,
      selectedChoice: "option_b",
      responseMs: 2_000,
      combo: 5,
    });
    const timedOut = resolveAnswer({
      challenge,
      selectedChoice: "option_a",
      responseMs: Number.POSITIVE_INFINITY,
      combo: 5,
    });

    expect(incorrect.awardedPoints).toBe(0);
    expect(incorrect.comboAfter).toBe(0);
    expect(timedOut.timedOut).toBe(true);
    expect(timedOut.selectedChoice).toBeNull();
    expect(timedOut.responseMs).toBe(getQuestionRules("image", 1).timeLimitMs);
  });
});
