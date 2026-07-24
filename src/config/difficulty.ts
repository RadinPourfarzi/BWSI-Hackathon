export const difficultyIds = ["easy", "medium", "hard"] as const;

export type DifficultyId = (typeof difficultyIds)[number];

export const difficultyConfig = {
  easy: {
    label: "Easy",
    scoreMultiplier: 0.85,
    targetResponseMs: 12_000,
    xpMultiplier: 0.8,
  },
  medium: {
    label: "Medium",
    scoreMultiplier: 1,
    targetResponseMs: 9_000,
    xpMultiplier: 1,
  },
  hard: {
    label: "Hard",
    scoreMultiplier: 1.25,
    targetResponseMs: 7_000,
    xpMultiplier: 1.25,
  },
} as const satisfies Record<
  DifficultyId,
  {
    label: string;
    scoreMultiplier: number;
    targetResponseMs: number;
    xpMultiplier: number;
  }
>;

export const progressionSteps = [
  {
    id: "rookie",
    label: "Rookie",
    startsAtQuestion: 1,
    timeLimitMultiplier: 1,
    plateauMultiplier: 1,
    maximumPointsMultiplier: 1,
  },
  {
    id: "analyst",
    label: "Analyst",
    startsAtQuestion: 6,
    timeLimitMultiplier: 0.9,
    plateauMultiplier: 0.95,
    maximumPointsMultiplier: 1.15,
  },
  {
    id: "specialist",
    label: "Specialist",
    startsAtQuestion: 13,
    timeLimitMultiplier: 0.8,
    plateauMultiplier: 0.9,
    maximumPointsMultiplier: 1.3,
  },
  {
    id: "expert",
    label: "Expert",
    startsAtQuestion: 21,
    timeLimitMultiplier: 0.7,
    plateauMultiplier: 0.85,
    maximumPointsMultiplier: 1.5,
  },
] as const;

export type ProgressionStep = (typeof progressionSteps)[number];

export function getProgressionStep(questionNumber: number): ProgressionStep {
  const normalizedQuestion = Math.max(1, Math.floor(questionNumber));

  return progressionSteps.reduce<ProgressionStep>(
    (activeStep, step) =>
      normalizedQuestion >= step.startsAtQuestion ? step : activeStep,
    progressionSteps[0],
  );
}
