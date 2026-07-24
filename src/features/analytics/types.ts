import type { CategoryId } from "@/config/categories";

export type CategoryAnalytics = {
  answered: number;
  correct: number;
  accuracy: number;
  averageResponseMs: number;
};

export type AnalyticsTrendPoint = {
  id: string;
  date: string;
  overallAccuracy: number;
  imageAccuracy: number | null;
  emailAccuracy: number | null;
  voiceAccuracy: number | null;
  averageResponseMs: number;
  averageScore: number | null;
  sampleSize: number;
};

export type PlayerAnalytics = {
  available: boolean;
  overallAccuracy: number;
  categories: Record<CategoryId, CategoryAnalytics>;
  totalQuestionsAnswered: number;
  highestArcadeScore: number;
  longestCombo: number;
  averageResponseMs: number;
  currentLevel: number;
  totalXp: number;
  totalGamesPlayed: number;
  arcadeGamesPlayed: number;
  trainingGamesPlayed: number;
  averageArcadeScore: number;
  strongestCategory: CategoryId | null;
  mostDifficultCategory: CategoryId | null;
  mostPlayedCategory: CategoryId | null;
  currentDailyStreak: number;
  longestDailyStreak: number;
  trends: AnalyticsTrendPoint[];
};
