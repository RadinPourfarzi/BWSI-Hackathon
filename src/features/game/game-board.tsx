"use client";

import {
  ArrowRight,
  Check,
  CircleAlert,
  Clock3,
  Flame,
  Gauge,
  Heart,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { categoryConfig, categoryIds } from "@/config/categories";
import { gameConfig } from "@/config/game";
import {
  calculateObtainablePoints,
  getComboMultiplier,
  getCurrentQuestionElapsedMs,
  getGameSummary,
  getQuestionRules,
} from "@/features/game/engine";
import { ChallengeRenderer } from "@/features/game/renderers/registry";
import {
  selectBatchError,
  selectBatchStatus,
  selectCombo,
  selectCurrentChallenge,
  selectEngine,
  selectLatestAttempt,
  selectLives,
  selectQuestionNumber,
  selectQueueLength,
  selectSaveError,
  selectSavedResult,
  selectSaveStatus,
  selectScore,
  selectStatus,
  useGameStore,
} from "@/features/game/store";
import type {
  BinaryChoice,
  GameEngineState,
  PersistedGameResult,
} from "@/features/game/types";
import type { PlayerSettings } from "@/features/settings/types";
import { cn, formatNumber } from "@/lib/utils";

function useQuestionClock(engine: GameEngineState | null): number {
  const expire = useGameStore((state) => state.expire);
  const [nowMs, setNowMs] = useState(0);
  const expiredQuestion = useRef<number | null>(null);

  useEffect(() => {
    if (!engine || engine.status !== "playing" || !engine.currentChallenge) {
      return;
    }

    expiredQuestion.current = null;
    let frame = 0;
    let lastPaint = 0;
    const rules = getQuestionRules(
      engine.currentChallenge.category,
      engine.questionNumber,
    );

    function tick(timestamp: number) {
      const elapsed = getCurrentQuestionElapsedMs(engine!, timestamp);

      if (timestamp - lastPaint >= 50) {
        lastPaint = timestamp;
        setNowMs(timestamp);
      }

      if (
        elapsed >= rules.timeLimitMs &&
        expiredQuestion.current !== engine!.questionNumber
      ) {
        expiredQuestion.current = engine!.questionNumber;
        expire(timestamp);
        return;
      }

      frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [
    engine?.currentChallenge?.id,
    engine?.questionNumber,
    engine?.status,
    engine,
    expire,
  ]);

  return nowMs;
}

function Lives({ lives }: { lives: number }) {
  return (
    <div
      aria-label={`${lives} ${lives === 1 ? "life" : "lives"} remaining`}
      className="flex items-center gap-1"
    >
      {Array.from({ length: gameConfig.initialLives }, (_, index) => (
        <Heart
          aria-hidden="true"
          className={cn(
            "size-4",
            index < lives
              ? "fill-[var(--pink)] text-[var(--pink)]"
              : "text-[#465168]",
          )}
          key={index}
        />
      ))}
    </div>
  );
}

function LoadingGame({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <Card className="mx-auto max-w-xl">
      <CardContent className="p-10 text-center">
        {error ? (
          <>
            <CircleAlert className="mx-auto size-9 text-[var(--danger)]" />
            <h2 className="mt-4 text-xl font-black">
              Could not load the next set
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {error}
            </p>
            <Button className="mt-6" onClick={onRetry}>
              Try again
            </Button>
          </>
        ) : (
          <div aria-live="polite" role="status">
            <LoaderCircle className="mx-auto size-9 animate-spin text-[var(--blue)]" />
            <h2 className="mt-4 text-xl font-black">Loading new signals</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Preparing a fresh, duplicate-free batch…
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PausedGame({ onDiscard }: { onDiscard: () => void }) {
  const resume = useGameStore((state) => state.resume);

  return (
    <Card className="mx-auto max-w-xl">
      <CardContent className="p-9 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full border border-[var(--blue)]/30 bg-[var(--blue)]/10">
          <Pause className="size-6 text-[var(--blue)]" />
        </span>
        <h2 className="mt-5 text-2xl font-black">Run paused</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          The question timer is stopped. Resume whenever you are ready.
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Button onClick={() => resume(performance.now())}>
            <Play className="size-4" />
            Resume
          </Button>
          <Button onClick={onDiscard} variant="danger">
            <RotateCcw className="size-4" />
            Discard run
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SaveMessage({
  status,
  error,
  result,
  onRetry,
}: {
  status: "idle" | "saving" | "saved" | "error";
  error: string | null;
  result: PersistedGameResult | null;
  onRetry: () => void;
}) {
  if (status === "saving" || status === "idle") {
    return (
      <p
        aria-live="polite"
        className="mt-5 inline-flex items-center gap-2 text-sm text-[var(--muted)]"
        role="status"
      >
        <LoaderCircle className="size-4 animate-spin" />
        Saving progress…
      </p>
    );
  }

  if (status === "saved") {
    return (
      <p
        aria-live="polite"
        className="mt-5 text-sm text-[var(--success)]"
        role="status"
      >
        {result?.duplicate
          ? "This run was already saved."
          : "Progress saved to your profile."}
      </p>
    );
  }

  return (
    <div
      className="mt-5 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/8 p-4 text-sm"
      role="alert"
    >
      <p className="text-[#efb4b7]">{error}</p>
      <Button className="mt-3" onClick={onRetry} size="sm" variant="secondary">
        Retry save
      </Button>
    </div>
  );
}

function GameOver({
  engine,
  initialBestScore,
  onDiscard,
  onRetrySave,
}: {
  engine: GameEngineState;
  initialBestScore: number;
  onDiscard: () => void;
  onRetrySave: () => void;
}) {
  const saveStatus = useGameStore(selectSaveStatus);
  const saveError = useGameStore(selectSaveError);
  const savedResult = useGameStore(selectSavedResult);
  const summary = getGameSummary(engine);

  if (!summary) return null;

  const xpEarned = savedResult?.xpEarned ?? summary.xpEarned;
  const isNewHighScore =
    engine.mode === "arcade" &&
    (savedResult?.isNewHighScore ?? summary.score > initialBestScore);
  const bestScore = Math.max(
    initialBestScore,
    savedResult?.score ?? summary.score,
  );

  return (
    <Card className="mx-auto max-w-3xl overflow-hidden">
      <CardContent className="p-7 sm:p-10">
        <div className="text-center">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-[#ffd166]/10">
            <Trophy className="size-9 text-[#ffd166]" />
          </span>
          <p className="mt-6 text-xs font-bold tracking-[0.2em] text-[var(--pink)] uppercase">
            {engine.mode === "arcade"
              ? "Arcade run complete"
              : "Training summary"}
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">
            {engine.mode === "arcade"
              ? `${formatNumber(summary.score)} points`
              : `${summary.accuracy}% accuracy`}
          </h1>
          <p className="mt-3 text-[var(--muted)]">
            {summary.correct} of {summary.answered} correct ·{" "}
            {formatNumber(xpEarned)} XP earned
          </p>
          {isNewHighScore ? (
            <Badge className="mt-4 border-[#ffd166]/35 bg-[#ffd166]/10 text-[#ffd166]">
              <Sparkles className="mr-1 size-3.5" />
              New high score
            </Badge>
          ) : null}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Accuracy", `${summary.accuracy}%`],
            [
              "Avg. response",
              `${(summary.averageResponseMs / 1_000).toFixed(1)}s`,
            ],
            ["Longest combo", `${summary.longestCombo}`],
            [
              engine.mode === "arcade" ? "Best score" : "Timed out",
              engine.mode === "arcade"
                ? formatNumber(bestScore)
                : `${summary.timedOut}`,
            ],
          ].map(([label, value]) => (
            <div
              className="rounded-xl border border-[var(--border)] bg-white/3 p-4 text-center"
              key={label}
            >
              <p className="text-xl font-black">{value}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{label}</p>
            </div>
          ))}
        </div>

        {Object.keys(summary.categoryBreakdown).length > 0 ? (
          <div className="mt-7 overflow-hidden rounded-xl border border-[var(--border)]">
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-[var(--border)] bg-white/3 px-4 py-3 text-xs font-bold text-[var(--muted)]">
              <span>Category</span>
              <span>Correct</span>
              <span>Accuracy</span>
            </div>
            {categoryIds.map((categoryId) => {
              const performance = summary.categoryBreakdown[categoryId];
              if (!performance) return null;
              const accuracy =
                performance.answered === 0
                  ? 0
                  : Math.round(
                      (performance.correct / performance.answered) * 100,
                    );

              return (
                <div
                  className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-[var(--border)] px-4 py-3 text-sm last:border-b-0"
                  key={categoryId}
                >
                  <span className="font-bold">
                    {categoryConfig[categoryId].shortName}
                  </span>
                  <span className="text-[var(--muted)]">
                    {performance.correct}/{performance.answered}
                  </span>
                  <span className="w-14 text-right font-black">
                    {accuracy}%
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="text-center">
          <SaveMessage
            error={saveError}
            onRetry={onRetrySave}
            result={savedResult}
            status={saveStatus}
          />
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Button onClick={onDiscard} size="lg" variant="secondary">
            <RotateCcw className="size-5" />
            New run
          </Button>
          <Link
            className={buttonClassName({ size: "lg" })}
            href="/app/analytics"
          >
            View analytics
            <ArrowRight className="size-5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export function GameBoard({
  initialBestScore,
  onDiscard,
  onRetryBatch,
  onRetrySave,
  settings,
}: {
  initialBestScore: number;
  onDiscard: () => void;
  onRetryBatch: () => void;
  onRetrySave: () => void;
  settings: PlayerSettings;
}) {
  const engine = useGameStore(selectEngine);
  const challenge = useGameStore(selectCurrentChallenge);
  const status = useGameStore(selectStatus);
  const score = useGameStore(selectScore);
  const combo = useGameStore(selectCombo);
  const lives = useGameStore(selectLives);
  const questionNumber = useGameStore(selectQuestionNumber);
  const latestAttempt = useGameStore(selectLatestAttempt);
  const queueLength = useGameStore(selectQueueLength);
  const batchStatus = useGameStore(selectBatchStatus);
  const batchError = useGameStore(selectBatchError);
  const answer = useGameStore((state) => state.answer);
  const advance = useGameStore((state) => state.advance);
  const pause = useGameStore((state) => state.pause);
  const finishTraining = useGameStore((state) => state.finishTraining);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const nowMs = useQuestionClock(engine);

  const rules = useMemo(
    () =>
      challenge ? getQuestionRules(challenge.category, questionNumber) : null,
    [challenge, questionNumber],
  );
  const elapsedMs =
    engine && status === "playing"
      ? getCurrentQuestionElapsedMs(
          engine,
          nowMs || engine.questionStartedAtMs || 0,
        )
      : (latestAttempt?.responseMs ?? 0);
  const remainingMs = rules ? Math.max(0, rules.timeLimitMs - elapsedMs) : 0;
  const obtainablePoints =
    challenge && rules
      ? status === "feedback" && latestAttempt
        ? latestAttempt.obtainablePoints
        : calculateObtainablePoints({
            category: challenge.category,
            questionNumber,
            responseMs: elapsedMs,
          })
      : 0;
  const comboMultiplier = getComboMultiplier(combo);

  useEffect(() => {
    if (challenge && status === "playing") {
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [challenge?.id, challenge, status]);

  useEffect(() => {
    if (!engine || engine.mode !== "arcade" || status !== "feedback") return;

    const timeout = window.setTimeout(
      () => advance(performance.now()),
      gameConfig.feedbackDurationMs.arcade,
    );
    return () => window.clearTimeout(timeout);
  }, [advance, engine, status]);

  useEffect(() => {
    if (!challenge || status !== "playing") return;

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        (target instanceof Element &&
          target.closest(
            "button, a, input, textarea, select, audio, video, summary, [contenteditable='true']",
          ))
      ) {
        return;
      }

      const optionAKeys = ["a", "1", "ArrowLeft"];
      const optionBKeys = ["d", "2", "ArrowRight"];
      const choice = optionAKeys.includes(event.key)
        ? "option_a"
        : optionBKeys.includes(event.key)
          ? "option_b"
          : null;

      if (!choice) return;
      event.preventDefault();
      answer(choice, performance.now());
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [answer, challenge, status]);

  if (!engine) return null;

  if (status === "completed") {
    return (
      <GameOver
        engine={engine}
        initialBestScore={initialBestScore}
        onDiscard={onDiscard}
        onRetrySave={onRetrySave}
      />
    );
  }

  if (status === "paused") return <PausedGame onDiscard={onDiscard} />;

  if (status === "error") {
    return (
      <Card className="mx-auto max-w-xl">
        <CardContent className="p-10 text-center">
          <CircleAlert className="mx-auto size-9 text-[var(--danger)]" />
          <h2 className="mt-4 text-xl font-black">
            This run could not continue
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {engine.errorMessage}
          </p>
          <Button className="mt-6" onClick={onDiscard}>
            Start a new run
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!challenge || status === "loading") {
    return (
      <LoadingGame
        error={batchStatus === "error" ? batchError : null}
        onRetry={onRetryBatch}
      />
    );
  }

  const category = categoryConfig[challenge.category];
  const answered =
    status === "feedback" && latestAttempt?.challengeId === challenge.id;

  function choose(choice: BinaryChoice, answeredAtMs: number) {
    answer(choice, answeredAtMs);
    if (!settings.soundEffects || settings.volume === 0) return;

    const attempt = useGameStore.getState().engine?.attempts.at(-1);
    const AudioContextClass =
      window.AudioContext ??
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;
    if (!attempt || !AudioContextClass) return;

    try {
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = attempt.isCorrect ? 660 : 220;
      gain.gain.value = Math.min(0.12, settings.volume / 800);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.08);
      oscillator.addEventListener(
        "ended",
        () => void context.close().catch(() => undefined),
        { once: true },
      );
    } catch {
      // Sound effects are optional; gameplay must continue without Web Audio.
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-[1fr_auto]">
        <div className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4">
          <div>
            <p className="text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
              Progress
            </p>
            <p className="mt-1 text-sm font-black">
              Challenge {questionNumber}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
              {engine.mode === "arcade" ? "Score" : "Correct"}
            </p>
            <p className="mt-1 text-sm font-black">
              {engine.mode === "arcade"
                ? formatNumber(score)
                : `${engine.attempts.filter((attempt) => attempt.isCorrect).length}/${engine.attempts.length}`}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
              Combo
            </p>
            <p className="mt-1 flex items-center gap-1 text-sm font-black">
              <Flame className="size-3.5 text-[#ff9b52]" />
              {combo} · {comboMultiplier}×
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
              {engine.mode === "arcade" ? "Lives" : "Queue"}
            </p>
            <div className="mt-1 text-sm font-black">
              {engine.mode === "arcade" && lives !== null ? (
                <Lives lives={lives} />
              ) : (
                `${queueLength} ready`
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          {engine.mode === "training" ? (
            <Button
              onClick={() => finishTraining(performance.now())}
              size="sm"
              variant="ghost"
            >
              Finish training
            </Button>
          ) : null}
          <Button
            aria-label="Pause game"
            onClick={() => pause(performance.now())}
            size="sm"
            variant="secondary"
          >
            <Pause className="size-4" />
            <span className="hidden sm:inline">Pause</span>
          </Button>
        </div>
      </div>

      {batchStatus === "error" ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#a47627]/35 bg-[#a47627]/10 px-4 py-3 text-xs leading-5 text-[#e8c98f]">
          <span className="flex items-center gap-2">
            <CircleAlert className="size-4 shrink-0" />
            Refill paused: {batchError}
          </span>
          <Button onClick={onRetryBatch} size="sm" variant="ghost">
            Retry
          </Button>
        </div>
      ) : null}

      <Card
        className="overflow-hidden"
        data-category={challenge.category}
        data-challenge-id={challenge.id}
        data-testid="challenge-card"
      >
        <div className="border-b border-[var(--border)] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <category.icon
                className="size-4"
                style={{ color: category.accent }}
              />
              <h2
                className="text-sm font-black outline-none"
                ref={headingRef}
                tabIndex={-1}
              >
                {category.name}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge>
                <Gauge className="mr-1 size-3.5" />
                {rules?.difficultyLabel}
              </Badge>
              <Badge>
                <Clock3 className="mr-1 size-3.5" />
                {(remainingMs / 1_000).toFixed(1)}s
              </Badge>
              {engine.mode === "arcade" ? (
                <Badge className="border-[var(--blue)]/30 bg-[var(--blue)]/8 text-[#aac6ff]">
                  {formatNumber(obtainablePoints)} available
                </Badge>
              ) : null}
            </div>
          </div>
          {rules ? (
            <Progress
              className="mt-3"
              label="Time remaining"
              max={rules.timeLimitMs}
              value={remainingMs}
            />
          ) : null}
        </div>

        <CardContent className="p-4 sm:p-5">
          <ChallengeRenderer challenge={challenge} />

          <div className="mt-4 grid grid-cols-2 gap-3">
            {(
              [
                ["option_a", challenge.labels.optionA, "A / 1"],
                ["option_b", challenge.labels.optionB, "D / 2"],
              ] as const
            ).map(([choice, label, shortcut]) => {
              const selected = latestAttempt?.selectedChoice === choice;
              const correct = latestAttempt?.correctChoice === choice;

              return (
                <button
                  aria-keyshortcuts={
                    choice === "option_a" ? "A 1 ArrowLeft" : "D 2 ArrowRight"
                  }
                  className={cn(
                    "relative min-h-16 rounded-xl border px-4 text-base font-black transition-all",
                    !answered &&
                      "border-[var(--border)] bg-white/4 hover:-translate-y-0.5 hover:border-[var(--blue)]/60 hover:bg-[var(--blue)]/8",
                    answered &&
                      correct &&
                      "border-[var(--success)] bg-[var(--success)]/12 text-[#a8ead3]",
                    answered &&
                      selected &&
                      !correct &&
                      "border-[var(--danger)] bg-[var(--danger)]/10 text-[#efb4b7]",
                    answered &&
                      !selected &&
                      !correct &&
                      "border-[var(--border)] bg-white/2 text-[#657087]",
                  )}
                  disabled={answered}
                  key={choice}
                  onClick={(event) => choose(choice, event.timeStamp)}
                  type="button"
                >
                  {answered && correct ? (
                    <Check className="mr-2 inline size-5" />
                  ) : null}
                  {answered && selected && !correct ? (
                    <X className="mr-2 inline size-5" />
                  ) : null}
                  {label}
                  {settings.showKeyboardShortcuts ? (
                    <span className="absolute right-2 bottom-1.5 text-[9px] font-bold tracking-wider text-[var(--muted)] uppercase">
                      {shortcut}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {answered && latestAttempt ? (
            <div
              aria-live="assertive"
              className={cn(
                "mt-4 rounded-xl border p-4",
                latestAttempt.isCorrect
                  ? "border-[var(--success)]/30 bg-[var(--success)]/7"
                  : "border-[var(--danger)]/30 bg-[var(--danger)]/7",
              )}
              role="status"
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full",
                    latestAttempt.isCorrect
                      ? "bg-[var(--success)]/15 text-[var(--success)]"
                      : "bg-[var(--danger)]/15 text-[var(--danger)]",
                  )}
                >
                  {latestAttempt.isCorrect ? (
                    <Check className="size-4" />
                  ) : (
                    <X className="size-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="font-black">
                      {latestAttempt.timedOut
                        ? "Time expired"
                        : latestAttempt.isCorrect
                          ? "Correct call"
                          : "Not quite"}
                    </h3>
                    {engine.mode === "arcade" ? (
                      <span className="animate-score-pop text-sm font-black text-[var(--blue)]">
                        +{formatNumber(latestAttempt.awardedPoints)}
                      </span>
                    ) : null}
                  </div>

                  {engine.mode === "training" ? (
                    <>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                        {challenge.explanation}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {challenge.difficulty.signals.map((signal) => (
                          <Badge key={signal}>{signal}</Badge>
                        ))}
                      </div>
                      <Button
                        className="mt-5 w-full"
                        onClick={() => advance(performance.now())}
                      >
                        Next challenge
                        <ArrowRight className="size-4" />
                      </Button>
                    </>
                  ) : (
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Next challenge loading automatically…
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
