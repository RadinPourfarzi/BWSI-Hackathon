/** Handwritten boundary rows. Replace with CLI-generated types after linking. */
export interface QuestionRow {
  id: string;
  category_id: string;
  media_url: string;
  is_ai: boolean;
  difficulty_rating: string;
  explanation_text: string | null;
  metadata: unknown;
  is_active: boolean;
}

export interface ProfileRow {
  id: string;
  username: string;
  total_xp: number;
  current_level: number;
  highest_score: number;
  longest_combo: number;
  daily_streak: number;
  longest_streak: number;
  last_played_at: string | null;
  games_played: number;
  arcade_games_played: number;
  training_games_played: number;
  created_at: string;
  updated_at: string;
}

export interface GameSessionRow {
  id: string;
  user_id: string;
  mode: string;
  status: string;
  end_reason: string;
  config_version: number;
  final_score: number;
  xp_earned: number;
  correct_count: number;
  incorrect_count: number;
  highest_combo: number;
  questions_answered: number;
  average_response_time_ms: number;
  categories_played: string[];
  started_at: string;
  ended_at: string;
  created_at: string;
}

export interface AttemptAnalyticsRow {
  category_id: string;
  was_correct: boolean;
  response_time_ms: number;
  answered_at: string;
}

export interface LeaderboardRow {
  user_id: string;
  display_name: string;
  highest_score: number;
  current_level: number;
  rank: number;
}

export interface CompletionRpcRow {
  summary: {
    session_id: string;
    mode: string;
    end_reason: string;
    final_score: number;
    xp_earned: number;
    correct_count: number;
    incorrect_count: number;
    questions_answered: number;
    highest_combo: number;
    average_response_time_ms: number;
    started_at: string;
    ended_at: string;
  };
  profile: ProfileRow;
  previous_level: number;
  previous_highest_score: number;
}
