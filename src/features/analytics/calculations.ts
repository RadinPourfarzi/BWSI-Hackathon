import { z } from "zod";

import { categoryIds, type CategoryId } from "@/config/categories";
import type {
  AnalyticsTrendPoint,
  CategoryAnalytics,
  PlayerAnalytics,
} from "@/features/analytics/types";

const categoryMetricSchema = z.object({
  answered: z.number().int().nonnegative(),
  correct: z.number().int().nonnegative(),
  accuracy: z.number().nonnegative(),
  averageResponseMs: z.number().int().nonnegative(),
});

const sessionCategorySchema = z.object({
  answered: z.number().int().nonnegative(),
  correct: z.number().int().nonnegative(),
  incorrect: z.number().int().nonnegative().optional(),
  timedOut: z.number().int().nonnegative().optional(),
  score: z.number().nonnegative().optional(),
  averageResponseMs: z.number().int().nonnegative().optional(),
});

export const analyticsPayloadSchema = z.object({
  stats: z
    .object({
      totalXp: z.number().int().nonnegative().default(0),
      level: z.number().int().positive().default(1),
      gamesPlayed: z.number().int().nonnegative().default(0),
      correctAttempts: z.number().int().nonnegative().default(0),
      totalAttempts: z.number().int().nonnegative().default(0),
      bestScore: z.number().int().nonnegative().default(0),
      currentStreak: z.number().int().nonnegative().default(0),
      longestStreak: z.number().int().nonnegative().default(0),
      longestCombo: z.number().int().nonnegative().default(0),
    })
    .default({
      totalXp: 0,
      level: 1,
      gamesPlayed: 0,
      correctAttempts: 0,
      totalAttempts: 0,
      bestScore: 0,
      currentStreak: 0,
      longestStreak: 0,
      longestCombo: 0,
    }),
  modeSummary: z
    .object({
      totalGames: z.number().int().nonnegative().default(0),
      arcadeGames: z.number().int().nonnegative().default(0),
      trainingGames: z.number().int().nonnegative().default(0),
      averageArcadeScore: z.number().nonnegative().default(0),
      averageResponseMs: z.number().nonnegative().default(0),
    })
    .default({
      totalGames: 0,
      arcadeGames: 0,
      trainingGames: 0,
      averageArcadeScore: 0,
      averageResponseMs: 0,
    }),
  categories: z.record(z.string(), categoryMetricSchema).default({}),
  sessions: z
    .array(
      z.object({
        id: z.uuid(),
        mode: z.enum(["arcade", "training"]),
        score: z.number().int().nonnegative(),
        questions_completed: z.number().int().nonnegative(),
        correct_count: z.number().int().nonnegative(),
        max_combo: z.number().int().nonnegative(),
        average_response_ms: z.number().int().nonnegative(),
        category_breakdown: z.unknown(),
        xp_earned: z.number().int().nonnegative(),
        activity_date: z.string().nullable(),
        completed_at: z.string(),
      }),
    )
    .default([]),
});

type AnalyticsPayload = z.infer<typeof analyticsPayloadSchema>;

const emptyCategory: CategoryAnalytics = {
  answered: 0,
  correct: 0,
  accuracy: 0,
  averageResponseMs: 0,
};

export function emptyAnalytics(available = true): PlayerAnalytics {
  return {
    available,
    overallAccuracy: 0,
    categories: {
      image: { ...emptyCategory },
      email: { ...emptyCategory },
      voice: { ...emptyCategory },
    },
    totalQuestionsAnswered: 0,
    highestArcadeScore: 0,
    longestCombo: 0,
    averageResponseMs: 0,
    currentLevel: 1,
    totalXp: 0,
    totalGamesPlayed: 0,
    arcadeGamesPlayed: 0,
    trainingGamesPlayed: 0,
    averageArcadeScore: 0,
    strongestCategory: null,
    mostDifficultCategory: null,
    mostPlayedCategory: null,
    currentDailyStreak: 0,
    longestDailyStreak: 0,
    trends: [],
  };
}

function categoryFromPayload(
  payload: AnalyticsPayload,
): Record<CategoryId, CategoryAnalytics> {
  return {
    image: payload.categories.image ?? { ...emptyCategory },
    email: payload.categories.email ?? { ...emptyCategory },
    voice: payload.categories.voice ?? { ...emptyCategory },
  };
}

function rankCategory(
  categories: Record<CategoryId, CategoryAnalytics>,
  selector: (metric: CategoryAnalytics) => number,
  direction: "highest" | "lowest",
): CategoryId | null {
  const played = categoryIds.filter(
    (category) => categories[category].answered > 0,
  );
  if (played.length === 0) return null;

  return played.reduce((best, category) => {
    const candidate = selector(categories[category]);
    const current = selector(categories[best]);
    return direction === "highest"
      ? candidate > current
        ? category
        : best
      : candidate < current
        ? category
        : best;
  });
}

function parseSessionCategories(
  value: unknown,
): Partial<Record<CategoryId, z.infer<typeof sessionCategorySchema>>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const result: Partial<
    Record<CategoryId, z.infer<typeof sessionCategorySchema>>
  > = {};
  for (const category of categoryIds) {
    const parsed = sessionCategorySchema.safeParse(
      (value as Record<string, unknown>)[category],
    );
    if (parsed.success) result[category] = parsed.data;
  }
  return result;
}

function buildTrends(payload: AnalyticsPayload): AnalyticsTrendPoint[] {
  const arcadeScores: number[] = [];

  return payload.sessions.map((session) => {
    if (session.mode === "arcade") arcadeScores.push(session.score);
    const rollingScores = arcadeScores.slice(-5);
    const averageScore =
      rollingScores.length > 0
        ? Math.round(
            rollingScores.reduce((total, score) => total + score, 0) /
              rollingScores.length,
          )
        : null;
    const categories = parseSessionCategories(session.category_breakdown);
    const accuracy = (category: CategoryId): number | null => {
      const metric = categories[category];
      if (!metric || metric.answered === 0) return null;
      return Math.round((metric.correct / metric.answered) * 100);
    };

    return {
      id: session.id,
      date: session.activity_date ?? session.completed_at.slice(0, 10),
      overallAccuracy:
        session.questions_completed === 0
          ? 0
          : Math.round(
              (session.correct_count / session.questions_completed) * 100,
            ),
      imageAccuracy: accuracy("image"),
      emailAccuracy: accuracy("email"),
      voiceAccuracy: accuracy("voice"),
      averageResponseMs: session.average_response_ms,
      averageScore,
      sampleSize: session.questions_completed,
    };
  });
}

export function calculateAnalytics(payload: AnalyticsPayload): PlayerAnalytics {
  const categories = categoryFromPayload(payload);
  const totalAttempts = payload.stats.totalAttempts;

  return {
    available: true,
    overallAccuracy:
      totalAttempts === 0
        ? 0
        : Math.round((payload.stats.correctAttempts / totalAttempts) * 100),
    categories,
    totalQuestionsAnswered: totalAttempts,
    highestArcadeScore: payload.stats.bestScore,
    longestCombo: payload.stats.longestCombo,
    averageResponseMs: Math.round(payload.modeSummary.averageResponseMs),
    currentLevel: payload.stats.level,
    totalXp: payload.stats.totalXp,
    totalGamesPlayed: payload.modeSummary.totalGames,
    arcadeGamesPlayed: payload.modeSummary.arcadeGames,
    trainingGamesPlayed: payload.modeSummary.trainingGames,
    averageArcadeScore: Math.round(payload.modeSummary.averageArcadeScore),
    strongestCategory: rankCategory(
      categories,
      (metric) => metric.accuracy,
      "highest",
    ),
    mostDifficultCategory: rankCategory(
      categories,
      (metric) => metric.accuracy,
      "lowest",
    ),
    mostPlayedCategory: rankCategory(
      categories,
      (metric) => metric.answered,
      "highest",
    ),
    currentDailyStreak: payload.stats.currentStreak,
    longestDailyStreak: payload.stats.longestStreak,
    trends: buildTrends(payload),
  };
}
