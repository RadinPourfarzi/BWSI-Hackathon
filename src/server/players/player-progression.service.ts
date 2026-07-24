import type { Profile } from "@/shared/types/game.types";
import type { GameRepository } from "@/server/repositories/game.repository";
import { calculateLevel } from "@/server/game/xp";
import type { ActiveGameConfig } from "@/shared/types/game.types";

function utcDay(value: string | Date): number {
  const date = typeof value === "string" ? new Date(value) : value;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export class PlayerProgressionService {
  constructor(
    private readonly repository: GameRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async applyCompletedGame(
    userId: string,
    xpAwarded: number,
    config: ActiveGameConfig,
  ): Promise<Profile> {
    const profile = await this.repository.getProfile(userId);
    const playedAt = this.now();
    const today = utcDay(playedAt);
    const lastPlayed = profile.lastPlayedAt ? utcDay(profile.lastPlayedAt) : null;
    const oneDayMs = 86_400_000;

    if (lastPlayed === null || today - lastPlayed > oneDayMs) {
      profile.dailyStreak = 1;
    } else if (today - lastPlayed === oneDayMs) {
      profile.dailyStreak += 1;
    }

    profile.totalXp += xpAwarded;
    profile.currentLevel = calculateLevel(profile.totalXp, config);
    profile.lastPlayedAt = playedAt.toISOString();
    await this.repository.saveProfile(profile);
    return profile;
  }
}
