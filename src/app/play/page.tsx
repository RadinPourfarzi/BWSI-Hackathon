'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useGameEngine } from '@/hooks/useGameEngine';
import { useScoringTimer } from '@/hooks/useScoringTimer';
import { useGameStore } from '@/store/gameStore';
import { ChallengeMedia } from '@/categories/CategoryRegistry';
import { HudBar } from '@/components/HudBar';
import { MediaContainer } from '@/components/MediaContainer';
import { TimerBar } from '@/components/TimerBar';
import { AnswerButtons } from '@/components/AnswerButtons';
import { GameOverSummary } from '@/components/GameOverSummary';
import { DUMMY_QUESTIONS } from '@/lib/dummyQuestions';
import { computeRunXp } from '@/lib/progression';
import { DEFAULT_ACTIVE_CONFIG, UI_CONFIG, XP_CONFIG } from '@/config';
import type { AnswerOutcome } from '@/store/gameStore';

export default function PlayPage() {
  const router = useRouter();
  const engine = useGameEngine();
  const timer = useScoringTimer();
  const maxLives = useGameStore((s) => s.config.game.arcadeLives);
  const enabledCategories = useGameStore((s) => s.enabledCategories);

  const { status, current, answer, next, reset } = engine;
  const [feedback, setFeedback] = useState<AnswerOutcome | null>(null);

  const handleAnswer = useCallback(
    (choiceIsAi: boolean) => {
      if (status !== 'running' || feedback !== null) {
        return;
      }
      const outcome = answer(choiceIsAi);
      if (outcome === null) {
        return;
      }
      setFeedback(outcome);
      window.setTimeout(() => {
        setFeedback(null);
        next();
      }, UI_CONFIG.feedbackHoldMs);
    },
    [status, feedback, answer, next],
  );

  // Keyboard shortcuts: A / ArrowLeft = AI, D / ArrowRight = REAL.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'arrowleft' || key === 'a') {
        handleAnswer(true);
      } else if (key === 'arrowright' || key === 'd') {
        handleAnswer(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleAnswer]);

  // No active run (e.g. hard refresh) — send the player back to start one.
  if (status === 'idle') {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
        <p className="text-zinc-500 dark:text-zinc-400">No active game.</p>
        <Link
          href="/"
          className="rounded-xl bg-zinc-900 px-5 py-3 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Go to start
        </Link>
      </div>
    );
  }

  if (status === 'gameover') {
    const correct = engine.attempts.filter((a) => a.isCorrect).length;
    const xpAwarded = computeRunXp(correct, engine.maxCombo, XP_CONFIG);
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-10">
        <GameOverSummary
          mode={engine.mode}
          score={engine.score}
          maxCombo={engine.maxCombo}
          questionsAnswered={engine.attempts.length}
          correct={correct}
          xpAwarded={xpAwarded}
          onPlayAgain={() =>
            useGameStore.getState().startRun({
              mode: engine.mode,
              pool: DUMMY_QUESTIONS,
              enabledCategories,
              config: DEFAULT_ACTIVE_CONFIG,
            })
          }
          onHome={() => {
            reset();
            router.push('/');
          }}
        />
      </div>
    );
  }

  if (current === null) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-6">
      <HudBar
        score={engine.score}
        lives={engine.lives}
        maxLives={maxLives}
        combo={engine.combo}
        mode={engine.mode}
        categoryId={current.categoryId}
      />

      <div className="relative">
        <MediaContainer>
          <ChallengeMedia question={current} />
        </MediaContainer>

        {feedback !== null && (
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-xl text-white ${
              feedback.isCorrect ? 'bg-emerald-600/85' : 'bg-red-600/85'
            }`}
          >
            <span className="text-4xl">{feedback.isCorrect ? '✓' : '✗'}</span>
            <span className="text-lg font-semibold">
              {feedback.isCorrect ? `+${feedback.pointsAwarded}` : 'Wrong'}
            </span>
            <span className="text-sm opacity-90">
              It was {feedback.correctIsAi ? 'AI' : 'REAL'}
            </span>
          </div>
        )}
      </div>

      <TimerBar
        fraction={timer.fraction}
        remainingMs={timer.remainingMs}
        obtainablePoints={timer.obtainablePoints}
      />

      <AnswerButtons onAnswer={handleAnswer} disabled={feedback !== null} />

      <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
        <span>Question {engine.questionIndex}</span>
        <Link href="/" onClick={() => reset()} className="hover:underline">
          Exit
        </Link>
      </div>
    </div>
  );
}
