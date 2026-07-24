import { randomUUID } from "node:crypto";
import type {
  EndGameRequest,
  GameSummary,
  PublicGameState,
  StartGameRequest,
  StartGameResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
} from "@/shared/contracts/game.contracts";
import { toPublicQuestion } from "@/shared/utilities/question-public.mapper";
import {
  GameError,
  SessionNotFoundError,
  SessionOwnershipError,
} from "@/server/errors/game.errors";
import { evaluateAnswer } from "@/server/game/answer-evaluator";
import type { ServerGameState } from "@/server/game/game-session.types";
import type { QuestionSelector } from "@/server/game/question-selector";
import { GameRuleEngine } from "@/server/game/rule-engine";
import { calculateXp } from "@/server/game/xp";
import type { GameRepository } from "@/server/repositories/game.repository";
import type { ActiveSessionStore } from "@/server/sessions/active-session.store";
import { PlayerProgressionService } from "@/server/players/player-progression.service";

export interface GameSessionServiceDependencies {
  repository: GameRepository;
  sessions: ActiveSessionStore;
  selector: QuestionSelector;
  rules: GameRuleEngine;
  progression: PlayerProgressionService;
  nowMs?: () => number;
  createId?: () => string;
}

export class GameSessionService {
  private readonly nowMs: () => number;
  private readonly createId: () => string;

  constructor(private readonly dependencies: GameSessionServiceDependencies) {
    this.nowMs = dependencies.nowMs ?? Date.now;
    this.createId = dependencies.createId ?? randomUUID;
  }

  async startGame(userId: string, request: StartGameRequest): Promise<StartGameResponse> {
    const config = await this.dependencies.repository.getActiveConfig();
    const categories = [...new Set(request.categories)].filter(
      (category) => config.categories[category]?.isActive,
    );

    if (categories.length === 0) {
      throw new GameError(
        "Select at least one active challenge category.",
        "BAD_REQUEST",
        400,
      );
    }

    const firstChallenge = await this.dependencies.selector.selectNext({
      categories,
      excludeIds: [],
    });
    const now = this.nowMs();
    const session: ServerGameState = {
      sessionId: this.createId(),
      userId,
      status: "active",
      mode: request.mode,
      enabledCategories: categories,
      config,
      score: 0,
      lives: request.mode === "ARCADE" ? config.game.arcadeLives : null,
      combo: 0,
      highestCombo: 0,
      questionNumber: 1,
      correctAnswers: 0,
      incorrectAnswers: 0,
      currentChallenge: firstChallenge,
      challengeStartedAtMs: now,
      shownChallengeIds: [firstChallenge.id],
      attempts: [],
      startedAtMs: now,
      endedAtMs: null,
      summary: null,
    };

    await this.dependencies.sessions.set(session);
    return {
      state: this.toPublicState(session),
      config,
      challenge: toPublicQuestion(firstChallenge),
    };
  }

  async submitAnswer(
    userId: string,
    request: SubmitAnswerRequest,
  ): Promise<SubmitAnswerResponse> {
    const session = await this.getOwnedActiveSession(userId, request.sessionId);
    const challenge = session.currentChallenge;

    if (!challenge || challenge.id !== request.challengeId) {
      throw new GameError(
        "The submitted challenge is not the session's current challenge.",
        "CONFLICT",
        409,
      );
    }

    const now = this.nowMs();
    const responseTimeMs = Math.max(0, now - (session.challengeStartedAtMs ?? now));
    const evaluation = evaluateAnswer(request.selectedAnswer, challenge);
    const result = this.dependencies.rules.resolveAnswer({
      mode: session.mode,
      categoryId: challenge.categoryId,
      wasCorrect: evaluation.wasCorrect,
      responseTimeMs,
      questionNumber: session.questionNumber,
      currentScore: session.score,
      currentCombo: session.combo,
      highestCombo: session.highestCombo,
      currentLives: session.lives,
      config: session.config,
    });

    session.score = result.score;
    session.combo = result.combo;
    session.highestCombo = result.highestCombo;
    session.lives = result.lives;
    session.correctAnswers += result.effectiveCorrectness ? 1 : 0;
    session.incorrectAnswers += result.effectiveCorrectness ? 0 : 1;
    session.attempts.push({
      questionId: challenge.id,
      categoryId: challenge.categoryId,
      questionIndex: session.questionNumber,
      selectedAnswer: request.selectedAnswer,
      isCorrect: result.effectiveCorrectness,
      responseTimeMs,
      pointsAwarded: result.awardedPoints,
      comboAtAnswer: result.combo,
      answeredAt: new Date(now).toISOString(),
    });
    session.currentChallenge = null;
    session.challengeStartedAtMs = null;

    const events = result.effectiveCorrectness
      ? result.events
      : [
          {
            type: "answer-incorrect" as const,
            correctAnswer: evaluation.correctAnswer,
          },
          ...result.events,
        ];

    if (result.gameEnded) {
      const summary = await this.finishSession(session, true);
      return {
        wasCorrect: result.effectiveCorrectness,
        correctAnswer: evaluation.correctAnswer,
        explanation:
          session.mode === "TRAINING"
            ? challenge.explanationText ?? undefined
            : undefined,
        awardedPoints: result.awardedPoints,
        responseTimeMs,
        state: this.toPublicState(session),
        events,
        summary,
      };
    }

    try {
      const nextChallenge = await this.dependencies.selector.selectNext({
        categories: session.enabledCategories,
        excludeIds: session.shownChallengeIds,
      });
      session.questionNumber += 1;
      session.currentChallenge = nextChallenge;
      session.challengeStartedAtMs = now;
      session.shownChallengeIds.push(nextChallenge.id);
      await this.dependencies.sessions.set(session);

      return {
        wasCorrect: result.effectiveCorrectness,
        correctAnswer: evaluation.correctAnswer,
        explanation:
          session.mode === "TRAINING"
            ? challenge.explanationText ?? undefined
            : undefined,
        awardedPoints: result.awardedPoints,
        responseTimeMs,
        state: this.toPublicState(session),
        events,
        nextChallenge: toPublicQuestion(nextChallenge),
      };
    } catch (error) {
      if (!(error instanceof GameError) || error.code !== "NOT_FOUND") {
        throw error;
      }
      events.push({ type: "game-ended" });
      const summary = await this.finishSession(session, true);
      return {
        wasCorrect: result.effectiveCorrectness,
        correctAnswer: evaluation.correctAnswer,
        explanation:
          session.mode === "TRAINING"
            ? challenge.explanationText ?? undefined
            : undefined,
        awardedPoints: result.awardedPoints,
        responseTimeMs,
        state: this.toPublicState(session),
        events,
        summary,
      };
    }
  }

  async endGame(userId: string, request: EndGameRequest): Promise<GameSummary> {
    const session = await this.getOwnedActiveSession(userId, request.sessionId);
    return this.finishSession(session, false);
  }

  private async getOwnedActiveSession(
    userId: string,
    sessionId: string,
  ): Promise<ServerGameState> {
    const session = await this.dependencies.sessions.get(sessionId);
    if (!session) {
      throw new SessionNotFoundError();
    }
    if (session.userId !== userId) {
      throw new SessionOwnershipError();
    }
    if (session.status !== "active") {
      throw new GameError("This game session has already ended.", "SESSION_ENDED", 409);
    }
    return session;
  }

  private async finishSession(
    session: ServerGameState,
    completed: boolean,
  ): Promise<GameSummary> {
    const endedAtMs = this.nowMs();
    const xpAwarded = calculateXp(
      {
        mode: session.mode,
        correctAnswers: session.correctAnswers,
        highestCombo: session.highestCombo,
        completed,
      },
      session.config,
    );
    const summary: GameSummary = {
      sessionId: session.sessionId,
      mode: session.mode,
      finalScore: session.score,
      xpAwarded,
      correctAnswers: session.correctAnswers,
      incorrectAnswers: session.incorrectAnswers,
      questionsAnswered: session.attempts.length,
      highestCombo: session.highestCombo,
      startedAt: new Date(session.startedAtMs).toISOString(),
      endedAt: new Date(endedAtMs).toISOString(),
    };

    session.status = completed ? "completed" : "abandoned";
    session.endedAtMs = endedAtMs;
    session.summary = summary;
    await this.dependencies.progression.applyCompletedGame(
      session.userId,
      xpAwarded,
      session.config,
    );
    await this.dependencies.repository.saveCompletedGame({
      summary,
      userId: session.userId,
      categoriesPlayed: session.enabledCategories,
      attempts: session.attempts,
    });
    await this.dependencies.sessions.delete(session.sessionId);
    return summary;
  }

  private toPublicState(session: ServerGameState): PublicGameState {
    return {
      sessionId: session.sessionId,
      status: session.status,
      mode: session.mode,
      enabledCategories: session.enabledCategories,
      score: session.score,
      lives: session.lives,
      combo: session.combo,
      highestCombo: session.highestCombo,
      questionNumber: session.questionNumber,
      correctAnswers: session.correctAnswers,
      incorrectAnswers: session.incorrectAnswers,
    };
  }
}
