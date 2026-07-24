"use client";

import {
  ArrowRight,
  Check,
  CircleAlert,
  Flame,
  RotateCcw,
  Trophy,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { categoryConfig } from "@/config/categories";
import type { GameMode } from "@/config/game";
import { resolveAnswer } from "@/features/game/engine";
import { ChallengeRenderer } from "@/features/game/renderers/registry";
import { useGameStore } from "@/features/game/store";
import type { BinaryChoice, Challenge } from "@/features/game/types";
import {
  completeGameSession,
  persistAttempt,
} from "@/services/game-persistence";
import { cn, formatNumber } from "@/lib/utils";

export function GameBoard({
  challenges,
  mode,
  sessionId,
}: {
  challenges: Challenge[];
  mode: GameMode;
  sessionId: string | null;
}) {
  const router = useRouter();
  const {
    questions,
    currentIndex,
    score,
    combo,
    attempts,
    status,
    questionStartedAt,
    start,
    recordAnswer,
    advance,
    reset,
  } = useGameStore();
  const [persistenceError, setPersistenceError] = useState<string | null>(
    sessionId ? null : "This round could not create a cloud session.",
  );
  const completionRequested = useRef(false);
  const pendingWrites = useRef<Set<Promise<string | null>>>(new Set());

  useEffect(() => {
    start(challenges, performance.now());
    completionRequested.current = false;
    pendingWrites.current.clear();

    return () => reset();
  }, [challenges, reset, start]);

  useEffect(() => {
    if (status !== "complete" || !sessionId || completionRequested.current) {
      return;
    }

    completionRequested.current = true;
    let cancelled = false;

    void Promise.allSettled([...pendingWrites.current])
      .then(() => completeGameSession(sessionId))
      .then((error) => {
        if (!cancelled && error) setPersistenceError(error);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId, status]);

  const challenge = questions[currentIndex];
  const latestAttempt = attempts.at(-1);

  function handleAnswer(selectedChoice: BinaryChoice, answeredAt: number) {
    if (!challenge || status !== "playing") return;

    const resolution = resolveAnswer({
      challenge,
      selectedChoice,
      responseMs: answeredAt - questionStartedAt,
      combo,
    });

    recordAnswer(resolution);

    if (sessionId) {
      const write = persistAttempt(sessionId, resolution);
      pendingWrites.current.add(write);
      void write
        .then((error) => {
          if (error) setPersistenceError(error);
        })
        .finally(() => pendingWrites.current.delete(write));
    }
  }

  function handleReplay() {
    router.refresh();
  }

  if (status === "complete") {
    const correct = attempts.filter((attempt) => attempt.isCorrect).length;
    const accuracy =
      attempts.length > 0 ? Math.round((correct / attempts.length) * 100) : 0;

    return (
      <Card className="mx-auto max-w-2xl overflow-hidden text-center">
        <CardContent className="p-8 sm:p-12">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-[#ffd166]/10">
            <Trophy className="size-9 text-[#ffd166]" />
          </span>
          <p className="mt-6 text-xs font-bold tracking-[0.2em] text-[var(--blue)] uppercase">
            {mode === "arcade" ? "Arcade" : "Training"} round complete
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">
            {formatNumber(score)} points
          </h1>
          <p className="mt-3 text-[var(--muted)]">
            {correct} of {attempts.length} correct · {accuracy}% accuracy
          </p>
          {persistenceError ? (
            <p className="mt-5 rounded-xl border border-[#a47627]/35 bg-[#a47627]/10 px-4 py-3 text-sm text-[#e8c98f]">
              Your local score is shown, but cloud persistence reported:{" "}
              {persistenceError}
            </p>
          ) : (
            <p className="mt-5 text-sm text-[var(--success)]">
              Progress saved to your profile.
            </p>
          )}
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Button onClick={handleReplay} size="lg" variant="secondary">
              <RotateCcw className="size-5" />
              Replay set
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

  if (!challenge) return null;

  const category = categoryConfig[challenge.category];
  const answered =
    status === "answered" && latestAttempt?.challengeId === challenge.id;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between text-xs font-bold">
            <span className="text-[var(--muted)]">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span>{formatNumber(score)} pts</span>
          </div>
          <Progress
            label="Round progress"
            max={questions.length}
            value={currentIndex + (answered ? 1 : 0)}
          />
        </div>
        <Badge
          className={cn(
            combo > 1
              ? "border-[#ff9b52]/30 bg-[#ff9b52]/10 text-[#ffc08c]"
              : "",
          )}
        >
          <Flame className="mr-1 size-3.5" />
          {combo}× combo
        </Badge>
      </div>

      {persistenceError ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#a47627]/35 bg-[#a47627]/10 px-4 py-3 text-xs leading-5 text-[#e8c98f]">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          Answers remain playable, but progress may not save: {persistenceError}
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div className="flex items-center gap-2">
            <category.icon
              className="size-4"
              style={{ color: category.accent }}
            />
            <span className="text-sm font-black">{category.name}</span>
          </div>
          <Badge>{challenge.difficulty.tier}</Badge>
        </div>
        <CardContent className="p-4 sm:p-5">
          <ChallengeRenderer challenge={challenge} />

          <div className="mt-4 grid grid-cols-2 gap-3">
            {(
              [
                ["option_a", challenge.labels.optionA],
                ["option_b", challenge.labels.optionB],
              ] as const
            ).map(([choice, label]) => {
              const selected = latestAttempt?.selectedChoice === choice;
              const correct = latestAttempt?.correctChoice === choice;

              return (
                <button
                  className={cn(
                    "min-h-14 rounded-xl border px-4 text-base font-black transition-all",
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
                  onClick={(event) => handleAnswer(choice, event.timeStamp)}
                  type="button"
                >
                  {answered && correct ? (
                    <Check className="mr-2 inline size-5" />
                  ) : null}
                  {answered && selected && !correct ? (
                    <X className="mr-2 inline size-5" />
                  ) : null}
                  {label}
                </button>
              );
            })}
          </div>

          {answered && latestAttempt ? (
            <div
              className={cn(
                "mt-4 rounded-xl border p-5",
                latestAttempt.isCorrect
                  ? "border-[var(--success)]/30 bg-[var(--success)]/7"
                  : "border-[var(--danger)]/30 bg-[var(--danger)]/7",
              )}
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
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="font-black">
                      {latestAttempt.isCorrect ? "Correct call" : "Not quite"}
                    </h2>
                    <span className="animate-score-pop text-sm font-black text-[var(--blue)]">
                      +{formatNumber(latestAttempt.awardedPoints)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    {challenge.explanation}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {challenge.difficulty.signals.map((signal) => (
                      <Badge key={signal}>{signal}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <Button
                className="mt-5 w-full"
                onClick={(event) => advance(event.timeStamp)}
              >
                {currentIndex + 1 === questions.length
                  ? "Finish round"
                  : "Next signal"}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
