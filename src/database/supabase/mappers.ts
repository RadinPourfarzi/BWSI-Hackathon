import type { Profile, QuestionRecord } from "@/shared/types/game.types";
import type { ProfileRow, QuestionRow } from "@/database/supabase/database.types";
import { questionRecordSchema } from "@/shared/schemas/game.schemas";

export function mapQuestionRow(row: QuestionRow): QuestionRecord {
  return questionRecordSchema.parse({
    id: row.id,
    categoryId: row.category_id,
    mediaUrl: row.media_url,
    isAi: row.is_ai,
    difficultyRating: row.difficulty_rating,
    explanationText: row.explanation_text,
    metadata: row.metadata,
    isActive: row.is_active,
  });
}

export function mapProfileRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    totalXp: row.total_xp,
    currentLevel: row.current_level,
    dailyStreak: row.daily_streak,
    lastPlayedAt: row.last_played_at,
    createdAt: row.created_at,
  };
}
