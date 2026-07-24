import { describe, expect, it } from 'vitest';
import { MOCK_QUESTIONS } from '@/database/mock/challenges';
import { toPublicQuestion } from '@/shared/utilities/question-public.mapper';

describe('toPublicQuestion', () => {
  it('strips the private answer and explanation', () => {
    const publicQuestion = toPublicQuestion(MOCK_QUESTIONS[0]!);
    expect(publicQuestion).not.toHaveProperty('correctOptionId');
    expect(publicQuestion).not.toHaveProperty('explanation');
  });

  it('keeps the renderer content and answer buttons', () => {
    const publicQuestion = toPublicQuestion(MOCK_QUESTIONS[5]!);
    expect(publicQuestion).toMatchObject({
      categoryId: 'email',
      content: { kind: 'email' },
      options: [
        { id: 'scam', label: 'Scam' },
        { id: 'legit', label: 'Legitimate' },
      ],
    });
  });

  it('returns copies instead of mutable private references', () => {
    const privateQuestion = structuredClone(MOCK_QUESTIONS[0]!);
    const publicQuestion = toPublicQuestion(privateQuestion);
    publicQuestion.options[0]!.label = 'changed';
    expect(privateQuestion.options[0]!.label).not.toBe('changed');
  });
});
