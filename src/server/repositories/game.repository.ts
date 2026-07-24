import type {
  GameSummaryCore,
  LeaderboardEntry,
  PlayerAnalytics,
} from '@/shared/contracts/game.contracts';
import type {
  ActiveGameConfig,
  CategoryId,
  PlayerProfile,
  QuestionRecord,
} from '@/shared/types/game.types';
import type { ServerAttempt } from '@/server/game/game-session.types';

export interface QuestionQuery {
  categories: CategoryId[];
  excludeIds: string[];
  limit: number;
  config: ActiveGameConfig;
}

export interface CompletedGame {
  summary: GameSummaryCore;
  userId: string;
  categoriesPlayed: CategoryId[];
  attempts: ServerAttempt[];
}

export interface CompletionResult {
  summary: GameSummaryCore;
  profile: PlayerProfile;
  previousLevel: number;
  previousHighestScore: number;
}

/**
 * Persistence boundary. The engine depends on this contract, so mock and
 * Supabase storage remain interchangeable.
 */
export interface GameRepository {
  getActiveConfig(): Promise<ActiveGameConfig>;
  listQuestions(query: QuestionQuery): Promise<QuestionRecord[]>;
  completeGame(
    game: CompletedGame,
    config: ActiveGameConfig,
  ): Promise<CompletionResult>;
  getCompletedGame(sessionId: string, userId: string): Promise<CompletionResult | null>;
  getProfile(userId: string): Promise<PlayerProfile>;
  getAnalytics(userId: string): Promise<PlayerAnalytics>;
  getLeaderboard(limit: number): Promise<LeaderboardEntry[]>;
}
