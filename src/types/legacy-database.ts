import type { Json } from "@/types/database";

export type LegacyDatabase = {
  public: {
    Tables: {
      questions: {
        Row: {
          id: string;
          category_id: string;
          media_url: string;
          is_ai: boolean;
          difficulty_rating: string;
          explanation_text: string | null;
          is_active: boolean;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          media_url: string;
          is_ai: boolean;
          difficulty_rating?: string;
          explanation_text?: string | null;
          is_active?: boolean;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<
          LegacyDatabase["public"]["Tables"]["questions"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      submit_run: {
        Args: {
          p_mode: string;
          p_categories: string[];
          p_attempts: Json;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
