/**
 * Minimal handwritten row types matching database-schema.md.
 * Replace these with Supabase CLI-generated types after the schema is deployed.
 */
export interface QuestionRow {
  id: string;
  category_id: string;
  media_url: string;
  is_ai: boolean;
  difficulty_rating: string;
  explanation_text: string | null;
  metadata: unknown;
  is_active: boolean;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  username: string;
  total_xp: number;
  current_level: number;
  daily_streak: number;
  last_played_at: string | null;
  created_at: string;
  updated_at: string;
}
