import { DEFAULT_GAME_CONFIG } from '@/config/game.config';
import type {
  AccuracyTrendPoint,
  CategoryAnalytics,
  LeaderboardEntry,
  PlayerAnalytics,
} from '@/shared/contracts/game.contracts';
import type {
  ActiveGameConfig,
  CategoryId,
  PlayerProfile,
  QuestionRecord,
} from '@/shared/types/game.types';
import { calculateLevel } from '@/server/game/xp';
import type {
  CompletedGame,
  CompletionResult,
  GameRepository,
  QuestionQuery,
} from '@/server/repositories/game.repository';
import { MOCK_QUESTIONS } from '@/database/mock/challenges';

export class MockGameRepository implements GameRepository {
  private readonly questions: QuestionRecord[];
  private readonly profiles = new Map<string, PlayerProfile>();
  private readonly games = new Map<string, CompletedGame>();
  private readonly completions = new Map<string, CompletionResult>();

  constructor(questions: QuestionRecord[] = MOCK_QUESTIONS) {
    this.questions = structuredClone(questions);
  }

  async getActiveConfig(): Promise<ActiveGameConfig> {
    return structuredClone(DEFAULT_GAME_CONFIG);
  }

  async listQuestions(query: QuestionQuery): Promise<QuestionRecord[]> {
    const excluded = new Set(query.excludeIds);
    return this.questions
      .filter(
        (question) =>
          question.active &&
          query.categories.includes(question.categoryId) &&
          !excluded.has(question.id),
      )
      .slice(0, query.limit)
      .map((question) => structuredClone(question));
  }

  async completeGame(
    game: CompletedGame,
    config: ActiveGameConfig,
  ): Promise<CompletionResult> {
    const previousCompletion = this.completions.get(game.summary.sessionId);
    if (previousCompletion) {
      return structuredClone(previousCompletion);
    }

    const profile = await this.getProfile(game.userId);
    const previousLevel = profile.level;
    const previousHighestScore = profile.highestScore;
    const updated = updateProfile(profile, game, config);
    const completion: CompletionResult = {
      summary: structuredClone(game.summary),
      profile: updated,
      previousLevel,
      previousHighestScore,
    };
    this.profiles.set(game.userId, structuredClone(updated));
    this.games.set(game.summary.sessionId, structuredClone(game));
    this.completions.set(game.summary.sessionId, structuredClone(completion));
    return structuredClone(completion);
  }

  async getCompletedGame(
    sessionId: string,
    userId: string,
  ): Promise<CompletionResult | null> {
    const game = this.games.get(sessionId);
    const completion = this.completions.get(sessionId);
    if (!game || !completion || game.userId !== userId) {
      return null;
    }
    return structuredClone(completion);
  }

  async getProfile(userId: string): Promise<PlayerProfile> {
    const existing = this.profiles.get(userId);
    if (existing) {
      return structuredClone(existing);
    }

    const profile: PlayerProfile = {
      userId,
      displayName: `player-${userId.slice(0, 8)}`,
      totalXp: 0,
      level: 1,
      highestScore: 0,
      longestCombo: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastPlayedAt: null,
      gamesPlayed: 0,
      arcadeGamesPlayed: 0,
      trainingGamesPlayed: 0,
      createdAt: new Date().toISOString(),
    };
    this.profiles.set(userId, structuredClone(profile));
    return structuredClone(profile);
  }

  async getAnalytics(userId: string): Promise<PlayerAnalytics> {
    const playerGames = [...this.games.values()].filter(
      (game) => game.userId === userId,
    );
    const attempts = playerGames.flatMap((game) => game.attempts);
    const correct = attempts.filter((attempt) => attempt.wasCorrect).length;
    const arcadeScores = playerGames
      .filter((game) => game.summary.mode === 'ARCADE')
      .map((game) => game.summary.finalScore);
    const profile = await this.getProfile(userId);
    const byCategory = aggregateCategories(attempts);
    const ranked = [...byCategory].sort(
      (left, right) => right.accuracyPercent - left.accuracyPercent,
    );
    const leaderboard = await this.getLeaderboard(100);

    return {
      attempts: attempts.length,
      correct,
      accuracyPercent: percent(correct, attempts.length),
      averageResponseTimeMs: average(attempts.map((attempt) => attempt.responseTimeMs)),
      averageArcadeScore: average(arcadeScores),
      bestArcadeScore: arcadeScores.length === 0 ? 0 : Math.max(...arcadeScores),
      longestCombo: profile.longestCombo,
      leaderboardRank:
        leaderboard.find((entry) => entry.userId === userId)?.rank ?? null,
      strongestCategory: ranked.at(0)?.categoryId ?? null,
      weakestCategory: ranked.length > 1 ? (ranked.at(-1)?.categoryId ?? null) : null,
      byCategory,
      accuracyTrend: aggregateTrend(attempts),
    };
  }

  async getLeaderboard(limit: number): Promise<LeaderboardEntry[]> {
    const sorted = [...this.profiles.values()]
      .filter((profile) => profile.highestScore > 0)
      .sort((left, right) => {
        if (right.highestScore !== left.highestScore) {
          return right.highestScore - left.highestScore;
        }
        return left.displayName.localeCompare(right.displayName);
      });

    let rank = 0;
    let previousScore: number | null = null;
    return sorted.slice(0, limit).map((profile, index) => {
      if (profile.highestScore !== previousScore) {
        rank = index + 1;
        previousScore = profile.highestScore;
      }
      return {
        rank,
        userId: profile.userId,
        displayName: profile.displayName,
        highestScore: profile.highestScore,
        level: profile.level,
      };
    });
  }
}

function updateProfile(
  profile: PlayerProfile,
  game: CompletedGame,
  config: ActiveGameConfig,
): PlayerProfile {
  const playedAt = new Date(game.summary.endedAt);
  const streak = nextStreak(profile.currentStreak, profile.lastPlayedAt, playedAt);
  const totalXp = profile.totalXp + game.summary.xpEarned;
  const isArcade = game.summary.mode === 'ARCADE';

  return {
    ...profile,
    totalXp,
    level: calculateLevel(totalXp, config),
    highestScore: isArcade
      ? Math.max(profile.highestScore, game.summary.finalScore)
      : profile.highestScore,
    longestCombo: Math.max(profile.longestCombo, game.summary.highestCombo),
    currentStreak: streak,
    longestStreak: Math.max(profile.longestStreak, streak),
    lastPlayedAt: playedAt.toISOString(),
    gamesPlayed: profile.gamesPlayed + 1,
    arcadeGamesPlayed: profile.arcadeGamesPlayed + (isArcade ? 1 : 0),
    trainingGamesPlayed: profile.trainingGamesPlayed + (isArcade ? 0 : 1),
  };
}

function nextStreak(
  currentStreak: number,
  lastPlayedAt: string | null,
  playedAt: Date,
): number {
  if (!lastPlayedAt) {
    return 1;
  }
  const dayMs = 86_400_000;
  const difference = utcDay(playedAt) - utcDay(new Date(lastPlayedAt));
  if (difference === 0) {
    return Math.max(currentStreak, 1);
  }
  if (difference === dayMs) {
    return currentStreak + 1;
  }
  return 1;
}

function utcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function aggregateCategories(attempts: CompletedGame['attempts']): CategoryAnalytics[] {
  const categories: CategoryId[] = ['image', 'email', 'audio'];
  return categories
    .map((categoryId) => {
      const matches = attempts.filter((attempt) => attempt.categoryId === categoryId);
      const correct = matches.filter((attempt) => attempt.wasCorrect).length;
      return {
        categoryId,
        attempts: matches.length,
        correct,
        accuracyPercent: percent(correct, matches.length),
        averageResponseTimeMs: average(
          matches.map((attempt) => attempt.responseTimeMs),
        ),
      };
    })
    .filter((category) => category.attempts > 0);
}

function aggregateTrend(attempts: CompletedGame['attempts']): AccuracyTrendPoint[] {
  const days = new Map<string, { attempts: number; correct: number }>();
  for (const attempt of attempts) {
    const day = attempt.answeredAt.slice(0, 10);
    const bucket = days.get(day) ?? { attempts: 0, correct: 0 };
    bucket.attempts += 1;
    bucket.correct += attempt.wasCorrect ? 1 : 0;
    days.set(day, bucket);
  }
  return [...days.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, bucket]) => ({
      date,
      accuracyPercent: percent(bucket.correct, bucket.attempts),
    }));
}

function percent(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1_000) / 10;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}
