export type ShellProfile = {
  displayName: string;
  email: string;
  level: number;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  gamesPlayed: number;
  accuracy: number;
  bestScore: number;
  categoryAccuracy: Record<string, number>;
};

export type RecentActivity = {
  id: string;
  mode: "arcade" | "training";
  score: number;
  xpEarned: number;
  correct: number;
  answered: number;
  completedAt: string;
};

export type PlayerProfile = ShellProfile & {
  joinDate: string | null;
  strongestCategory: string | null;
  recentActivity: RecentActivity[];
};
