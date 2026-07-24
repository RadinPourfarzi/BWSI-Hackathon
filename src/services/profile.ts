import type { User } from "@supabase/supabase-js";
import { cache } from "react";

import { levelFromXp } from "@/config/xp";
import type {
  PlayerProfile,
  RecentActivity,
  ShellProfile,
} from "@/features/profile/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const getCachedShellProfile = cache(
  async (
    userId: string,
    fallbackName: string,
    email: string,
  ): Promise<ShellProfile> => {
    const supabase = await createServerSupabaseClient();

    if (!supabase) {
      return {
        displayName: fallbackName,
        email,
        level: 1,
        totalXp: 0,
        currentStreak: 0,
        longestStreak: 0,
        gamesPlayed: 0,
        accuracy: 0,
        bestScore: 0,
        categoryAccuracy: {},
      };
    }

    const [profileResult, statsResult, settingsResult, latestStreakResult] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("display_name")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("user_stats")
          .select(
            "total_xp, level, games_played, correct_attempts, total_attempts, best_score, current_streak, longest_streak, category_accuracy",
          )
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("user_settings")
          .select("timezone_offset_minutes")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("daily_streaks")
          .select("activity_date")
          .eq("user_id", userId)
          .order("activity_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    const stats = statsResult.data;
    const totalXp = stats?.total_xp ?? 0;
    const totalAttempts = stats?.total_attempts ?? 0;
    const timezoneOffset = settingsResult.data?.timezone_offset_minutes ?? 0;
    const localNow = new Date(Date.now() - timezoneOffset * 60_000);
    const localToday = localNow.toISOString().slice(0, 10);
    localNow.setUTCDate(localNow.getUTCDate() - 1);
    const localYesterday = localNow.toISOString().slice(0, 10);
    const latestActivity = latestStreakResult.data?.activity_date ?? null;
    const effectiveCurrentStreak =
      latestActivity === localToday || latestActivity === localYesterday
        ? (stats?.current_streak ?? 0)
        : 0;
    const categoryAccuracy =
      stats?.category_accuracy &&
      typeof stats.category_accuracy === "object" &&
      !Array.isArray(stats.category_accuracy)
        ? Object.fromEntries(
            Object.entries(stats.category_accuracy)
              .filter(
                (entry): entry is [string, number] =>
                  typeof entry[1] === "number",
              )
              .map(([key, value]) => [key, value]),
          )
        : {};

    return {
      displayName: profileResult.data?.display_name ?? fallbackName,
      email,
      level: stats?.level ?? levelFromXp(totalXp),
      totalXp,
      currentStreak: effectiveCurrentStreak,
      longestStreak: stats?.longest_streak ?? 0,
      gamesPlayed: stats?.games_played ?? 0,
      accuracy:
        totalAttempts > 0
          ? Math.round(((stats?.correct_attempts ?? 0) / totalAttempts) * 100)
          : 0,
      bestScore: stats?.best_score ?? 0,
      categoryAccuracy,
    };
  },
);

export function getShellProfile(user: User): Promise<ShellProfile> {
  const fallbackName =
    typeof user.user_metadata.display_name === "string"
      ? user.user_metadata.display_name
      : (user.email?.split("@")[0] ?? "Player");

  return getCachedShellProfile(user.id, fallbackName, user.email ?? "");
}

export async function getPlayerProfile(user: User): Promise<PlayerProfile> {
  const shell = await getShellProfile(user);
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      ...shell,
      joinDate: user.created_at ?? null,
      strongestCategory: null,
      recentActivity: [],
    };
  }

  const [profileResult, activityResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("created_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("game_sessions")
      .select(
        "id, mode, score, xp_earned, correct_count, questions_completed, completed_at",
      )
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(8),
  ]);

  const recentActivity: RecentActivity[] = (activityResult.data ?? [])
    .filter(
      (
        session,
      ): session is typeof session & {
        completed_at: string;
      } => session.completed_at !== null,
    )
    .map((session) => ({
      id: session.id,
      mode: session.mode,
      score: session.score,
      xpEarned: session.xp_earned,
      correct: session.correct_count,
      answered: session.questions_completed,
      completedAt: session.completed_at,
    }));
  const categoryEntries = Object.entries(shell.categoryAccuracy).filter(
    ([, accuracy]) => Number.isFinite(accuracy),
  );
  const strongestCategory =
    categoryEntries.length === 0
      ? null
      : categoryEntries.reduce((best, entry) =>
          entry[1] > best[1] ? entry : best,
        )[0];

  return {
    ...shell,
    joinDate: profileResult.data?.created_at ?? user.created_at ?? null,
    strongestCategory,
    recentActivity,
  };
}
