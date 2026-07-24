import type { GameRepository } from '@/server/repositories/game.repository';
import type { PlayerAnalytics } from '@/shared/contracts/game.contracts';

export class AnalyticsService {
  constructor(private readonly repository: GameRepository) {}

  getPlayerAnalytics(userId: string): Promise<PlayerAnalytics> {
    return this.repository.getAnalytics(userId);
  }
}
