import { describe, expect, it } from "vitest";
import { DEFAULT_GAME_CONFIG } from "@/config/game.config";
import { GameRuleEngine } from "@/server/game/rule-engine";

const engine = new GameRuleEngine();

describe("GameRuleEngine", () => {
  it("increments combo and score for a correct Arcade answer", () => {
    const result = engine.resolveAnswer({
      mode: "ARCADE",
      categoryId: "image",
      wasCorrect: true,
      responseTimeMs: 1_000,
      questionNumber: 1,
      currentScore: 0,
      currentCombo: 0,
      highestCombo: 0,
      currentLives: 3,
      config: DEFAULT_GAME_CONFIG,
    });

    expect(result).toMatchObject({
      awardedPoints: 100,
      score: 100,
      combo: 1,
      highestCombo: 1,
      lives: 3,
      gameEnded: false,
    });
  });

  it("resets combo, removes the final life, and ends Arcade", () => {
    const result = engine.resolveAnswer({
      mode: "ARCADE",
      categoryId: "image",
      wasCorrect: false,
      responseTimeMs: 1_000,
      questionNumber: 1,
      currentScore: 200,
      currentCombo: 4,
      highestCombo: 4,
      currentLives: 1,
      config: DEFAULT_GAME_CONFIG,
    });

    expect(result).toMatchObject({
      awardedPoints: 0,
      score: 200,
      combo: 0,
      highestCombo: 4,
      lives: 0,
      gameEnded: true,
    });
  });

  it("does not score or remove lives in Training mode", () => {
    const result = engine.resolveAnswer({
      mode: "TRAINING",
      categoryId: "email",
      wasCorrect: false,
      responseTimeMs: 20_000,
      questionNumber: 1,
      currentScore: 0,
      currentCombo: 0,
      highestCombo: 0,
      currentLives: null,
      config: DEFAULT_GAME_CONFIG,
    });

    expect(result).toMatchObject({
      awardedPoints: 0,
      score: 0,
      lives: null,
      gameEnded: false,
    });
  });

  it("does not apply the Arcade timeout or combo system in Training", () => {
    const result = engine.resolveAnswer({
      mode: "TRAINING",
      categoryId: "image",
      wasCorrect: true,
      responseTimeMs: 60_000,
      questionNumber: 1,
      currentScore: 0,
      currentCombo: 0,
      highestCombo: 0,
      currentLives: null,
      config: DEFAULT_GAME_CONFIG,
    });

    expect(result).toMatchObject({
      effectiveCorrectness: true,
      awardedPoints: 0,
      score: 0,
      combo: 0,
      lives: null,
      gameEnded: false,
    });
  });
});
