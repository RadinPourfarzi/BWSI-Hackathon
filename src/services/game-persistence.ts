"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type {
  GameRunSubmission,
  PersistedGameResult,
} from "@/features/game/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database";
import type { LegacyDatabase } from "@/types/legacy-database";

const persistenceResultSchema = z.object({
  sessionId: z.uuid(),
  score: z.number().int().nonnegative(),
  xpEarned: z.number().int().nonnegative(),
  currentStreak: z.number().int().nonnegative(),
  isNewHighScore: z.boolean(),
  duplicate: z.boolean(),
});

const legacyPersistenceResultSchema = z.object({
  session_id: z.uuid(),
  final_score: z.number().int().nonnegative(),
  xp_awarded: z.number().int().nonnegative(),
  daily_streak: z.number().int().nonnegative(),
});

function legacyCategory(category: string): string {
  return category === "voice" ? "audio" : category;
}

function isMissingModernPersistenceFunction(error: {
  code?: string;
  message?: string;
}): boolean {
  const message = error.message?.toLowerCase() ?? "";

  return (
    error.code === "PGRST202" ||
    error.code === "42883" ||
    (message.includes("finalize_game_run_v2") &&
      (message.includes("could not find") ||
        message.includes("does not exist") ||
        message.includes("schema cache")))
  );
}

async function persistLegacyGameRun(
  supabase: SupabaseClient<LegacyDatabase>,
  submission: GameRunSubmission,
): Promise<PersistedGameResult> {
  const questionIds = Array.from(
    new Set(submission.attempts.map((attempt) => attempt.challengeId)),
  );
  const questionResult = await supabase
    .from("questions")
    .select("id")
    .in("id", questionIds);

  if (questionResult.error) {
    throw new Error(
      "Progress could not be saved. Check your connection and retry.",
    );
  }

  const knownQuestionIds = new Set(
    (questionResult.data ?? []).map((question) => question.id),
  );
  const compatibleAttempts = submission.attempts.filter((attempt) =>
    knownQuestionIds.has(attempt.challengeId),
  );

  if (compatibleAttempts.length === 0) {
    throw new Error(
      "This run used fallback challenges that are not installed in the connected database, so account progress could not be saved.",
    );
  }

  const attempts: Json = compatibleAttempts.map((attempt) => ({
    question_id: attempt.challengeId,
    category_id: legacyCategory(attempt.category),
    question_index: attempt.questionNumber,
    is_correct: attempt.isCorrect,
    response_time_ms: attempt.responseMs,
    combo_at_answer: attempt.comboAfter,
  }));
  const categories = Array.from(
    new Set(
      compatibleAttempts.map((attempt) => legacyCategory(attempt.category)),
    ),
  );
  const { data, error } = await supabase.rpc("submit_run", {
    p_mode: submission.mode.toUpperCase(),
    p_categories: categories,
    p_attempts: attempts,
  });

  if (error) {
    throw new Error(
      "Progress could not be saved. Check your connection and retry.",
    );
  }

  const parsed = legacyPersistenceResultSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Progress was received, but its confirmation was invalid.");
  }

  return {
    sessionId: parsed.data.session_id,
    score: parsed.data.final_score,
    xpEarned: parsed.data.xp_awarded,
    currentStreak: parsed.data.daily_streak,
    isNewHighScore: false,
    duplicate: false,
  };
}

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
  const { data, error } = await supabase.rpc("finalize_game_run_v2", {
    p_run_id: submission.runId,
    p_mode: submission.mode,
    p_enabled_categories: submission.enabledCategories,
    p_attempts: attempts,
    p_summary: summary,
    p_timezone_offset_minutes: new Date().getTimezoneOffset(),
  });

  if (error) {
    if (isMissingModernPersistenceFunction(error)) {
      return persistLegacyGameRun(
        supabase as unknown as SupabaseClient<LegacyDatabase>,
        submission,
      );
    }

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
