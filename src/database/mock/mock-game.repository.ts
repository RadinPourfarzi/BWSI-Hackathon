import { DEFAULT_GAME_CONFIG } from "@/config/game.config";
import type {
  GameRepository,
  CompletedGame,
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

const QUESTIONS: QuestionRecord[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    categoryId: "image",
    mediaUrl: "image/ai-portrait-01.webp",
    isAi: true,
    difficultyRating: "MEDIUM",
    explanationText: "Look for inconsistent jewelry and malformed background text.",
    metadata: {
      kind: "image",
      altText: "A generated portrait used as a mock challenge",
    },
    isActive: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    categoryId: "image",
    mediaUrl: "image/real-street-01.webp",
    isAi: false,
    difficultyRating: "EASY",
    explanationText: "Lighting and reflections remain physically consistent.",
    metadata: {
      kind: "image",
      altText: "A real street photograph used as a mock challenge",
    },
    isActive: true,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    categoryId: "email",
    mediaUrl: "email/phishing-01.png",
    isAi: true,
    difficultyRating: "HARD",
    explanationText: "The sender uses a look-alike domain and artificial urgency.",
    metadata: {
      kind: "email",
      subject: "Your account is limited",
      senderName: "Payment Support",
      senderAddress: "service@example.invalid",
      bodyFormat: "image",
    },
    isActive: true,
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    categoryId: "audio",
    mediaUrl: "audio/cloned-voice-01.mp3",
    isAi: true,
    difficultyRating: "EXPERT",
    explanationText: "The voice has flat prosody and unnatural breath placement.",
    metadata: {
      kind: "audio",
      durationMs: 8_200,
      mimeType: "audio/mpeg",
    },
    isActive: true,
  },
];

export class MockGameRepository implements GameRepository {
  private readonly profiles = new Map<string, Profile>();
  private readonly games: CompletedGame[] = [];

  async getActiveConfig(): Promise<ActiveGameConfig> {
    return structuredClone(DEFAULT_GAME_CONFIG);
  }

  async listQuestions(query: QuestionQuery): Promise<QuestionRecord[]> {
    const excluded = new Set(query.excludeIds);
    return QUESTIONS.filter(
      (question) =>
        question.isActive &&
        query.categories.includes(question.categoryId) &&
        !excluded.has(question.id),
    ).map((question) => structuredClone(question));
  }

  async getQuestion(questionId: string): Promise<QuestionRecord | null> {
    const question = QUESTIONS.find((candidate) => candidate.id === questionId);
    return question ? structuredClone(question) : null;
  }

  async saveCompletedGame(game: CompletedGame): Promise<void> {
    this.games.push(structuredClone(game));
  }

  async getProfile(userId: string): Promise<Profile> {
    const existing = this.profiles.get(userId);
    if (existing) {
      return structuredClone(existing);
    }

    const profile: Profile = {
      id: userId,
      username: `player-${userId.slice(0, 8)}`,
      totalXp: 0,
      currentLevel: 1,
      dailyStreak: 0,
      lastPlayedAt: null,
      createdAt: new Date().toISOString(),
    };
    this.profiles.set(userId, profile);
    return structuredClone(profile);
  }

  async saveProfile(profile: Profile): Promise<void> {
    this.profiles.set(profile.id, structuredClone(profile));
  }

  async getAnalytics(userId: string): Promise<PlayerAnalytics> {
    const attempts = this.games
      .filter((game) => game.userId === userId)
      .flatMap((game) => game.attempts);
    const correct = attempts.filter((attempt) => attempt.isCorrect).length;
    const totalResponseTime = attempts.reduce(
      (sum, attempt) => sum + attempt.responseTimeMs,
      0,
    );

    return {
      attempts: attempts.length,
      correct,
      accuracyPercent: attempts.length === 0 ? 0 : (correct / attempts.length) * 100,
      averageResponseTimeMs:
        attempts.length === 0 ? 0 : totalResponseTime / attempts.length,
    };
  }

  async getLeaderboard(limit: number): Promise<LeaderboardEntry[]> {
    const bestByUser = new Map<string, number>();
    for (const game of this.games) {
      bestByUser.set(
        game.userId,
        Math.max(bestByUser.get(game.userId) ?? 0, game.summary.finalScore),
      );
    }

    return [...bestByUser.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, limit)
      .map(([userId, score], index) => ({
        userId,
        username: this.profiles.get(userId)?.username ?? "Unknown player",
        score,
        rank: index + 1,
      }));
  }
}
