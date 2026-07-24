import { describe, expect, it } from 'vitest';
import { MOCK_QUESTIONS } from '@/database/mock/challenges';
import { MockGameRepository } from '@/database/mock/mock-game.repository';
import { GameError } from '@/server/errors/game.errors';
import { GameSessionService } from '@/server/game/game-session.service';
import { RandomQuestionSelector } from '@/server/game/question-selector';
import { GameRuleEngine } from '@/server/game/rule-engine';
import type {
  CompletedGame,
  CompletionResult,
} from '@/server/repositories/game.repository';
import { InMemoryActiveSessionStore } from '@/server/sessions/active-session.store';
import type {
  ActiveGameConfig,
  PublicQuestion,
  QuestionRecord,
} from '@/shared/types/game.types';

const USER_ID = '99999999-9999-4999-8999-999999999999';
const OTHER_USER_ID = '88888888-8888-4888-8888-888888888888';
const SESSION_ID = '77777777-7777-4777-8777-777777777777';
const GENERATED_IDS = [
  SESSION_ID,
  '70000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000002',
  '70000000-0000-4000-8000-000000000003',
  '70000000-0000-4000-8000-000000000004',
  '70000000-0000-4000-8000-000000000005',
];

function createHarness(options?: {
  questions?: QuestionRecord[];
  repository?: MockGameRepository;
}) {
  const repository =
    options?.repository ?? new MockGameRepository(options?.questions ?? MOCK_QUESTIONS);
  const sessions = new InMemoryActiveSessionStore();
  let now = 1_000_000;
  let idIndex = 0;
  const service = new GameSessionService({
    repository,
    sessions,
    selector: new RandomQuestionSelector(repository, () => 0),
    rules: new GameRuleEngine(),
    nowMs: () => now,
    createId: () => {
      const id = GENERATED_IDS[idIndex];
      idIndex += 1;
      if (!id) {
        throw new Error('Test ran out of deterministic IDs.');
      }
      return id;
    },
  });

  return {
    repository,
    sessions,
    service,
    advance(milliseconds: number) {
      now += milliseconds;
    },
  };
}

function wrongOption(question: PublicQuestion): string {
  const privateQuestion = MOCK_QUESTIONS.find(
    (candidate) => candidate.id === question.id,
  );
  if (!privateQuestion) {
    throw new Error(`Missing private test question ${question.id}.`);
  }
  return (
    question.options.find((option) => option.id !== privateQuestion.correctOptionId)
      ?.id ?? 'invalid'
  );
}

describe('GameSessionService', () => {
  it('starts with server state, round rules, and no answer key', async () => {
    const harness = createHarness();
    const start = await harness.service.startGame(USER_ID, {
      mode: 'ARCADE',
      categories: ['image'],
    });

    expect(start.state).toMatchObject({
      status: 'active',
      configVersion: 1,
      score: 0,
      lives: 3,
      combo: 0,
      questionNumber: 1,
    });
    expect(start.roundRules).toMatchObject({
      questionNumber: 1,
      timerMs: 15_000,
    });
    expect(start.challenge).not.toHaveProperty('correctOptionId');
    expect(start.challenge).not.toHaveProperty('explanation');
  });

  it('defaults to every active category in configured order', async () => {
    const harness = createHarness();
    const start = await harness.service.startGame(USER_ID, {
      mode: 'ARCADE',
    });
    expect(start.state.enabledCategories).toEqual(['image', 'email', 'audio']);
  });

  it('deduplicates requested categories', async () => {
    const harness = createHarness();
    const start = await harness.service.startGame(USER_ID, {
      mode: 'ARCADE',
      categories: ['email', 'email'],
    });
    expect(start.state.enabledCategories).toEqual(['email']);
  });

  it('runs an authoritative correct-answer loop', async () => {
    const harness = createHarness();
    const start = await harness.service.startGame(USER_ID, {
      mode: 'ARCADE',
      categories: ['image'],
    });
    harness.advance(1_000);

    const answer = await harness.service.submitAnswer(USER_ID, {
      sessionId: SESSION_ID,
      challengeId: start.challenge.id,
      selectedOptionId: 'ai',
    });

    expect(answer).toMatchObject({
      wasCorrect: true,
      timedOut: false,
      basePoints: 100,
      comboMultiplier: 1,
      pointsAwarded: 100,
      responseTimeMs: 1_000,
      state: {
        score: 100,
        lives: 3,
        combo: 1,
        questionNumber: 2,
      },
      gameEnded: false,
      summary: null,
    });
    expect(answer.nextChallenge).not.toBeNull();
    expect(answer.nextChallenge).not.toHaveProperty('correctOptionId');
  });

  it('rejects access by another user', async () => {
    const harness = createHarness();
    await harness.service.startGame(USER_ID, {
      mode: 'ARCADE',
      categories: ['image'],
    });

    await expect(
      harness.service.getGame(OTHER_USER_ID, SESSION_ID),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('rejects a stale duplicate challenge submission', async () => {
    const harness = createHarness();
    const start = await harness.service.startGame(USER_ID, {
      mode: 'ARCADE',
      categories: ['image'],
    });
    await harness.service.submitAnswer(USER_ID, {
      sessionId: SESSION_ID,
      challengeId: start.challenge.id,
      selectedOptionId: 'ai',
    });

    await expect(
      harness.service.submitAnswer(USER_ID, {
        sessionId: SESSION_ID,
        challengeId: start.challenge.id,
        selectedOptionId: 'ai',
      }),
    ).rejects.toMatchObject({
      code: 'STALE_CHALLENGE',
      status: 409,
    });
  });

  it('rejects an option that is not displayed by the challenge', async () => {
    const harness = createHarness();
    const start = await harness.service.startGame(USER_ID, {
      mode: 'ARCADE',
      categories: ['image'],
    });

    await expect(
      harness.service.submitAnswer(USER_ID, {
        sessionId: SESSION_ID,
        challengeId: start.challenge.id,
        selectedOptionId: 'scam',
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_OPTION',
      status: 400,
    });
  });

  it('does not reset the server timer when a session is re-fetched', async () => {
    const harness = createHarness();
    const start = await harness.service.startGame(USER_ID, {
      mode: 'ARCADE',
      categories: ['image'],
    });
    harness.advance(1_000);
    const current = await harness.service.getGame(USER_ID, SESSION_ID);
    expect(current.challenge?.id).toBe(start.challenge.id);
    harness.advance(1_000);

    const answer = await harness.service.submitAnswer(USER_ID, {
      sessionId: SESSION_ID,
      challengeId: start.challenge.id,
      selectedOptionId: 'ai',
    });
    expect(answer.responseTimeMs).toBe(2_000);
  });

  it('ends Arcade after the third lost life and persists analytics', async () => {
    const harness = createHarness();
    const start = await harness.service.startGame(USER_ID, {
      mode: 'ARCADE',
    });
    let question = start.challenge;
    let finalAnswer:
      Awaited<ReturnType<GameSessionService['submitAnswer']>> | undefined;

    for (let index = 0; index < 3; index += 1) {
      harness.advance(500);
      finalAnswer = await harness.service.submitAnswer(USER_ID, {
        sessionId: SESSION_ID,
        challengeId: question.id,
        selectedOptionId: wrongOption(question),
      });
      if (finalAnswer.nextChallenge) {
        question = finalAnswer.nextChallenge;
      }
    }

    expect(finalAnswer).toMatchObject({
      gameEnded: true,
      state: { status: 'completed', lives: 0 },
      summary: {
        endReason: 'lives-depleted',
        questionsAnswered: 3,
        incorrectCount: 3,
        finalScore: 0,
      },
    });
    expect(await harness.sessions.get(SESSION_ID)).toBeNull();
    expect(await harness.repository.getAnalytics(USER_ID)).toMatchObject({
      attempts: 3,
      correct: 0,
    });
  });

  it('treats a matching late Arcade answer as incorrect and loses a life', async () => {
    const harness = createHarness();
    const start = await harness.service.startGame(USER_ID, {
      mode: 'ARCADE',
      categories: ['image'],
    });
    harness.advance(15_751);
    const answer = await harness.service.submitAnswer(USER_ID, {
      sessionId: SESSION_ID,
      challengeId: start.challenge.id,
      selectedOptionId: 'ai',
    });
    expect(answer).toMatchObject({
      wasCorrect: false,
      timedOut: true,
      pointsAwarded: 0,
      state: { lives: 2 },
    });
  });

  it('ignores timers and returns explanations in Training', async () => {
    const harness = createHarness();
    const start = await harness.service.startGame(USER_ID, {
      mode: 'TRAINING',
      categories: ['image'],
    });
    harness.advance(60_000);
    const answer = await harness.service.submitAnswer(USER_ID, {
      sessionId: SESSION_ID,
      challengeId: start.challenge.id,
      selectedOptionId: 'ai',
    });
    expect(answer).toMatchObject({
      wasCorrect: true,
      timedOut: false,
      pointsAwarded: 0,
      state: { lives: null, score: 0, combo: 0 },
    });
    expect(answer.explanation).toBeTruthy();
  });

  it('ends a completed run when its question pool is exhausted', async () => {
    const harness = createHarness({ questions: [MOCK_QUESTIONS[0]!] });
    const start = await harness.service.startGame(USER_ID, {
      mode: 'ARCADE',
      categories: ['image'],
    });
    const answer = await harness.service.submitAnswer(USER_ID, {
      sessionId: SESSION_ID,
      challengeId: start.challenge.id,
      selectedOptionId: 'ai',
    });
    expect(answer).toMatchObject({
      gameEnded: true,
      nextChallenge: null,
      summary: {
        endReason: 'pool-exhausted',
        xpEarned: 65,
        questionsAnswered: 1,
      },
    });
  });

  it('marks manual exit abandoned and withholds completion XP', async () => {
    const harness = createHarness();
    const start = await harness.service.startGame(USER_ID, {
      mode: 'ARCADE',
      categories: ['image'],
    });
    await harness.service.submitAnswer(USER_ID, {
      sessionId: SESSION_ID,
      challengeId: start.challenge.id,
      selectedOptionId: 'ai',
    });
    const summary = await harness.service.endGame(USER_ID, {
      sessionId: SESSION_ID,
    });
    expect(summary).toMatchObject({
      endReason: 'abandoned',
      finalScore: 100,
      xpEarned: 15,
      questionsAnswered: 1,
    });
  });

  it('returns the same completed result after active state is removed', async () => {
    const harness = createHarness({ questions: [MOCK_QUESTIONS[0]!] });
    const start = await harness.service.startGame(USER_ID, {
      mode: 'ARCADE',
      categories: ['image'],
    });
    const answer = await harness.service.submitAnswer(USER_ID, {
      sessionId: SESSION_ID,
      challengeId: start.challenge.id,
      selectedOptionId: 'ai',
    });
    const recovered = await harness.service.getGame(USER_ID, SESSION_ID);
    expect(recovered).toMatchObject({
      state: null,
      challenge: null,
      summary: {
        sessionId: answer.summary?.sessionId,
        finalScore: answer.summary?.finalScore,
      },
    });
  });

  it('keeps ended state recoverable when completion persistence fails', async () => {
    const repository = new FlakyCompletionRepository([MOCK_QUESTIONS[0]!]);
    const harness = createHarness({ repository });
    const start = await harness.service.startGame(USER_ID, {
      mode: 'ARCADE',
      categories: ['image'],
    });

    await expect(
      harness.service.submitAnswer(USER_ID, {
        sessionId: SESSION_ID,
        challengeId: start.challenge.id,
        selectedOptionId: 'ai',
      }),
    ).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      status: 503,
    });
    expect(await harness.sessions.get(SESSION_ID)).toMatchObject({
      status: 'completed',
      completion: { endReason: 'pool-exhausted' },
    });

    const recovered = await harness.service.getGame(USER_ID, SESSION_ID);
    expect(recovered.summary).toMatchObject({
      endReason: 'pool-exhausted',
      finalScore: 100,
    });
    expect(await harness.sessions.get(SESSION_ID)).toBeNull();
  });

  it('rejects a start when the selected pool is empty', async () => {
    const harness = createHarness({ questions: [] });
    await expect(
      harness.service.startGame(USER_ID, {
        mode: 'ARCADE',
        categories: ['image'],
      }),
    ).rejects.toMatchObject({
      code: 'POOL_EMPTY',
      status: 422,
    });
  });
});

class FlakyCompletionRepository extends MockGameRepository {
  private failNextCompletion = true;

  override async completeGame(
    game: CompletedGame,
    config: ActiveGameConfig,
  ): Promise<CompletionResult> {
    if (this.failNextCompletion) {
      this.failNextCompletion = false;
      throw new GameError('Simulated persistence failure.', 'SERVICE_UNAVAILABLE', 503);
    }
    return super.completeGame(game, config);
  }
}
