import { describe, expect, it } from 'vitest';
import { MOCK_QUESTIONS } from '@/database/mock/challenges';
import { evaluateAnswer } from '@/server/game/answer-evaluator';

const question = MOCK_QUESTIONS[0]!;

describe('evaluateAnswer', () => {
  it('accepts the configured option ID', () => {
    expect(evaluateAnswer(question.correctOptionId, question)).toEqual({
      selectedOptionId: question.correctOptionId,
      correctOptionId: question.correctOptionId,
      wasCorrect: true,
    });
  });

  it('rejects a different option ID', () => {
    expect(evaluateAnswer('real', question).wasCorrect).toBe(false);
  });

  it('returns truth from the private question rather than client data', () => {
    const result = evaluateAnswer('made-up-option', question);
    expect(result).toMatchObject({
      selectedOptionId: 'made-up-option',
      correctOptionId: 'ai',
      wasCorrect: false,
    });
  });
});
