import { describe, expect, it } from "vitest";

import {
  analyticsPayloadSchema,
  calculateAnalytics,
} from "@/features/analytics/calculations";

describe("analytics calculations", () => {
  it("derives category leaders and bounded session trends", () => {
    const payload = analyticsPayloadSchema.parse({
      stats: {
        totalXp: 840,
        level: 3,
        gamesPlayed: 2,
        correctAttempts: 7,
        totalAttempts: 10,
        bestScore: 4200,
        currentStreak: 2,
        longestStreak: 4,
        longestCombo: 5,
      },
      modeSummary: {
        totalGames: 2,
        arcadeGames: 1,
        trainingGames: 1,
        averageArcadeScore: 4200,
        averageResponseMs: 2100,
      },
      categories: {
        image: {
          answered: 5,
          correct: 4,
          accuracy: 80,
          averageResponseMs: 2000,
        },
        email: {
          answered: 3,
          correct: 1,
          accuracy: 33.33,
          averageResponseMs: 3000,
        },
        voice: {
          answered: 2,
          correct: 2,
          accuracy: 100,
          averageResponseMs: 1500,
        },
      },
      sessions: [
        {
          id: "20000000-0000-4000-8000-000000000001",
          mode: "arcade",
          score: 4200,
          questions_completed: 5,
          correct_count: 4,
          max_combo: 4,
          average_response_ms: 2000,
          category_breakdown: {
            image: { answered: 5, correct: 4 },
          },
          xp_earned: 200,
          activity_date: "2026-07-23",
          completed_at: "2026-07-23T18:00:00Z",
        },
      ],
    });

    const analytics = calculateAnalytics(payload);
    expect(analytics.overallAccuracy).toBe(70);
    expect(analytics.strongestCategory).toBe("voice");
    expect(analytics.mostDifficultCategory).toBe("email");
    expect(analytics.mostPlayedCategory).toBe("image");
    expect(analytics.trends[0]?.imageAccuracy).toBe(80);
    expect(analytics.averageArcadeScore).toBe(4200);
  });
});
