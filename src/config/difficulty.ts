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
