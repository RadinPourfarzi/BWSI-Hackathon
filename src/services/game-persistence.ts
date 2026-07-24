"use client";

import type { AttemptResolution } from "@/features/game/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export async function persistAttempt(
  sessionId: string,
  resolution: AttemptResolution,
): Promise<string | null> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return "Supabase is not configured.";

  const { error } = await supabase.rpc("record_attempt", {
    p_session_id: sessionId,
    p_challenge_id: resolution.challengeId,
    p_selected_choice: resolution.selectedChoice,
    p_response_ms: resolution.responseMs,
    p_obtainable_points: resolution.obtainablePoints,
    p_awarded_points: resolution.awardedPoints,
    p_combo_before: resolution.comboBefore,
    p_combo_after: resolution.comboAfter,
  });

  return error?.message ?? null;
}

export async function completeGameSession(
  sessionId: string,
): Promise<string | null> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return "Supabase is not configured.";

  const { error } = await supabase.rpc("complete_game_session", {
    p_session_id: sessionId,
  });

  return error?.message ?? null;
}
