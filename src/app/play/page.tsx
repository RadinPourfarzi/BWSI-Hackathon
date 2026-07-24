'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameEngine } from '@/hooks/useGameEngine';
import { useScoringTimer } from '@/hooks/useScoringTimer';
import { useGameStore } from '@/store/gameStore';
import { createClient } from '@/lib/supabase/client';
import { fetchQuestionBatch, submitRun } from '@/lib/questions';
import { ChallengeMedia } from '@/categories/CategoryRegistry';
import { HudBar } from '@/components/HudBar';
import { MediaContainer } from '@/components/MediaContainer';
import { TimerBar } from '@/components/TimerBar';
import { AnswerButtons } from '@/components/AnswerButtons';
import { CallOverlay } from '@/components/CallOverlay';
import { TrainingResult } from '@/components/TrainingResult';
import { GameOverSummary } from '@/components/GameOverSummary';
import { computeRunXp } from '@/lib/progression';
import { UI_CONFIG, XP_CONFIG } from '@/config';
import type { AnswerOutcome } from '@/store/gameStore';
import type { RunResult } from '@/types/models';

export default function PlayPage() {
  const router = useRouter();
  const engine = useGameEngine();
  const timer = useScoringTimer();
  const maxLives = useGameStore((s) => s.config.game.arcadeLives);
  const enabledCategories = engine.enabledCategories;

  const { status, current, answer, next, reset, enqueue } = engine;
  const isTraining = engine.mode === 'TRAINING';
  const [feedback, setFeedback] = useState<AnswerOutcome | null>(null);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const prefetchingRef = useRef(false);
  const submittedRef = useRef(false);
  const [timedOut, setTimedOut] = useState(false);

  const handleAnswer = useCallback(
    (choiceIsAi: boolean) => {
      if (status !== 'running' || feedback !== null) {
        return;
      }
      const outcome = answer(choiceIsAi);
      if (outcome === null) {
        return;
      }
      setTimedOut(false);
      setFeedback(outcome);
      // Arcade auto-advances after a brief flash; Training waits for a manual Next.
      if (!isTraining) {
        window.setTimeout(() => {
          setFeedback(null);
          next();
        }, UI_CONFIG.motion.callMs);
      }
    },
    [status, feedback, answer, next, isTraining],
  );

  // Timer expiry (Arcade) — count as a wrong answer: lose a life, reset combo, 0 points.
  const handleTimeout = useCallback(() => {
    if (status !== 'running' || feedback !== null || current === null) {
      return;
    }
    const outcome = answer(!current.isAi); // force incorrect
    if (outcome === null) {
      return;
    }
    setTimedOut(true);
    setFeedback(outcome);
    window.setTimeout(() => {
      setTimedOut(false);
      setFeedback(null);
      next();
    }, UI_CONFIG.motion.callMs);
  }, [status, feedback, current, answer, next]);

  const goNext = useCallback(() => {
    setTimedOut(false);
    setFeedback(null);
    next();
  }, [next]);

  // Keyboard: A/← = AI, D/→ = REAL. In Training, Enter/Space advances after answering.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (feedback !== null) {
        if (isTraining && (key === 'enter' || key === ' ' || key === 'arrowright')) {
          e.preventDefault();
          goNext();
        }
        return;
      }
      if (key === 'arrowleft' || key === 'a') {
        handleAnswer(true);
      } else if (key === 'arrowright' || key === 'd') {
        handleAnswer(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleAnswer, goNext, feedback, isTraining]);

  // Time's up (Arcade only) — auto-resolve the question as wrong.
  useEffect(() => {
    if (isTraining || status !== 'running' || feedback !== null || current === null) {
      return;
    }
    if (timer.remainingMs > 0) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- timeout resolves the question
    handleTimeout();
  }, [isTraining, status, feedback, current, timer.remainingMs, handleTimeout]);

  // Background top-up: fetch more questions when the queue runs low (project-plan §7).
  useEffect(() => {
    if (status !== 'running' || prefetchingRef.current) {
      return;
    }
    if (engine.remainingInQueue >= engine.config.game.prefetchThreshold) {
      return;
    }
    prefetchingRef.current = true;
    const supabase = createClient();
    fetchQuestionBatch(supabase, {
      categories: enabledCategories,
      limit: engine.config.game.batchSize,
      excludeIds: engine.loadedIds,
    })
      .then((batch) => enqueue(batch))
      .catch(() => {
        // Non-fatal: the run can still end naturally if the pool is exhausted.
      })
      .finally(() => {
        prefetchingRef.current = false;
      });
  }, [
    status,
    engine.remainingInQueue,
    engine.config.game.prefetchThreshold,
    engine.config.game.batchSize,
    engine.loadedIds,
    enabledCategories,
    enqueue,
  ]);

  // Submit the run once on game over; the server recomputes authoritative score/XP/streak.
  useEffect(() => {
    if (status !== 'gameover' || submittedRef.current || engine.attempts.length === 0) {
      return;
    }
    submittedRef.current = true;
    const supabase = createClient();
    submitRun(supabase, {
      mode: engine.mode,
      categoriesPlayed: enabledCategories,
      attempts: engine.attempts,
    })
      .then((result) => setRunResult(result))
      .catch(() => {
        // Keep the client-side estimate on screen if submission fails.
      });
  }, [status, engine.mode, engine.attempts, enabledCategories]);

  // No active run (e.g. hard refresh) — send the player back to start one.
  if (status === 'idle') {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
        <p className="text-muted">No active run.</p>
        <Link href="/" className="bg-text font-display text-ink-900 rounded-xl px-5 py-3 font-bold">
          Back to start
        </Link>
      </div>
    );
  }

  if (status === 'gameover') {
    const correct = engine.attempts.filter((a) => a.isCorrect).length;
    // Prefer the server-authoritative result; fall back to a client estimate until it lands.
    const score = runResult?.finalScore ?? engine.score;
    const maxCombo = runResult?.maxCombo ?? engine.maxCombo;
    const answered = runResult?.questionsAnswered ?? engine.attempts.length;
    const xpAwarded = runResult?.xpAwarded ?? computeRunXp(correct, engine.maxCombo, XP_CONFIG);
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-10">
        <GameOverSummary
          mode={engine.mode}
          score={score}
          maxCombo={maxCombo}
          questionsAnswered={answered}
          correct={correct}
          xpAwarded={xpAwarded}
          onPlayAgain={async () => {
            const supabase = createClient();
            const batch = await fetchQuestionBatch(supabase, {
              categories: enabledCategories,
              limit: engine.config.game.batchSize,
            });
            if (batch.length === 0) {
              router.push('/');
              return;
            }
            submittedRef.current = false;
            setRunResult(null);
            setFeedback(null);
            useGameStore.getState().startRun({
              mode: engine.mode,
              pool: batch,
              enabledCategories,
              config: engine.config,
            });
          }}
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
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-1 flex-col gap-3 px-4 py-4 sm:gap-4 sm:px-6 sm:py-6">
      <HudBar
        score={engine.score}
        lives={engine.lives}
        maxLives={maxLives}
        combo={engine.combo}
        mode={engine.mode}
        categoryId={current.categoryId}
        correct={engine.attempts.filter((a) => a.isCorrect).length}
        answered={engine.attempts.length}
      />

      <div className="flex flex-1 flex-col justify-center gap-3 sm:gap-4">
        <div className="relative">
          <MediaContainer>
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: UI_CONFIG.motion.questionEnterMs / 1000,
                ease: UI_CONFIG.motion.ease,
              }}
              className="flex h-full w-full items-center justify-center"
            >
              <ChallengeMedia question={current} />
            </motion.div>
          </MediaContainer>

          {/* "The Call": Arcade shows the fast flash over the media; Training keeps it visible. */}
          <AnimatePresence>
            {feedback !== null && !isTraining && (
              <CallOverlay outcome={feedback} timedOut={timedOut} />
            )}
          </AnimatePresence>
        </div>

        {/* Timer/decay only exist in Arcade. */}
        {!isTraining && (
          <TimerBar
            fraction={timer.fraction}
            remainingMs={timer.remainingMs}
            obtainablePoints={timer.obtainablePoints}
          />
        )}
      </div>

      {isTraining && feedback !== null ? (
        <TrainingResult outcome={feedback} explanation={current.explanationText} onNext={goNext} />
      ) : (
        <AnswerButtons onAnswer={handleAnswer} disabled={feedback !== null} />
      )}

      <div className="text-muted flex items-center justify-between font-mono text-xs tracking-[0.15em] uppercase">
        <span>Q{engine.questionIndex}</span>
        <Link href="/" onClick={() => reset()} className="hover:text-text">
          Exit
        </Link>
      </div>
    </div>
  );
}
