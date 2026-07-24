import type { Metadata } from "next";

import { EmptyState } from "@/components/ui/states";
import { gameConfig } from "@/config/game";
import { GameBoard } from "@/features/game/game-board";
import { createGameSession, getChallengeBatch } from "@/services/challenges";

export const metadata: Metadata = {
  title: "Play Arcade",
};

export default async function ArcadePage() {
  const result = await getChallengeBatch({
    limit: gameConfig.questionCount.arcade,
  });

  if (result.challenges.length === 0) {
    return (
      <EmptyState
        description={`${result.error ?? "No challenges are available."} Apply the migration, then run npm run data:seed.`}
        title="Challenge set is empty"
      />
    );
  }

  const sessionId = await createGameSession({
    mode: "arcade",
    challenges: result.challenges,
  });

  return (
    <div className="animate-enter">
      <div className="mb-6">
        <p className="text-xs font-bold tracking-[0.18em] text-[var(--pink)] uppercase">
          Arcade
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          Mixed signals
        </h1>
      </div>
      <GameBoard
        challenges={result.challenges}
        mode="arcade"
        sessionId={sessionId}
      />
    </div>
  );
}
