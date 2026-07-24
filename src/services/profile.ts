import type { User } from "@supabase/supabase-js";

import { levelFromXp } from "@/config/xp";
import type { ShellProfile } from "@/features/profile/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getShellProfile(user: User): Promise<ShellProfile> {
  const supabase = await createServerSupabaseClient();
  const fallbackName =
    typeof user.user_metadata.display_name === "string"
      ? user.user_metadata.display_name
      : (user.email?.split("@")[0] ?? "Player");

  if (!supabase) {
    return {
      displayName: fallbackName,
      email: user.email ?? "",
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

  const [profileResult, statsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_stats")
      .select(
        "total_xp, level, games_played, correct_attempts, total_attempts, best_score, current_streak, longest_streak, category_accuracy",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const stats = statsResult.data;
  const totalXp = stats?.total_xp ?? 0;
  const totalAttempts = stats?.total_attempts ?? 0;
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
    email: user.email ?? "",
    level: stats?.level ?? levelFromXp(totalXp),
    totalXp,
    currentStreak: stats?.current_streak ?? 0,
    longestStreak: stats?.longest_streak ?? 0,
    gamesPlayed: stats?.games_played ?? 0,
    accuracy:
      totalAttempts > 0
        ? Math.round(((stats?.correct_attempts ?? 0) / totalAttempts) * 100)
        : 0,
    bestScore: stats?.best_score ?? 0,
    categoryAccuracy,
  };
}
