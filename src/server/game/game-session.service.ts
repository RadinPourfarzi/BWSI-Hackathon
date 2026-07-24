import { randomUUID } from 'node:crypto';
import type {
  EndGameRequest,
  GameSummary,
  GameSummaryCore,
  GetGameSessionResponse,
  PublicGameState,
  StartGameRequest,
  StartGameResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
} from '@/shared/contracts/game.contracts';
import type { CategoryId, EndReason, QuestionRecord } from '@/shared/types/game.types';
import { toPublicQuestion } from '@/shared/utilities/question-public.mapper';
import {
  GameError,
  SessionNotFoundError,
  SessionOwnershipError,
} from '@/server/errors/game.errors';
import type { ServerAttempt, ServerGameState } from '@/server/game/game-session.types';
import type { QuestionSelector } from '@/server/game/question-selector';
import { GameRuleEngine } from '@/server/game/rule-engine';
import { calculateXp } from '@/server/game/xp';
import type {
  CompletedGame,
  CompletionResult,
  GameRepository,
} from '@/server/repositories/game.repository';
import type { ActiveSessionStore } from '@/server/sessions/active-session.store';

export interface GameSessionServiceDependencies {
  repository: GameRepository;
  sessions: ActiveSessionStore;
  selector: QuestionSelector;
  rules: GameRuleEngine;
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

  async startGame(
    userId: string,
    request: StartGameRequest,
  ): Promise<StartGameResponse> {
    const config = await this.dependencies.repository.getActiveConfig();
    const categories = normalizeCategories(request.categories, config);
    if (categories.length === 0) {
      throw new GameError(
        'Select at least one active challenge category.',
        'BAD_REQUEST',
        400,
      );
    }

    await this.dependencies.repository.getProfile(userId);
    const firstQuestion = await this.dependencies.selector.selectNext({
      categories,
      excludeIds: [],
      config,
    });
    if (!firstQuestion) {
      throw new GameError(
        'No challenges are available for the selected categories.',
        'POOL_EMPTY',
        422,
      );
    }

    const now = this.nowMs();
    const session: ServerGameState = {
      version: 0,
      sessionId: this.createId(),
      userId,
      status: 'active',
      mode: request.mode,
      enabledCategories: categories,
      config,
      score: 0,
      lives: config.modes[request.mode].startingLives,
      combo: 0,
      highestCombo: 0,
      questionNumber: 1,
      correctAnswers: 0,
      incorrectAnswers: 0,
      currentQuestion: firstQuestion,
      challengeStartedAtMs: now,
      shownChallengeIds: [firstQuestion.id],
      attempts: [],
      startedAtMs: now,
      completion: null,
    };

    await this.dependencies.sessions.create(session);
    return {
      state: toPublicState(session),
      challenge: toPublicQuestion(firstQuestion),
      roundRules: this.dependencies.rules.roundRulesFor(
        session.questionNumber,
        firstQuestion.categoryId,
        session.mode,
        session.combo,
        session.config,
      ),
    };
  }

  async submitAnswer(
    userId: string,
    request: SubmitAnswerRequest,
  ): Promise<SubmitAnswerResponse> {
    const session = await this.getOwnedSession(userId, request.sessionId);
    if (session.status !== 'active') {
      throw new GameError(
        'This game has ended. Fetch the session to recover its summary.',
        'SESSION_ENDED',
        409,
      );
    }

    const question = session.currentQuestion;
    if (!question || question.id !== request.challengeId) {
      throw new GameError(
        'The submitted challenge is not the current unanswered challenge.',
        'STALE_CHALLENGE',
        409,
      );
    }
    if (!question.options.some((option) => option.id === request.selectedOptionId)) {
      throw new GameError(
        'The selected option does not exist on this challenge.',
        'INVALID_OPTION',
        400,
      );
    }

    const answeredAtMs = this.nowMs();
    const responseTimeMs = Math.max(
      0,
      answeredAtMs - (session.challengeStartedAtMs ?? answeredAtMs),
    );
    const result = this.dependencies.rules.resolveAnswer({
      mode: session.mode,
      questionNumber: session.questionNumber,
      scoreBeforeAnswer: session.score,
      comboBeforeAnswer: session.combo,
      highestComboBeforeAnswer: session.highestCombo,
      livesBeforeAnswer: session.lives,
      selectedOptionId: request.selectedOptionId,
      responseTimeMs,
      question,
      config: session.config,
    });
    const attempt = this.createAttempt(
      session,
      question,
      request.selectedOptionId,
      responseTimeMs,
      answeredAtMs,
      result,
    );
    const expectedVersion = session.version;
    const next: ServerGameState = {
      ...session,
      score: result.scoreAfterAnswer,
      combo: result.comboAfterAnswer,
      highestCombo: result.highestComboAfterAnswer,
      lives: result.livesAfterAnswer,
      correctAnswers: session.correctAnswers + (result.wasCorrect ? 1 : 0),
      incorrectAnswers: session.incorrectAnswers + (result.wasCorrect ? 0 : 1),
      currentQuestion: null,
      challengeStartedAtMs: null,
      attempts: [...session.attempts, attempt],
    };

    let endReason: EndReason | null = result.gameEnded ? 'lives-depleted' : null;
    let nextQuestion: QuestionRecord | null = null;
    if (!endReason) {
      nextQuestion = await this.dependencies.selector.selectNext({
        categories: session.enabledCategories,
        excludeIds: session.shownChallengeIds,
        config: session.config,
      });
      if (!nextQuestion) {
        endReason = 'pool-exhausted';
      }
    }

    const events = [...result.events];
    let summary: GameSummary | null = null;
    if (endReason) {
      next.status = 'completed';
      next.completion = createSummaryCore(next, endReason, answeredAtMs);
      await this.dependencies.sessions.save(next, expectedVersion);
      summary = await this.persistFinalizedState(next);
      if (
        !events.some(
          (event) => event.type === 'game-ended' && event.reason === endReason,
        )
      ) {
        events.push({ type: 'game-ended', reason: endReason });
      }
      if (summary.leveledUp) {
        events.push({ type: 'level-up', newLevel: summary.level });
      }
    } else {
      next.questionNumber += 1;
      next.currentQuestion = nextQuestion;
      next.challengeStartedAtMs = this.nowMs();
      next.shownChallengeIds = [...next.shownChallengeIds, nextQuestion!.id];
      await this.dependencies.sessions.save(next, expectedVersion);
    }

    return {
      wasCorrect: result.wasCorrect,
      timedOut: result.timedOut,
      correctOptionId: result.correctOptionId,
      basePoints: result.basePoints,
      comboMultiplier: result.comboMultiplier,
      pointsAwarded: result.pointsAwarded,
      responseTimeMs,
      explanation: session.config.modes[session.mode].detailedFeedbackEnabled
        ? question.explanation
        : null,
      state: toPublicState(next),
      events,
      gameEnded: endReason !== null,
      nextChallenge: nextQuestion ? toPublicQuestion(nextQuestion) : null,
      nextRoundRules: nextQuestion
        ? this.dependencies.rules.roundRulesFor(
            next.questionNumber,
            nextQuestion.categoryId,
            next.mode,
            next.combo,
            next.config,
          )
        : null,
      summary,
    };
  }

  async getGame(userId: string, sessionId: string): Promise<GetGameSessionResponse> {
    const session = await this.dependencies.sessions.get(sessionId);
    if (!session) {
      const completed = await this.dependencies.repository.getCompletedGame(
        sessionId,
        userId,
      );
      if (!completed) {
        throw new SessionNotFoundError();
      }
      return {
        state: null,
        challenge: null,
        roundRules: null,
        summary: toPublicSummary(completed),
      };
    }
    this.assertOwnership(session, userId);

    if (session.status !== 'active') {
      return {
        state: toPublicState(session),
        challenge: null,
        roundRules: null,
        summary: await this.persistFinalizedState(session),
      };
    }
    if (!session.currentQuestion) {
      throw new GameError(
        'The active session does not have a current challenge.',
        'CONFLICT',
        409,
      );
    }

    return {
      state: toPublicState(session),
      challenge: toPublicQuestion(session.currentQuestion),
      roundRules: this.dependencies.rules.roundRulesFor(
        session.questionNumber,
        session.currentQuestion.categoryId,
        session.mode,
        session.combo,
        session.config,
      ),
      summary: null,
    };
  }

  async endGame(userId: string, request: EndGameRequest): Promise<GameSummary> {
    const session = await this.dependencies.sessions.get(request.sessionId);
    if (!session) {
      const completed = await this.dependencies.repository.getCompletedGame(
        request.sessionId,
        userId,
      );
      if (!completed) {
        throw new SessionNotFoundError();
      }
      return toPublicSummary(completed);
    }
    this.assertOwnership(session, userId);
    if (session.status !== 'active') {
      return this.persistFinalizedState(session);
    }

    const endedAtMs = this.nowMs();
    const expectedVersion = session.version;
    const next: ServerGameState = {
      ...session,
      status: 'abandoned',
      currentQuestion: null,
      challengeStartedAtMs: null,
      completion: createSummaryCore(session, 'abandoned', endedAtMs),
    };
    await this.dependencies.sessions.save(next, expectedVersion);
    return this.persistFinalizedState(next);
  }

  private async getOwnedSession(
    userId: string,
    sessionId: string,
  ): Promise<ServerGameState> {
    const session = await this.dependencies.sessions.get(sessionId);
    if (!session) {
      throw new SessionNotFoundError();
    }
    this.assertOwnership(session, userId);
    return session;
  }

  private assertOwnership(session: ServerGameState, userId: string): void {
    if (session.userId !== userId) {
      throw new SessionOwnershipError();
    }
  }

  private createAttempt(
    session: ServerGameState,
    question: QuestionRecord,
    selectedOptionId: string,
    responseTimeMs: number,
    answeredAtMs: number,
    result: ReturnType<GameRuleEngine['resolveAnswer']>,
  ): ServerAttempt {
    return {
      id: this.createId(),
      questionId: question.id,
      categoryId: question.categoryId,
      questionNumber: session.questionNumber,
      selectedOptionId,
      wasCorrect: result.wasCorrect,
      timedOut: result.timedOut,
      responseTimeMs,
      basePoints: result.basePoints,
      comboMultiplier: result.comboMultiplier,
      comboBeforeAnswer: session.combo,
      pointsAwarded: result.pointsAwarded,
      answeredAt: new Date(answeredAtMs).toISOString(),
    };
  }

  private async persistFinalizedState(session: ServerGameState): Promise<GameSummary> {
    if (!session.completion) {
      throw new GameError(
        'The ended session is missing its completion record.',
        'INTERNAL_ERROR',
        500,
      );
    }
    const game: CompletedGame = {
      summary: session.completion,
      userId: session.userId,
      categoriesPlayed: session.enabledCategories,
      attempts: session.attempts,
    };
    const completion = await this.dependencies.repository.completeGame(
      game,
      session.config,
    );
    await this.dependencies.sessions.delete(session.sessionId);
    return toPublicSummary(completion);
  }
}

function normalizeCategories(
  requested: CategoryId[] | undefined,
  config: ServerGameState['config'],
): CategoryId[] {
  const ordered = (Object.keys(config.categories) as CategoryId[])
    .filter((categoryId) => config.categories[categoryId].isActive)
    .sort(
      (left, right) =>
        config.categories[left].sortOrder - config.categories[right].sortOrder,
    );
  if (!requested || requested.length === 0) {
    return ordered;
  }
  const requestedSet = new Set(requested);
  return ordered.filter((categoryId) => requestedSet.has(categoryId));
}

function createSummaryCore(
  state: ServerGameState,
  endReason: EndReason,
  endedAtMs: number,
): GameSummaryCore {
  const completed = endReason !== 'abandoned';
  const questionsAnswered = state.attempts.length;
  const averageResponseTimeMs =
    questionsAnswered === 0
      ? 0
      : Math.round(
          state.attempts.reduce((total, attempt) => total + attempt.responseTimeMs, 0) /
            questionsAnswered,
        );
  return {
    sessionId: state.sessionId,
    mode: state.mode,
    endReason,
    finalScore: state.score,
    xpEarned: calculateXp(
      {
        mode: state.mode,
        correctAnswers: state.correctAnswers,
        highestCombo: state.highestCombo,
        completed,
      },
      state.config,
    ),
    correctCount: state.correctAnswers,
    incorrectCount: state.incorrectAnswers,
    questionsAnswered,
    highestCombo: state.highestCombo,
    averageResponseTimeMs,
    startedAt: new Date(state.startedAtMs).toISOString(),
    endedAt: new Date(endedAtMs).toISOString(),
  };
}

function toPublicState(session: ServerGameState): PublicGameState {
  return {
    sessionId: session.sessionId,
    status: session.status,
    mode: session.mode,
    enabledCategories: session.enabledCategories,
    configVersion: session.config.version,
    score: session.score,
    lives: session.lives,
    combo: session.combo,
    highestCombo: session.highestCombo,
    questionNumber: session.questionNumber,
    correctAnswers: session.correctAnswers,
    incorrectAnswers: session.incorrectAnswers,
  };
}

function toPublicSummary(completion: CompletionResult): GameSummary {
  return {
    ...completion.summary,
    totalXp: completion.profile.totalXp,
    level: completion.profile.level,
    leveledUp: completion.profile.level > completion.previousLevel,
    currentStreak: completion.profile.currentStreak,
    newHighScore:
      completion.summary.mode === 'ARCADE' &&
      completion.summary.finalScore > completion.previousHighestScore,
  };
}
