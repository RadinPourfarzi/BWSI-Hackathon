import type { SupabaseClient } from "@supabase/supabase-js";
import { GameError } from "@/server/errors/game.errors";
import type {
  CompletedGame,
  CompletionResult,
  GameRepository,
  QuestionQuery,
} from "@/server/repositories/game.repository";
import type {
  ActiveGameConfig,
  Profile,
  QuestionRecord,
} from "@/shared/types/game.types";
import type {
  LeaderboardEntry,
  PlayerAnalytics,
} from "@/shared/contracts/game.contracts";
import type { ProfileRow, QuestionRow } from "@/database/supabase/database.types";
import { mapProfileRow, mapQuestionRow } from "@/database/supabase/mappers";
import { activeGameConfigSchema } from "@/shared/schemas/game.schemas";

interface CompletionRpcResult {
  profile: ProfileRow;
  previous_level: number;
}

interface AnalyticsRow {
  category_id: "image" | "email" | "audio";
  is_correct: boolean;
  response_time_ms: number;
}

interface SessionScoreRow {
  final_score: number;
}

interface LeaderboardRow {
  user_id: string;
  username: string;
  score: number;
  rank: number;
}

function databaseError(operation: string, message: string): GameError {
  return new GameError(
    `Database ${operation} failed: ${message}`,
    "SERVICE_UNAVAILABLE",
    503,
  );
}

/**
 * Production repository. It uses a server-only service-role client because
 * answers and authoritative progression fields must never be browser-writable.
 */
export class SupabaseGameRepository implements GameRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getActiveConfig(): Promise<ActiveGameConfig> {
    const { data, error } = await this.client.rpc("get_active_config");
    if (error) {
      throw databaseError("config read", error.message);
    }
    return activeGameConfigSchema.parse(data);
  }

  async listQuestions(query: QuestionQuery): Promise<QuestionRecord[]> {
    let request = this.client
      .from("questions")
      .select(
        "id, category_id, media_url, is_ai, difficulty_rating, explanation_text, metadata, is_active, created_at",
      )
      .eq("is_active", true)
      .in("category_id", query.categories)
      .limit(500);

    if (query.excludeIds.length > 0) {
      request = request.not("id", "in", `(${query.excludeIds.join(",")})`);
    }

    const { data, error } = await request;
    if (error) {
      throw databaseError("question read", error.message);
    }
    return ((data ?? []) as QuestionRow[]).map(mapQuestionRow);
  }

  async getQuestion(questionId: string): Promise<QuestionRecord | null> {
    const { data, error } = await this.client
      .from("questions")
      .select(
        "id, category_id, media_url, is_ai, difficulty_rating, explanation_text, metadata, is_active, created_at",
      )
      .eq("id", questionId)
      .maybeSingle();

    if (error) {
      throw databaseError("question read", error.message);
    }
    return data ? mapQuestionRow(data as QuestionRow) : null;
  }

  async completeGame(
    game: CompletedGame,
    _config: ActiveGameConfig,
  ): Promise<CompletionResult> {
    void _config;
    const averageResponseTimeMs =
      game.attempts.length === 0
        ? 0
        : Math.round(
            game.attempts.reduce(
              (total, attempt) => total + attempt.responseTimeMs,
              0,
            ) / game.attempts.length,
          );
    const { data, error } = await this.client.rpc("persist_completed_game", {
      p_session: {
        id: game.summary.sessionId,
        user_id: game.userId,
        mode: game.summary.mode,
        status: game.status,
        final_score: game.summary.finalScore,
        max_combo: game.summary.highestCombo,
        questions_answered: game.summary.questionsAnswered,
        correct_count: game.summary.correctAnswers,
        incorrect_count: game.summary.incorrectAnswers,
        average_response_time_ms: averageResponseTimeMs,
        xp_awarded: game.summary.xpAwarded,
        categories_played: game.categoriesPlayed,
        started_at: game.summary.startedAt,
        ended_at: game.summary.endedAt,
      },
      p_attempts: game.attempts.map((attempt) => ({
        question_id: attempt.questionId,
        category_id: attempt.categoryId,
        question_index: attempt.questionIndex,
        selected_answer: attempt.selectedAnswer,
        is_correct: attempt.isCorrect,
        response_time_ms: attempt.responseTimeMs,
        points_awarded: attempt.pointsAwarded,
        combo_at_answer: attempt.comboAtAnswer,
        answered_at: attempt.answeredAt,
      })),
    });

    if (error) {
      throw databaseError("game completion", error.message);
    }
    const result = data as CompletionRpcResult;
    return {
      profile: mapProfileRow(result.profile),
      previousLevel: result.previous_level,
    };
  }

  async getProfile(userId: string): Promise<Profile> {
    const { data, error } = await this.client
      .from("profiles")
      .select(
        "id, username, total_xp, current_level, daily_streak, last_played_at, created_at, updated_at",
      )
      .eq("id", userId)
      .single();

    if (error) {
      throw databaseError("profile read", error.message);
    }
    return mapProfileRow(data as ProfileRow);
  }

  async getAnalytics(userId: string): Promise<PlayerAnalytics> {
    const [attemptResult, scoreResult, rankResult] = await Promise.all([
      this.client
        .from("question_attempts")
        .select("category_id, is_correct, response_time_ms")
        .eq("user_id", userId),
      this.client
        .from("game_sessions")
        .select("final_score")
        .eq("user_id", userId)
        .eq("mode", "ARCADE")
        .eq("status", "completed"),
      this.client
        .from("leaderboard")
        .select("rank")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    const firstError = attemptResult.error ?? scoreResult.error ?? rankResult.error;
    if (firstError) {
      throw databaseError("analytics read", firstError.message);
    }

    const attempts = (attemptResult.data ?? []) as AnalyticsRow[];
    const scores = (scoreResult.data ?? []) as SessionScoreRow[];
    const correct = attempts.filter((attempt) => attempt.is_correct).length;
    const responseTimeTotal = attempts.reduce(
      (total, attempt) => total + attempt.response_time_ms,
      0,
    );
    const categories = ["image", "email", "audio"] as const;
    const byCategory = categories
      .map((categoryId) => {
        const categoryAttempts = attempts.filter(
          (attempt) => attempt.category_id === categoryId,
        );
        const categoryCorrect = categoryAttempts.filter(
          (attempt) => attempt.is_correct,
        ).length;
        return {
          categoryId,
          attempts: categoryAttempts.length,
          correct: categoryCorrect,
          accuracyPercent:
            categoryAttempts.length === 0
              ? 0
              : (categoryCorrect / categoryAttempts.length) * 100,
          averageResponseTimeMs:
            categoryAttempts.length === 0
              ? 0
              : categoryAttempts.reduce(
                  (total, attempt) => total + attempt.response_time_ms,
                  0,
                ) / categoryAttempts.length,
        };
      })
      .filter((category) => category.attempts > 0);
    const rankedCategories = [...byCategory].sort(
      (left, right) => right.accuracyPercent - left.accuracyPercent,
    );
    const scoreValues = scores.map((score) => score.final_score);

    return {
      attempts: attempts.length,
      correct,
      accuracyPercent: attempts.length === 0 ? 0 : (correct / attempts.length) * 100,
      averageResponseTimeMs:
        attempts.length === 0 ? 0 : responseTimeTotal / attempts.length,
      averageArcadeScore:
        scoreValues.length === 0
          ? 0
          : scoreValues.reduce((total, score) => total + score, 0) / scoreValues.length,
      bestArcadeScore: scoreValues.length === 0 ? 0 : Math.max(...scoreValues),
      leaderboardRank: (rankResult.data as { rank?: number } | null)?.rank ?? null,
      strongestCategory: rankedCategories.at(0)?.categoryId ?? null,
      weakestCategory: rankedCategories.at(-1)?.categoryId ?? null,
      byCategory,
    };
  }

  async getLeaderboard(limit: number): Promise<LeaderboardEntry[]> {
    const { data, error } = await this.client
      .from("leaderboard")
      .select("user_id, username, score, rank")
      .order("rank", { ascending: true })
      .limit(limit);

    if (error) {
      throw databaseError("leaderboard read", error.message);
    }

    return ((data ?? []) as LeaderboardRow[]).map((entry) => ({
      userId: entry.user_id,
      username: entry.username,
      score: entry.score,
      rank: entry.rank,
    }));
  }
}
