/**
 * snake_case (DB) <-> camelCase (TS) mapping. Kept in one place so the rest of the app
 * never sees raw DB row shapes. See docs/data-formats.md §1.
 */
import type {
  Category,
  CategoryRow,
  Profile,
  ProfileRow,
  Question,
  QuestionRow,
} from '@/types/models';

export function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    displayName: row.display_name,
    isActive: row.is_active,
    gracePeriodMs: row.grace_period_ms,
    sortOrder: row.sort_order,
  };
}

export function mapQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    categoryId: row.category_id,
    mediaUrl: row.media_url,
    isAi: row.is_ai,
    difficultyRating: row.difficulty_rating,
    explanationText: row.explanation_text,
    metadata: row.metadata,
  };
}

export function mapProfile(row: ProfileRow): Profile {
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
