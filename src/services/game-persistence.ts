"use client";

import { z } from "zod";

import type {
  GameRunSubmission,
  PersistedGameResult,
} from "@/features/game/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database";

const persistenceResultSchema = z.object({
  sessionId: z.uuid(),
  score: z.number().int().nonnegative(),
  xpEarned: z.number().int().nonnegative(),
  currentStreak: z.number().int().nonnegative(),
  isNewHighScore: z.boolean(),
  duplicate: z.boolean(),
});

export async function persistGameRun(
  submission: GameRunSubmission,
): Promise<PersistedGameResult> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    throw new Error(
      "Progress saving is unavailable until Supabase is configured.",
    );
  }

  const attempts: Json = submission.attempts.map((attempt) => ({
    sequence: attempt.sequence,
    challengeId: attempt.challengeId,
    category: attempt.category,
    selectedChoice: attempt.selectedChoice,
    timedOut: attempt.timedOut,
    responseMs: attempt.responseMs,
    obtainablePoints: attempt.obtainablePoints,
    awardedPoints: attempt.awardedPoints,
    comboBefore: attempt.comboBefore,
    comboAfter: attempt.comboAfter,
    comboMultiplier: attempt.comboMultiplier,
    difficultyStepId: attempt.difficultyStepId,
    maximumPoints: attempt.maximumPoints,
    plateauMs: attempt.plateauMs,
    timeLimitMs: attempt.timeLimitMs,
    decayAlpha: attempt.decayAlpha,
    decayBeta: attempt.decayBeta,
  }));
  const summary: Json = {
    endReason: submission.summary.endReason,
    clientScore: submission.summary.score,
    clientXp: submission.summary.xpEarned,
    longestCombo: submission.summary.longestCombo,
    averageResponseMs: submission.summary.averageResponseMs,
    categoryBreakdown: submission.summary.categoryBreakdown as Json,
  };
  const { data, error } = await supabase.rpc("finalize_game_run", {
    p_run_id: submission.runId,
    p_mode: submission.mode,
    p_enabled_categories: submission.enabledCategories,
    p_attempts: attempts,
    p_summary: summary,
  });

  if (error) {
    throw new Error(
      "Progress could not be saved. Check your connection and retry.",
    );
  }

  const parsed = persistenceResultSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Progress was received, but its confirmation was invalid.");
  }

  return parsed.data;
}
