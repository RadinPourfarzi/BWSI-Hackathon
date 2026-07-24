export const gameConfig = {
  modes: ["arcade", "training"] as const,
  questionCount: {
    arcade: 12,
    training: 10,
  },
  maxResponseMs: 30_000,
} as const;

export type GameMode = (typeof gameConfig.modes)[number];
