import { describe, expect, it } from 'vitest';
import { DEFAULT_GAME_CONFIG } from '@/config/game.config';
import { MOCK_QUESTIONS } from '@/database/mock/challenges';
import { GameRuleEngine, type ResolveAnswerInput } from '@/server/game/rule-engine';

const engine = new GameRuleEngine();
const imageQuestion = MOCK_QUESTIONS[0]!;

function input(overrides: Partial<ResolveAnswerInput> = {}): ResolveAnswerInput {
  return {
    mode: 'ARCADE',
    questionNumber: 1,
    scoreBeforeAnswer: 0,
    comboBeforeAnswer: 0,
    highestComboBeforeAnswer: 0,
    livesBeforeAnswer: 3,
    selectedOptionId: imageQuestion.correctOptionId,
    responseTimeMs: 1_000,
    question: imageQuestion,
    config: DEFAULT_GAME_CONFIG,
    ...overrides,
  };
}

describe('GameRuleEngine', () => {
  it('increments score and combo after a correct Arcade answer', () => {
    expect(engine.resolveAnswer(input())).toMatchObject({
      wasCorrect: true,
      pointsAwarded: 100,
      scoreAfterAnswer: 100,
      comboAfterAnswer: 1,
      highestComboAfterAnswer: 1,
      livesAfterAnswer: 3,
      gameEnded: false,
    });
  });

  it('uses the combo that existed before the answer', () => {
    expect(
      engine.resolveAnswer(
        input({
          comboBeforeAnswer: 2,
          highestComboBeforeAnswer: 2,
        }),
      ).pointsAwarded,
    ).toBe(200);
  });

  it('resets combo and removes a life for a wrong answer', () => {
    const result = engine.resolveAnswer(
      input({
        scoreBeforeAnswer: 500,
        comboBeforeAnswer: 4,
        highestComboBeforeAnswer: 4,
        selectedOptionId: 'real',
      }),
    );
    expect(result).toMatchObject({
      wasCorrect: false,
      pointsAwarded: 0,
      scoreAfterAnswer: 500,
      comboAfterAnswer: 0,
      highestComboAfterAnswer: 4,
      livesAfterAnswer: 2,
    });
    expect(result.events).toContainEqual({ type: 'combo-reset' });
    expect(result.events).toContainEqual({
      type: 'life-lost',
      livesRemaining: 2,
    });
  });

  it('ends Arcade at zero lives', () => {
    const result = engine.resolveAnswer(
      input({
        livesBeforeAnswer: 1,
        selectedOptionId: 'real',
      }),
    );
    expect(result.gameEnded).toBe(true);
    expect(result.events).toContainEqual({
      type: 'game-ended',
      reason: 'lives-depleted',
    });
  });

  it('classifies a matching late answer as a timeout', () => {
    const result = engine.resolveAnswer(input({ responseTimeMs: 15_751 }));
    expect(result).toMatchObject({
      actuallyCorrect: true,
      wasCorrect: false,
      timedOut: true,
      pointsAwarded: 0,
      livesAfterAnswer: 2,
    });
    expect(result.events[0]).toEqual({
      type: 'answer-timeout',
      correctOptionId: 'ai',
    });
  });

  it('does not score, time out, combo, or remove lives in Training', () => {
    const result = engine.resolveAnswer(
      input({
        mode: 'TRAINING',
        livesBeforeAnswer: null,
        responseTimeMs: 60_000,
      }),
    );
    expect(result).toMatchObject({
      wasCorrect: true,
      timedOut: false,
      pointsAwarded: 0,
      scoreAfterAnswer: 0,
      comboAfterAnswer: 0,
      livesAfterAnswer: null,
      gameEnded: false,
    });
  });

  it('keeps a wrong Training answer incorrect without life loss', () => {
    const result = engine.resolveAnswer(
      input({
        mode: 'TRAINING',
        livesBeforeAnswer: null,
        selectedOptionId: 'real',
      }),
    );
    expect(result).toMatchObject({
      wasCorrect: false,
      livesAfterAnswer: null,
      comboAfterAnswer: 0,
    });
  });

  it('returns round-specific timer and effective plateau', () => {
    expect(engine.roundRulesFor(1, 'audio', 'ARCADE', 0, DEFAULT_GAME_CONFIG)).toEqual({
      questionNumber: 1,
      maxPoints: 100,
      timerMs: 15_000,
      effectivePlateauMs: 6_500,
      comboMultiplier: 1,
    });
  });

  it('returns timer-free rules for Training', () => {
    expect(
      engine.roundRulesFor(1, 'email', 'TRAINING', 9, DEFAULT_GAME_CONFIG),
    ).toMatchObject({
      maxPoints: 0,
      timerMs: null,
      comboMultiplier: 1,
    });
  });
});
