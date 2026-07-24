export const gameConfig = {
  modes: ["arcade", "training"] as const,
  initialLives: 3,
  batch: {
    initialSize: 15,
    refillSize: 12,
    refillThreshold: 5,
    maximumRequestSize: 20,
  },
  feedbackDurationMs: {
    arcade: 650,
    training: 0,
  },
  maximumRecordedAttempts: 500,
  localStorage: {
    categorySelection: "ai-detection-game:categories:v1",
    activeRun: "ai-detection-game:active-run:v1",
  },
  maxResponseMs: 120_000,
} as const;

export type GameMode = (typeof gameConfig.modes)[number];
