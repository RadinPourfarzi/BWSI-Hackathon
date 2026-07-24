import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GameRunSubmission } from "@/features/game/types";
import { persistGameRun } from "@/services/game-persistence";

const mocks = vi.hoisted(() => ({
  in: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        in: mocks.in,
      }),
    }),
    rpc: mocks.rpc,
  }),
}));

const submission: GameRunSubmission = {
  runId: "50000000-0000-4000-8000-000000000001",
  mode: "arcade",
  enabledCategories: ["voice"],
  attempts: [
    {
      sequence: 1,
      challengeId: "50000000-0000-4000-8000-000000000002",
      category: "voice",
      selectedChoice: "option_b",
      correctChoice: "option_b",
      isCorrect: true,
      timedOut: false,
      responseMs: 1_250,
      obtainablePoints: 900,
      awardedPoints: 900,
      comboBefore: 0,
      comboAfter: 1,
      comboMultiplier: 1,
      livesBefore: 3,
      livesAfter: 3,
      questionNumber: 1,
      difficultyStepId: "starter",
      maximumPoints: 1_000,
      plateauMs: 2_000,
      timeLimitMs: 15_000,
      decayAlpha: 1,
      decayBeta: 1.8,
    },
  ],
  summary: {
    runId: "50000000-0000-4000-8000-000000000001",
    mode: "arcade",
    endReason: "lives_depleted",
    score: 900,
    answered: 1,
    correct: 1,
    incorrect: 0,
    timedOut: 0,
    accuracy: 100,
    averageResponseMs: 1_250,
    fastestResponseMs: 1_250,
    slowestResponseMs: 1_250,
    longestCombo: 1,
    livesRemaining: 0,
    xpEarned: 10,
    categoryBreakdown: {},
  },
};

describe("game persistence compatibility", () => {
  beforeEach(() => {
    mocks.in.mockReset();
    mocks.rpc.mockReset();
    mocks.in.mockResolvedValue({
      data: [{ id: "50000000-0000-4000-8000-000000000002" }],
      error: null,
    });
  });

  it("uses the current persistence RPC when it is available", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: {
        sessionId: "50000000-0000-4000-8000-000000000003",
        score: 900,
        xpEarned: 10,
        currentStreak: 2,
        isNewHighScore: true,
        duplicate: false,
      },
      error: null,
    });

    await expect(persistGameRun(submission)).resolves.toMatchObject({
      score: 900,
      xpEarned: 10,
      currentStreak: 2,
    });
    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.rpc.mock.calls[0]?.[0]).toBe("finalize_game_run_v2");
  });

  it("falls back to legacy submit_run and translates voice to audio", async () => {
    mocks.rpc
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: "PGRST202",
          message: "Could not find finalize_game_run_v2 in the schema cache",
        },
      })
      .mockResolvedValueOnce({
        data: {
          session_id: "50000000-0000-4000-8000-000000000004",
          final_score: 875,
          xp_awarded: 12,
          daily_streak: 3,
          max_combo: 1,
          questions_answered: 1,
          total_xp: 120,
          level: 2,
        },
        error: null,
      });

    await expect(persistGameRun(submission)).resolves.toEqual({
      sessionId: "50000000-0000-4000-8000-000000000004",
      score: 875,
      xpEarned: 12,
      currentStreak: 3,
      isNewHighScore: false,
      duplicate: false,
    });
    expect(mocks.rpc).toHaveBeenNthCalledWith(
      2,
      "submit_run",
      expect.objectContaining({
        p_mode: "ARCADE",
        p_categories: ["audio"],
        p_attempts: [
          expect.objectContaining({
            category_id: "audio",
            question_index: 1,
            combo_at_answer: 1,
          }),
        ],
      }),
    );
  });
});
