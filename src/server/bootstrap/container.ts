import { MockGameRepository } from "@/database/mock/mock-game.repository";
import { SupabaseGameRepository } from "@/database/supabase/supabase-game.repository";
import { SupabaseActiveSessionStore } from "@/database/supabase/supabase-active-session.store";
import { getSupabaseAdminClient } from "@/database/supabase/clients";
import { getEnvironment } from "@/config/environment";
import { AnalyticsService } from "@/server/analytics/analytics.service";
import { GameSessionService } from "@/server/game/game-session.service";
import { RandomQuestionSelector } from "@/server/game/question-selector";
import { GameRuleEngine } from "@/server/game/rule-engine";
import { LeaderboardService } from "@/server/leaderboard/leaderboard.service";
import { InMemoryActiveSessionStore } from "@/server/sessions/active-session.store";

function createContainer() {
  const environment = getEnvironment();
  const useSupabase = environment.APP_DATA_PROVIDER === "supabase";
  const adminClient = useSupabase ? getSupabaseAdminClient() : null;
  const repository = useSupabase
    ? new SupabaseGameRepository(adminClient!)
    : new MockGameRepository();
  const sessions = useSupabase
    ? new SupabaseActiveSessionStore(adminClient!)
    : new InMemoryActiveSessionStore();
  const selector = new RandomQuestionSelector(repository);
  const rules = new GameRuleEngine();

  return {
    repository,
    gameSessions: new GameSessionService({
      repository,
      sessions,
      selector,
      rules,
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
