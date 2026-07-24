import type { GameRepository } from "@/server/repositories/game.repository";
import type { LeaderboardEntry } from "@/shared/contracts/game.contracts";

export class LeaderboardService {
  constructor(private readonly repository: GameRepository) {}

  getLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
    return this.repository.getLeaderboard(Math.min(Math.max(limit, 1), 100));
  }
}
