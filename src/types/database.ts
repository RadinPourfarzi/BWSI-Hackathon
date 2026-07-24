export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string | null;
          avatar_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          display_name?: string | null;
          avatar_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          username?: string | null;
          display_name?: string | null;
          avatar_path?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          option_a_label: string;
          option_b_label: string;
          renderer_key: string;
          active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          option_a_label: string;
          option_b_label: string;
          renderer_key: string;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          slug?: string;
          name?: string;
          option_a_label?: string;
          option_b_label?: string;
          renderer_key?: string;
          active?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      challenges: {
        Row: {
          id: string;
          category_id: string;
          content_type: Database["public"]["Enums"]["content_type"];
          payload: Json;
          correct_choice: Database["public"]["Enums"]["binary_choice"];
          option_a_label: string;
          option_b_label: string;
          difficulty: Database["public"]["Enums"]["difficulty_tier"];
          difficulty_metadata: Json;
          explanation: string;
          source_dataset: string;
          original_source_url: string;
          license: string;
          attribution: string;
          content_hash: string;
          active: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          content_type: Database["public"]["Enums"]["content_type"];
          payload: Json;
          correct_choice: Database["public"]["Enums"]["binary_choice"];
          option_a_label: string;
          option_b_label: string;
          difficulty: Database["public"]["Enums"]["difficulty_tier"];
          difficulty_metadata?: Json;
          explanation: string;
          source_dataset: string;
          original_source_url: string;
          license: string;
          attribution: string;
          content_hash: string;
          active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["challenges"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "challenges_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      game_sessions: {
        Row: {
          id: string;
          user_id: string;
          mode: Database["public"]["Enums"]["session_mode"];
          status: Database["public"]["Enums"]["session_status"];
          score: number;
          questions_total: number;
          questions_completed: number;
          correct_count: number;
          incorrect_count: number;
          max_combo: number;
          enabled_category_ids: string[];
          multiplayer_room_id: string | null;
          started_at: string;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mode: Database["public"]["Enums"]["session_mode"];
          status?: Database["public"]["Enums"]["session_status"];
          score?: number;
          questions_total: number;
          questions_completed?: number;
          correct_count?: number;
          incorrect_count?: number;
          max_combo?: number;
          enabled_category_ids: string[];
          multiplayer_room_id?: string | null;
          started_at?: string;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["game_sessions"]["Insert"]
        >;
        Relationships: [];
      };
      question_attempts: {
        Row: {
          id: string;
          session_id: string;
          challenge_id: string;
          user_id: string;
          selected_choice: Database["public"]["Enums"]["binary_choice"];
          is_correct: boolean;
          response_ms: number;
          obtainable_points: number;
          awarded_points: number;
          combo_before: number;
          combo_after: number;
          difficulty_snapshot: Database["public"]["Enums"]["difficulty_tier"];
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          challenge_id: string;
          user_id: string;
          selected_choice: Database["public"]["Enums"]["binary_choice"];
          is_correct: boolean;
          response_ms: number;
          obtainable_points: number;
          awarded_points: number;
          combo_before: number;
          combo_after: number;
          difficulty_snapshot: Database["public"]["Enums"]["difficulty_tier"];
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      user_stats: {
        Row: {
          user_id: string;
          total_xp: number;
          level: number;
          games_played: number;
          correct_attempts: number;
          total_attempts: number;
          best_score: number;
          current_streak: number;
          longest_streak: number;
          category_accuracy: Json;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          total_xp?: number;
          level?: number;
          games_played?: number;
          correct_attempts?: number;
          total_attempts?: number;
          best_score?: number;
          current_streak?: number;
          longest_streak?: number;
          category_accuracy?: Json;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_stats"]["Insert"]>;
        Relationships: [];
      };
      analytics_snapshots: {
        Row: {
          id: string;
          user_id: string;
          period_start: string;
          period_end: string;
          metrics: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          period_start: string;
          period_end: string;
          metrics: Json;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      xp_history: {
        Row: {
          id: string;
          user_id: string;
          session_id: string | null;
          event_type: Database["public"]["Enums"]["xp_event_type"];
          amount: number;
          balance_after: number;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id?: string | null;
          event_type: Database["public"]["Enums"]["xp_event_type"];
          amount: number;
          balance_after: number;
          metadata?: Json;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      daily_streaks: {
        Row: {
          id: string;
          user_id: string;
          activity_date: string;
          completed_sessions: number;
          xp_earned: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          activity_date: string;
          completed_sessions?: number;
          xp_earned?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          completed_sessions?: number;
          xp_earned?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      record_attempt: {
        Args: {
          p_session_id: string;
          p_challenge_id: string;
          p_selected_choice: Database["public"]["Enums"]["binary_choice"];
          p_response_ms: number;
          p_obtainable_points: number;
          p_awarded_points: number;
          p_combo_before: number;
          p_combo_after: number;
        };
        Returns: Json;
      };
      complete_game_session: {
        Args: {
          p_session_id: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      binary_choice: "option_a" | "option_b";
      content_type: "image" | "email" | "audio";
      difficulty_tier: "easy" | "medium" | "hard";
      session_mode: "arcade" | "training";
      session_status: "active" | "completed" | "abandoned";
      xp_event_type:
        | "answer"
        | "session_complete"
        | "perfect_bonus"
        | "daily_bonus"
        | "admin_adjustment";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type TableRow<Name extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][Name]["Row"];
