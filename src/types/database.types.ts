// Generated from the live Supabase schema (supabase generate_typescript_types).
// Regenerate after schema changes. Source of truth: supabase/migrations/*.sql.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      categories: {
        Row: {
          display_name: string;
          grace_period_ms: number;
          id: string;
          is_active: boolean;
          sort_order: number;
        };
        Insert: {
          display_name: string;
          grace_period_ms?: number;
          id: string;
          is_active?: boolean;
          sort_order?: number;
        };
        Update: {
          display_name?: string;
          grace_period_ms?: number;
          id?: string;
          is_active?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      game_config: {
        Row: {
          config: Json;
          created_at: string;
          id: string;
          is_active: boolean;
          note: string | null;
          version: number;
        };
        Insert: {
          config: Json;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          note?: string | null;
          version: number;
        };
        Update: {
          config?: Json;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          note?: string | null;
          version?: number;
        };
        Relationships: [];
      };
      game_sessions: {
        Row: {
          categories_played: string[];
          created_at: string;
          final_score: number;
          id: string;
          max_combo: number;
          mode: string;
          questions_answered: number;
          user_id: string;
          xp_awarded: number;
        };
        Insert: {
          categories_played?: string[];
          created_at?: string;
          final_score?: number;
          id?: string;
          max_combo?: number;
          mode: string;
          questions_answered?: number;
          user_id: string;
          xp_awarded?: number;
        };
        Update: {
          categories_played?: string[];
          created_at?: string;
          final_score?: number;
          id?: string;
          max_combo?: number;
          mode?: string;
          questions_answered?: number;
          user_id?: string;
          xp_awarded?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'game_sessions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          current_level: number;
          daily_streak: number;
          id: string;
          last_played_at: string | null;
          total_xp: number;
          updated_at: string;
          username: string;
        };
        Insert: {
          created_at?: string;
          current_level?: number;
          daily_streak?: number;
          id: string;
          last_played_at?: string | null;
          total_xp?: number;
          updated_at?: string;
          username: string;
        };
        Update: {
          created_at?: string;
          current_level?: number;
          daily_streak?: number;
          id?: string;
          last_played_at?: string | null;
          total_xp?: number;
          updated_at?: string;
          username?: string;
        };
        Relationships: [];
      };
      question_attempts: {
        Row: {
          category_id: string;
          combo_at_answer: number;
          created_at: string;
          id: string;
          is_correct: boolean;
          points_awarded: number;
          question_id: string;
          question_index: number;
          response_time_ms: number;
          session_id: string;
          user_id: string;
        };
        Insert: {
          category_id: string;
          combo_at_answer?: number;
          created_at?: string;
          id?: string;
          is_correct: boolean;
          points_awarded?: number;
          question_id: string;
          question_index?: number;
          response_time_ms: number;
          session_id: string;
          user_id: string;
        };
        Update: {
          category_id?: string;
          combo_at_answer?: number;
          created_at?: string;
          id?: string;
          is_correct?: boolean;
          points_awarded?: number;
          question_id?: string;
          question_index?: number;
          response_time_ms?: number;
          session_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'question_attempts_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'question_attempts_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'questions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'question_attempts_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'game_sessions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'question_attempts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      questions: {
        Row: {
          category_id: string;
          created_at: string;
          difficulty_rating: string;
          explanation_text: string | null;
          id: string;
          is_active: boolean;
          is_ai: boolean;
          media_url: string;
          metadata: Json;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          difficulty_rating?: string;
          explanation_text?: string | null;
          id?: string;
          is_active?: boolean;
          is_ai: boolean;
          media_url: string;
          metadata?: Json;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          difficulty_rating?: string;
          explanation_text?: string | null;
          id?: string;
          is_active?: boolean;
          is_ai?: boolean;
          media_url?: string;
          metadata?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'questions_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_active_config: { Args: never; Returns: Json };
      sample_questions: {
        Args: { p_categories: string[]; p_exclude?: string[]; p_limit: number };
        Returns: {
          category_id: string;
          created_at: string;
          difficulty_rating: string;
          explanation_text: string | null;
          id: string;
          is_active: boolean;
          is_ai: boolean;
          media_url: string;
          metadata: Json;
        }[];
      };
      score_attempt: {
        Args: {
          p_category_id: string;
          p_combo: number;
          p_config: Json;
          p_grace_ms: number;
          p_is_correct: boolean;
          p_question_idx: number;
          p_response_ms: number;
        };
        Returns: number;
      };
      submit_run: {
        Args: { p_attempts: Json; p_categories: string[]; p_mode: string };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
