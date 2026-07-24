import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { CategoryId } from '@/types/models';

type DB = SupabaseClient<Database>;

export interface UserStats {
  totalAttempts: number;
  correct: number;
  accuracyPct: number;
  avgResponseMs: number;
  bestScore: number;
  longestCombo: number;
  gamesArcade: number;
  gamesTraining: number;
}

export interface CategoryStat {
  categoryId: CategoryId;
  attempts: number;
  accuracyPct: number;
  avgSpeedMs: number;
}

export interface DailyTrend {
  day: string;
  accuracyPct: number;
  avgSpeedMs: number;
}

export async function fetchUserStats(supabase: DB): Promise<UserStats> {
  const { data, error } = await supabase.rpc('get_user_stats');
  if (error) {
    throw new Error(`get_user_stats failed: ${error.message}`);
  }
  return data as unknown as UserStats;
}

export async function fetchCategoryStats(supabase: DB): Promise<CategoryStat[]> {
  const { data, error } = await supabase.rpc('get_category_stats');
  if (error) {
    throw new Error(`get_category_stats failed: ${error.message}`);
  }
  return (data ?? []).map((r) => ({
    categoryId: r.category_id as CategoryId,
    attempts: Number(r.attempts),
    accuracyPct: Number(r.accuracy_pct ?? 0),
    avgSpeedMs: Number(r.avg_speed_ms ?? 0),
  }));
}

export async function fetchDailyTrends(supabase: DB): Promise<DailyTrend[]> {
  const { data, error } = await supabase.rpc('get_daily_trends');
  if (error) {
    throw new Error(`get_daily_trends failed: ${error.message}`);
  }
  return (data ?? []).map((r) => ({
    day: r.day,
    accuracyPct: Number(r.accuracy_pct ?? 0),
    avgSpeedMs: Number(r.avg_speed_ms ?? 0),
  }));
}

/** Coarse skill label from accuracy, for the performance matrix. */
export function skillRating(accuracyPct: number): string {
  if (accuracyPct >= 80) return 'Strong';
  if (accuracyPct >= 65) return 'Moderate';
  return 'Needs improvement';
}
