import type {
  CompletedGame,
  GameRepository,
  QuestionQuery,
} from "@/server/repositories/game.repository";
import type {
  ActiveGameConfig,
  Profile,
  QuestionRecord,
} from "@/shared/types/game.types";
import type {
  LeaderboardEntry,
  PlayerAnalytics,
} from "@/shared/contracts/game.contracts";

function notConnected(method: string): never {
  throw new Error(
    `SupabaseGameRepository.${method} is a template. Connect the database client before selecting this repository in the container.`,
  );
}

/**
 * Integration seam for the database teammate. Keep all snake_case/camelCase
 * mapping in this directory and return only domain types from these methods.
 */
export class SupabaseGameRepository implements GameRepository {
  constructor(private readonly serverClient: unknown) {
    void this.serverClient;
  }

  getActiveConfig(): Promise<ActiveGameConfig> {
    return notConnected("getActiveConfig");
  }

  listQuestions(_query: QuestionQuery): Promise<QuestionRecord[]> {
    void _query;
    return notConnected("listQuestions");
  }

  getQuestion(_questionId: string): Promise<QuestionRecord | null> {
    void _questionId;
    return notConnected("getQuestion");
  }

  saveCompletedGame(_game: CompletedGame): Promise<void> {
    void _game;
    return notConnected("saveCompletedGame");
  }

  getProfile(_userId: string): Promise<Profile> {
    void _userId;
    return notConnected("getProfile");
  }

  saveProfile(_profile: Profile): Promise<void> {
    void _profile;
    return notConnected("saveProfile");
  }

  getAnalytics(_userId: string): Promise<PlayerAnalytics> {
    void _userId;
    return notConnected("getAnalytics");
  }

  getLeaderboard(_limit: number): Promise<LeaderboardEntry[]> {
    void _limit;
    return notConnected("getLeaderboard");
  }
}
