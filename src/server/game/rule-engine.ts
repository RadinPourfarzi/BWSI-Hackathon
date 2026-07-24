import type { GameEvent } from "@/shared/contracts/game.contracts";
import type { ActiveGameConfig, CategoryId, GameMode } from "@/shared/types/game.types";
import { calculateScore } from "@/server/game/scoring";
import { updateCombo } from "@/server/game/combo";
import { shouldEndGame, updateLives } from "@/server/game/lives";

export interface ResolveAnswerInput {
  mode: GameMode;
  categoryId: CategoryId;
  wasCorrect: boolean;
  responseTimeMs: number;
  questionNumber: number;
  currentScore: number;
  currentCombo: number;
  highestCombo: number;
  currentLives: number | null;
  config: ActiveGameConfig;
}

export interface ResolveAnswerResult {
  effectiveCorrectness: boolean;
  awardedPoints: number;
  score: number;
  combo: number;
  highestCombo: number;
  lives: number | null;
  gameEnded: boolean;
  timedOut: boolean;
  events: GameEvent[];
}

export class GameRuleEngine {
  resolveAnswer(input: ResolveAnswerInput): ResolveAnswerResult {
    const scoreResult = calculateScore({
      isCorrect: input.wasCorrect,
      responseTimeMs: input.responseTimeMs,
      questionNumber: input.questionNumber,
      categoryId: input.categoryId,
      comboBeforeAnswer: input.currentCombo,
      config: input.config,
    });
    const timeLimitEnabled = input.mode === "ARCADE";
    const comboEnabled = input.mode === "ARCADE";
    const effectiveCorrectness =
      input.wasCorrect && (!timeLimitEnabled || !scoreResult.timedOut);
    const comboResult = comboEnabled
      ? updateCombo(effectiveCorrectness, input.currentCombo, input.highestCombo)
      : { combo: 0, highestCombo: input.highestCombo };
    const lives = updateLives(input.mode, effectiveCorrectness, input.currentLives);
    const gameEnded = shouldEndGame(input.mode, lives);
    const scoringEnabled = input.mode === "ARCADE";
    const awardedPoints = scoringEnabled ? scoreResult.points : 0;
    const events: GameEvent[] = [];

    if (effectiveCorrectness) {
      events.push({ type: "answer-correct", pointsAwarded: awardedPoints });
      if (comboEnabled) {
        events.push({ type: "combo-increased", combo: comboResult.combo });
      }
    } else {
      if (comboEnabled) {
        events.push({ type: "combo-reset" });
      }
      if (lives !== null && lives !== input.currentLives) {
        events.push({ type: "life-lost", livesRemaining: lives });
      }
    }
    if (gameEnded) {
      events.push({ type: "game-ended" });
    }

    return {
      effectiveCorrectness,
      awardedPoints,
      score: input.currentScore + awardedPoints,
      combo: comboResult.combo,
      highestCombo: comboResult.highestCombo,
      lives,
      gameEnded,
      timedOut: scoreResult.timedOut,
      events,
    };
  }
}
