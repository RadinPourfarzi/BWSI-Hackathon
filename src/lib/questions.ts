import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ActiveGameConfig,
  AttemptRecord,
  CategoryId,
  GameMode,
  Question,
  QuestionMetadata,
  RunResult,
} from '@/types/models';
import type { Database } from '@/types/database.types';
import { mapQuestion } from '@/lib/mappers';

type DB = SupabaseClient<Database>;

/** Fetch the server-authoritative gameplay config (balance + merged categories). */
export async function fetchActiveConfig(supabase: DB): Promise<ActiveGameConfig> {
  const { data, error } = await supabase.rpc('get_active_config');
  if (error) {
    throw new Error(`get_active_config failed: ${error.message}`);
  }
  if (!data) {
    throw new Error('No active game config');
  }
  return data as unknown as ActiveGameConfig;
}

/**
 * Fetch a randomized batch of questions for the enabled categories, excluding ids already
 * loaded in the client. Uses the server-side `sample_questions` RPC (random ordering).
 */
export async function fetchQuestionBatch(
  supabase: DB,
  params: { categories: CategoryId[]; limit: number; excludeIds?: string[] },
): Promise<Question[]> {
  const { data, error } = await supabase.rpc('sample_questions', {
    p_categories: params.categories,
    p_limit: params.limit,
    p_exclude: params.excludeIds ?? [],
  });
  if (error) {
    throw new Error(`sample_questions failed: ${error.message}`);
  }
  return (data ?? []).map((row) =>
    mapQuestion({
      id: row.id,
      category_id: row.category_id as CategoryId,
      media_url: row.media_url,
      is_ai: row.is_ai,
      difficulty_rating: row.difficulty_rating as Question['difficultyRating'],
      explanation_text: row.explanation_text,
      metadata: row.metadata as unknown as QuestionMetadata,
    }),
  );
}

/**
 * Submit a completed run. Sends only raw per-attempt facts; the server recomputes and
 * returns the authoritative score/XP/level/streak.
 */
export async function submitRun(
  supabase: DB,
  submission: { mode: GameMode; categoriesPlayed: CategoryId[]; attempts: AttemptRecord[] },
): Promise<RunResult> {
  const p_attempts = submission.attempts.map((a) => ({
    question_id: a.questionId,
    category_id: a.categoryId,
    question_index: a.questionIndex,
    is_correct: a.isCorrect,
    response_time_ms: a.responseTimeMs,
    combo_at_answer: a.comboAtAnswer,
  }));

  const { data, error } = await supabase.rpc('submit_run', {
    p_mode: submission.mode,
    p_categories: submission.categoriesPlayed,
    p_attempts:
      p_attempts as unknown as Database['public']['Functions']['submit_run']['Args']['p_attempts'],
  });
  if (error) {
    throw new Error(`submit_run failed: ${error.message}`);
  }

  const r = data as {
    session_id: string;
    final_score: number;
    max_combo: number;
    questions_answered: number;
    xp_awarded: number;
    total_xp: number;
    level: number;
    daily_streak: number;
  };
  return {
    sessionId: r.session_id,
    finalScore: r.final_score,
    maxCombo: r.max_combo,
    questionsAnswered: r.questions_answered,
    xpAwarded: r.xp_awarded,
    totalXp: r.total_xp,
    level: r.level,
    dailyStreak: r.daily_streak,
  };
}
