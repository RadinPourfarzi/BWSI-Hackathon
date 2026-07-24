import { z } from "zod";
import type { Profile, QuestionRecord } from "@/shared/types/game.types";
import type { ProfileRow, QuestionRow } from "@/database/supabase/database.types";

const categorySchema = z.enum(["image", "email", "audio"]);
const difficultySchema = z.enum(["EASY", "MEDIUM", "HARD", "EXPERT"]);
const metadataSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("image"),
    altText: z.string().optional(),
    widthPx: z.number().int().positive().optional(),
    heightPx: z.number().int().positive().optional(),
    source: z.string().optional(),
  }),
  z.object({
    kind: z.literal("email"),
    subject: z.string(),
    senderName: z.string(),
    senderAddress: z.string(),
    receivedAt: z.string().optional(),
    bodyFormat: z.enum(["image", "html"]),
  }),
  z.object({
    kind: z.literal("audio"),
    durationMs: z.number().int().nonnegative(),
    transcript: z.string().optional(),
    mimeType: z.string().optional(),
  }),
]);

export function mapQuestionRow(row: QuestionRow): QuestionRecord {
  const categoryId = categorySchema.parse(row.category_id);
  const metadata = metadataSchema.parse(row.metadata);
  if (metadata.kind !== categoryId) {
    throw new Error(
      `Question ${row.id} has category '${categoryId}' but metadata kind '${metadata.kind}'.`,
    );
  }

  return {
    id: row.id,
    categoryId,
    mediaUrl: row.media_url,
    isAi: row.is_ai,
    difficultyRating: difficultySchema.parse(row.difficulty_rating),
    explanationText: row.explanation_text,
    metadata,
    isActive: row.is_active,
  };
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
