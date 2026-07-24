import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AccuracyTrendPoint,
  CategoryAnalytics,
  LeaderboardEntry,
  PlayerAnalytics,
} from '@/shared/contracts/game.contracts';
import { activeGameConfigSchema } from '@/shared/schemas/game.schemas';
import type {
  ActiveGameConfig,
  CategoryId,
  PlayerProfile,
  QuestionRecord,
} from '@/shared/types/game.types';
import { GameError } from '@/server/errors/game.errors';
import type {
  CompletedGame,
  CompletionResult,
  GameRepository,
  QuestionQuery,
} from '@/server/repositories/game.repository';
import type {
  AttemptAnalyticsRow,
  CompletionRpcRow,
  GameSessionRow,
  LeaderboardRow,
  ProfileRow,
  QuestionRow,
} from '@/database/supabase/database.types';
import {
  mapCompletionRpcRow,
  mapProfileRow,
  mapQuestionRow,
  mapSessionRow,
} from '@/database/supabase/mappers';

function databaseError(operation: string, message: string): GameError {
  return new GameError(
    `Database ${operation} failed: ${message}`,
    'SERVICE_UNAVAILABLE',
    503,
  );
}

export class SupabaseGameRepository implements GameRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getActiveConfig(): Promise<ActiveGameConfig> {
    const { data, error } = await this.client.rpc('get_active_config');
    if (error) {
      throw databaseError('config read', error.message);
    }
    return activeGameConfigSchema.parse(data);
  }

  async listQuestions(query: QuestionQuery): Promise<QuestionRecord[]> {
    let request = this.client
      .from('questions')
      .select(
        'id, category_id, media_url, is_ai, difficulty_rating, explanation_text, metadata, is_active',
      )
      .eq('is_active', true)
      .in('category_id', query.categories)
      .limit(Math.min(query.limit + query.excludeIds.length, 500));

    if (query.excludeIds.length > 0) {
      request = request.not('id', 'in', `(${query.excludeIds.join(',')})`);
    }

    const { data, error } = await request;
    if (error) {
      throw databaseError('question read', error.message);
    }
    return ((data ?? []) as QuestionRow[])
      .slice(0, query.limit)
      .map((row) => mapQuestionRow(row, query.config));
  }

  async completeGame(
    game: CompletedGame,
    config: ActiveGameConfig,
  ): Promise<CompletionResult> {
    void config;
    const { data, error } = await this.client.rpc('persist_completed_game', {
      p_session_id: game.summary.sessionId,
    });
    if (error) {
      throw databaseError('game completion', error.message);
    }
    return mapCompletionRpcRow(data as CompletionRpcRow);
  }

  async getCompletedGame(
    sessionId: string,
    userId: string,
  ): Promise<CompletionResult | null> {
    const sessionResult = await this.client
      .from('game_sessions')
      .select(
        'id, user_id, mode, status, end_reason, config_version, final_score, xp_earned, correct_count, incorrect_count, highest_combo, questions_answered, average_response_time_ms, categories_played, started_at, ended_at, created_at',
      )
      .eq('id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();
    if (sessionResult.error) {
      throw databaseError('completed session read', sessionResult.error.message);
    }
    if (!sessionResult.data) {
      return null;
    }

    const profile = await this.getProfile(userId);
    return {
      summary: mapSessionRow(sessionResult.data as GameSessionRow),
      profile,
      previousLevel: profile.level,
      previousHighestScore: profile.highestScore,
    };
  }

  async getProfile(userId: string): Promise<PlayerProfile> {
    const { data, error } = await this.client
      .from('profiles')
      .select(
        'id, username, total_xp, current_level, highest_score, longest_combo, daily_streak, longest_streak, last_played_at, games_played, arcade_games_played, training_games_played, created_at, updated_at',
      )
      .eq('id', userId)
      .single();
    if (error) {
      throw databaseError('profile read', error.message);
    }
    return mapProfileRow(data as ProfileRow);
  }

  async getAnalytics(userId: string): Promise<PlayerAnalytics> {
    const [attemptResult, scoreResult, rankResult, profile] = await Promise.all([
      this.client
        .from('question_attempts')
        .select('category_id, was_correct, response_time_ms, answered_at')
        .eq('user_id', userId),
      this.client
        .from('game_sessions')
        .select('final_score')
        .eq('user_id', userId)
        .eq('mode', 'ARCADE'),
      this.client
        .from('leaderboard')
        .select('rank')
        .eq('user_id', userId)
        .maybeSingle(),
      this.getProfile(userId),
    ]);

    const firstError = attemptResult.error ?? scoreResult.error ?? rankResult.error;
    if (firstError) {
      throw databaseError('analytics read', firstError.message);
    }

    const attempts = (attemptResult.data ?? []) as AttemptAnalyticsRow[];
    const scores = (scoreResult.data ?? []) as { final_score: number }[];
    const correct = attempts.filter((attempt) => attempt.was_correct).length;
    const byCategory = aggregateCategories(attempts);
    const ranked = [...byCategory].sort(
      (left, right) => right.accuracyPercent - left.accuracyPercent,
    );
    const scoreValues = scores.map((score) => score.final_score);

    return {
      attempts: attempts.length,
      correct,
      accuracyPercent: percent(correct, attempts.length),
      averageResponseTimeMs: average(
        attempts.map((attempt) => attempt.response_time_ms),
      ),
      averageArcadeScore: average(scoreValues),
      bestArcadeScore: scoreValues.length === 0 ? 0 : Math.max(...scoreValues),
      longestCombo: profile.longestCombo,
      leaderboardRank: (rankResult.data as { rank?: number } | null)?.rank ?? null,
      strongestCategory: ranked.at(0)?.categoryId ?? null,
      weakestCategory: ranked.length > 1 ? (ranked.at(-1)?.categoryId ?? null) : null,
      byCategory,
      accuracyTrend: aggregateTrend(attempts),
    };
  }

  async getLeaderboard(limit: number): Promise<LeaderboardEntry[]> {
    const { data, error } = await this.client
      .from('leaderboard')
      .select('user_id, display_name, highest_score, current_level, rank')
      .order('rank', { ascending: true })
      .limit(limit);
    if (error) {
      throw databaseError('leaderboard read', error.message);
    }
    return ((data ?? []) as LeaderboardRow[]).map((entry) => ({
      rank: entry.rank,
      userId: entry.user_id,
      displayName: entry.display_name,
      highestScore: entry.highest_score,
      level: entry.current_level,
    }));
  }
}

function aggregateCategories(attempts: AttemptAnalyticsRow[]): CategoryAnalytics[] {
  const categories: CategoryId[] = ['image', 'email', 'audio'];
  return categories
    .map((categoryId) => {
      const matches = attempts.filter((attempt) => attempt.category_id === categoryId);
      const correct = matches.filter((attempt) => attempt.was_correct).length;
      return {
        categoryId,
        attempts: matches.length,
        correct,
        accuracyPercent: percent(correct, matches.length),
        averageResponseTimeMs: average(
          matches.map((attempt) => attempt.response_time_ms),
        ),
      };
    })
    .filter((category) => category.attempts > 0);
}

function aggregateTrend(attempts: AttemptAnalyticsRow[]): AccuracyTrendPoint[] {
  const days = new Map<string, { attempts: number; correct: number }>();
  for (const attempt of attempts) {
    const day = attempt.answered_at.slice(0, 10);
    const bucket = days.get(day) ?? { attempts: 0, correct: 0 };
    bucket.attempts += 1;
    bucket.correct += attempt.was_correct ? 1 : 0;
    days.set(day, bucket);
  }
  return [...days.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, bucket]) => ({
      date,
      accuracyPercent: percent(bucket.correct, bucket.attempts),
    }));
}

function percent(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1_000) / 10;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}
