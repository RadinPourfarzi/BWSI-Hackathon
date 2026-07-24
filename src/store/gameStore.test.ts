import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { DUMMY_QUESTIONS } from '@/lib/dummyQuestions';
import type { CategoryId } from '@/types/models';

const ALL: CategoryId[] = ['image', 'email', 'audio'];
const T0 = 1_000_000; // fixed clock so answers land in the plateau (0ms elapsed)

function store() {
  return useGameStore.getState();
}

beforeEach(() => {
  store().reset();
});

describe('startRun', () => {
  it('initializes an Arcade run with lives, a current question, and index 1', () => {
    store().startRun({ mode: 'ARCADE', pool: DUMMY_QUESTIONS, enabledCategories: ALL, now: T0 });
    const s = store();
    expect(s.status).toBe('running');
    expect(s.lives).toBe(s.config.game.arcadeLives);
    expect(s.current).not.toBeNull();
    expect(s.questionIndex).toBe(1);
    expect(s.score).toBe(0);
    expect(s.combo).toBe(0);
  });

  it('only samples from enabled categories', () => {
    store().startRun({
      mode: 'ARCADE',
      pool: DUMMY_QUESTIONS,
      enabledCategories: ['image'],
      now: T0,
    });
    const s = store();
    const seen = [s.current, ...s.queue].every((q) => q?.categoryId === 'image');
    expect(seen).toBe(true);
  });
});

describe('answering', () => {
  it('awards full plateau points and grows the combo on correct answers', () => {
    store().startRun({ mode: 'ARCADE', pool: DUMMY_QUESTIONS, enabledCategories: ALL, now: T0 });

    const q1 = store().current!;
    const out1 = store().answer(q1.isAi, T0)!; // 0ms elapsed -> plateau -> 100 * 1x
    expect(out1.isCorrect).toBe(true);
    expect(out1.pointsAwarded).toBe(100);
    expect(store().score).toBe(100);
    expect(store().combo).toBe(1);

    store().next(T0);
    const q2 = store().current!;
    const out2 = store().answer(q2.isAi, T0)!; // combo index 1 -> 1.5x -> 150
    expect(out2.pointsAwarded).toBe(150);
    expect(store().score).toBe(250);
    expect(store().combo).toBe(2);
    expect(store().maxCombo).toBe(2);
  });

  it('deducts a life and resets the combo on a wrong answer', () => {
    store().startRun({ mode: 'ARCADE', pool: DUMMY_QUESTIONS, enabledCategories: ALL, now: T0 });
    const q1 = store().current!;
    store().answer(q1.isAi, T0); // correct -> combo 1
    store().next(T0);

    const q2 = store().current!;
    const out = store().answer(!q2.isAi, T0)!; // wrong
    expect(out.isCorrect).toBe(false);
    expect(out.pointsAwarded).toBe(0);
    expect(store().combo).toBe(0);
    expect(store().lives).toBe(store().config.game.arcadeLives - 1);
  });

  it('records one attempt per answer with the question index', () => {
    store().startRun({ mode: 'ARCADE', pool: DUMMY_QUESTIONS, enabledCategories: ALL, now: T0 });
    store().answer(store().current!.isAi, T0);
    store().next(T0);
    store().answer(store().current!.isAi, T0);
    const attempts = store().attempts;
    expect(attempts).toHaveLength(2);
    expect(attempts[0].questionIndex).toBe(1);
    expect(attempts[1].questionIndex).toBe(2);
  });

  it('returns null when answering while not running', () => {
    expect(store().answer(true, T0)).toBeNull();
  });
});

describe('game over', () => {
  it('ends the Arcade run once lives reach 0', () => {
    store().startRun({ mode: 'ARCADE', pool: DUMMY_QUESTIONS, enabledCategories: ALL, now: T0 });
    // Three wrong answers exhaust the 3 default lives.
    for (let i = 0; i < 3; i++) {
      const q = store().current!;
      store().answer(!q.isAi, T0);
      store().next(T0);
    }
    expect(store().lives).toBe(0);
    expect(store().status).toBe('gameover');
  });
});

describe('training mode', () => {
  it('has unlimited lives and does not end on wrong answers', () => {
    store().startRun({ mode: 'TRAINING', pool: DUMMY_QUESTIONS, enabledCategories: ALL, now: T0 });
    expect(store().lives).toBe(Number.POSITIVE_INFINITY);
    for (let i = 0; i < 3; i++) {
      const q = store().current!;
      store().answer(!q.isAi, T0);
      store().next(T0);
    }
    expect(store().status).toBe('running');
    expect(store().lives).toBe(Number.POSITIVE_INFINITY);
  });
});
