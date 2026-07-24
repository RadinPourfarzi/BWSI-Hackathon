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
