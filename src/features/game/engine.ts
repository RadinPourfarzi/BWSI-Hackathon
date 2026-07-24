import { difficultyConfig } from "@/config/difficulty";
import { gameConfig } from "@/config/game";
import { scoringConfig } from "@/config/scoring";
import type {
  AttemptResolution,
  BinaryChoice,
  Challenge,
} from "@/features/game/types";
import { clamp } from "@/lib/utils";

export function getComboMultiplier(combo: number): number {
  const normalizedCombo = Math.max(0, Math.floor(combo));

  return scoringConfig.comboSteps.reduce(
    (multiplier, step) =>
      normalizedCombo >= step.minimumCombo ? step.multiplier : multiplier,
    1,
  );
}

export function calculateObtainablePoints({
  responseMs,
  combo,
  challenge,
}: {
  responseMs: number;
  combo: number;
  challenge: Challenge;
}): number {
  const elapsedAfterGrace = Math.max(
    0,
    responseMs - scoringConfig.gracePeriodMs,
  );
  const decayProgress = clamp(
    elapsedAfterGrace / scoringConfig.decayWindowMs,
    0,
    1,
  );
  const timeFactor = 1 - decayProgress * (1 - scoringConfig.minimumTimeFactor);
  const difficultyMultiplier =
    difficultyConfig[challenge.difficulty.tier].scoreMultiplier;
  const comboMultiplier = getComboMultiplier(combo);

  return Math.round(
    scoringConfig.basePoints *
      timeFactor *
      difficultyMultiplier *
      comboMultiplier,
  );
}

export function resolveAnswer({
  challenge,
  selectedChoice,
  responseMs,
  combo,
}: {
  challenge: Challenge;
  selectedChoice: BinaryChoice;
  responseMs: number;
  combo: number;
}): AttemptResolution {
  const normalizedResponseMs = clamp(
    Math.round(responseMs),
    0,
    gameConfig.maxResponseMs,
  );
  const isCorrect = selectedChoice === challenge.correctChoice;
  const obtainablePoints = calculateObtainablePoints({
    challenge,
    combo,
    responseMs: normalizedResponseMs,
  });

  return {
    challengeId: challenge.id,
    selectedChoice,
    correctChoice: challenge.correctChoice,
    isCorrect,
    responseMs: normalizedResponseMs,
    obtainablePoints,
    awardedPoints: isCorrect ? obtainablePoints : scoringConfig.incorrectPoints,
    comboBefore: combo,
    comboAfter: isCorrect ? combo + 1 : 0,
  };
}
