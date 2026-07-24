import type {
  GameSummary,
  LeaderboardEntry,
  PlayerAnalytics,
} from "@/shared/contracts/game.contracts";
import type {
  ActiveGameConfig,
  CategoryId,
  Profile,
  QuestionRecord,
} from "@/shared/types/game.types";
import type { ServerAttempt } from "@/server/game/game-session.types";

export interface QuestionQuery {
  categories: CategoryId[];
  excludeIds: string[];
}

export interface CompletedGame {
  summary: GameSummary;
  userId: string;
  categoriesPlayed: CategoryId[];
  attempts: ServerAttempt[];
}

/**
 * Boundary owned jointly by the server and database developers.
 * Implementations may use mock data, Supabase, or another persistence layer.
 */
export interface GameRepository {
  getActiveConfig(): Promise<ActiveGameConfig>;
  listQuestions(query: QuestionQuery): Promise<QuestionRecord[]>;
  getQuestion(questionId: string): Promise<QuestionRecord | null>;
  saveCompletedGame(game: CompletedGame): Promise<void>;
  getProfile(userId: string): Promise<Profile>;
  saveProfile(profile: Profile): Promise<void>;
  getAnalytics(userId: string): Promise<PlayerAnalytics>;
  getLeaderboard(limit: number): Promise<LeaderboardEntry[]>;
}
