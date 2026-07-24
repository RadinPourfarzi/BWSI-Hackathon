import { MockGameRepository } from "@/database/mock/mock-game.repository";
import { AnalyticsService } from "@/server/analytics/analytics.service";
import { GameSessionService } from "@/server/game/game-session.service";
import { RandomQuestionSelector } from "@/server/game/question-selector";
import { GameRuleEngine } from "@/server/game/rule-engine";
import { LeaderboardService } from "@/server/leaderboard/leaderboard.service";
import { PlayerProgressionService } from "@/server/players/player-progression.service";
import { InMemoryActiveSessionStore } from "@/server/sessions/active-session.store";

function createContainer() {
  const repository = new MockGameRepository();
  const sessions = new InMemoryActiveSessionStore();
  const selector = new RandomQuestionSelector(repository);
  const rules = new GameRuleEngine();
  const progression = new PlayerProgressionService(repository);

  return {
    gameSessions: new GameSessionService({
      repository,
      sessions,
      selector,
      rules,
      progression,
    }),
    analytics: new AnalyticsService(repository),
    leaderboard: new LeaderboardService(repository),
  };
}

export type ApplicationContainer = ReturnType<typeof createContainer>;

const globalContainer = globalThis as typeof globalThis & {
  __aiDetectionGameContainer?: ApplicationContainer;
};

export const container =
  globalContainer.__aiDetectionGameContainer ?? createContainer();

if (process.env.NODE_ENV !== "production") {
  globalContainer.__aiDetectionGameContainer = container;
}
