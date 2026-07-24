"use client";

import { ArrowRight, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button, buttonClassName } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CategoryId } from "@/config/categories";
import { gameConfig, type GameMode } from "@/config/game";
import {
  defaultPlayerSettings,
  type PlayerSettings,
} from "@/features/settings/types";
import { CategorySelector } from "@/features/game/category-selector";
import {
  createGameRunSubmission,
  getBatchExclusionIds,
  needsBatchRefill,
} from "@/features/game/engine";
import { GameBoard } from "@/features/game/game-board";
import {
  selectBatchStatus,
  selectEngine,
  selectHydrated,
  selectSaveStatus,
  useGameStore,
} from "@/features/game/store";
import { fetchChallengeBatch } from "@/services/challenges-client";
import { persistGameRun } from "@/services/game-persistence";

function createRequestId(): string {
  return crypto.randomUUID();
}

function createShuffleSeed(): number {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] ?? Date.now();
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

export function GameExperience({
  mode,
  initialBestScore,
  settings = defaultPlayerSettings,
  guest = false,
}: {
  mode: GameMode;
  initialBestScore: number;
  settings?: PlayerSettings;
  guest?: boolean;
}) {
  const engine = useGameStore(selectEngine);
  const hydrated = useGameStore(selectHydrated);
  const batchStatus = useGameStore(selectBatchStatus);
  const saveStatus = useGameStore(selectSaveStatus);
  const hydrate = useGameStore((state) => state.hydrate);
  const startRun = useGameStore((state) => state.startRun);
  const startBatchRequest = useGameStore((state) => state.startBatchRequest);
  const receiveBatch = useGameStore((state) => state.receiveBatch);
  const rejectBatch = useGameStore((state) => state.rejectBatch);
  const clearBatchRequest = useGameStore((state) => state.clearBatchRequest);
  const beginNewCycle = useGameStore((state) => state.beginNewCycle);
  const finishExhausted = useGameStore((state) => state.finishExhausted);
  const retryBatch = useGameStore((state) => state.retryBatch);
  const setSaving = useGameStore((state) => state.setSaving);
  const setSaved = useGameStore((state) => state.setSaved);
  const setSaveError = useGameStore((state) => state.setSaveError);
  const reset = useGameStore((state) => state.reset);
  const [startPending, setStartPending] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const requestController = useRef<AbortController | null>(null);
  const savingRunIds = useRef(new Set<string>());
  const unmountPauseTimer = useRef<number | null>(null);
  const refillBlockedAt = useRef<{
    runId: string;
    challengeKey: string;
  } | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (unmountPauseTimer.current !== null) {
      window.clearTimeout(unmountPauseTimer.current);
      unmountPauseTimer.current = null;
    }

    function pauseBeforeUnload() {
      useGameStore.getState().pause(performance.now());
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      pauseBeforeUnload();
      const current = useGameStore.getState().engine;
      if (
        settings.confirmAbandon &&
        current &&
        current.status !== "completed"
      ) {
        event.preventDefault();
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      requestController.current?.abort();
      unmountPauseTimer.current = window.setTimeout(
        () => useGameStore.getState().pause(performance.now()),
        0,
      );
    };
  }, [settings.confirmAbandon]);

  useEffect(() => {
    if (
      engine &&
      engine.mode !== mode &&
      engine.status === "completed" &&
      (guest || saveStatus === "saved")
    ) {
      reset();
    }
  }, [engine, guest, mode, reset, saveStatus]);

  useEffect(() => {
    const challengeKey = engine
      ? (engine.currentChallenge?.id ?? `empty:${engine.attempts.length}`)
      : "";

    if (
      !engine ||
      engine.status === "paused" ||
      engine.status === "completed" ||
      engine.status === "error" ||
      !needsBatchRefill(engine) ||
      batchStatus !== "idle"
    ) {
      return;
    }

    if (
      refillBlockedAt.current?.runId === engine.runId &&
      refillBlockedAt.current.challengeKey === challengeKey
    ) {
      return;
    }

    requestController.current?.abort();
    const controller = new AbortController();
    const requestId = createRequestId();
    const runId = engine.runId;
    requestController.current = controller;
    startBatchRequest(requestId);

    void fetchChallengeBatch({
      categories: engine.enabledCategories,
      excludeIds: getBatchExclusionIds(engine),
      limit: gameConfig.batch.refillSize,
      signal: controller.signal,
    })
      .then((result) => {
        const latest = useGameStore.getState().engine;
        if (!latest || latest.runId !== runId) {
          clearBatchRequest(requestId);
          return;
        }

        if (result.exhausted) {
          clearBatchRequest(requestId);
          const retainedChallengeCount =
            latest.challengeQueue.length +
            Number(latest.currentChallenge !== null);

          refillBlockedAt.current =
            retainedChallengeCount > 0 &&
            retainedChallengeCount >= result.availableCount
              ? {
                  runId: latest.runId,
                  challengeKey:
                    latest.currentChallenge?.id ??
                    `empty:${latest.attempts.length}`,
                }
              : null;

          if (latest.cycleSeenChallengeIds.length === 0) {
            finishExhausted(performance.now());
            return;
          }

          beginNewCycle();
          return;
        }

        refillBlockedAt.current = null;
        receiveBatch(requestId, result.challenges, performance.now());
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) {
          clearBatchRequest(requestId);
          return;
        }

        rejectBatch(
          requestId,
          error instanceof Error
            ? error.message
            : "Challenges could not be loaded.",
        );
      });
  }, [
    batchStatus,
    beginNewCycle,
    clearBatchRequest,
    engine,
    finishExhausted,
    receiveBatch,
    rejectBatch,
    startBatchRequest,
  ]);

  const saveCompletedRun = useCallback(async () => {
    if (guest) return;

    const current = useGameStore.getState().engine;
    if (!current || current.status !== "completed") return;

    const submission = createGameRunSubmission(current);
    if (!submission || savingRunIds.current.has(submission.runId)) return;

    savingRunIds.current.add(submission.runId);
    setSaving();

    try {
      const result = await persistGameRun(submission);
      setSaved(result);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Progress could not be saved. Please retry.",
      );
    } finally {
      savingRunIds.current.delete(submission.runId);
    }
  }, [guest, setSaveError, setSaved, setSaving]);

  useEffect(() => {
    if (!guest && engine?.status === "completed" && saveStatus === "idle") {
      void saveCompletedRun();
    }
  }, [engine?.status, guest, saveCompletedRun, saveStatus]);

  async function start(categories: CategoryId[]) {
    requestController.current?.abort();
    refillBlockedAt.current = null;
    const controller = new AbortController();
    requestController.current = controller;
    setStartPending(true);
    setStartError(null);

    try {
      const result = await fetchChallengeBatch({
        categories,
        excludeIds: [],
        limit: gameConfig.batch.initialSize,
        signal: controller.signal,
      });

      if (result.challenges.length === 0) {
        throw new Error(
          result.error ?? "No challenges are available for this selection.",
        );
      }

      startRun({
        runId: crypto.randomUUID(),
        mode,
        enabledCategories: categories,
        challenges: result.challenges,
        nowMs: performance.now(),
        shuffleSeed: createShuffleSeed(),
      });
    } catch (error) {
      if (isAbortError(error)) return;
      setStartError(
        error instanceof Error
          ? error.message
          : "The game could not be started.",
      );
    } finally {
      setStartPending(false);
    }
  }

  function discardRun() {
    if (
      settings.confirmAbandon &&
      engine?.status !== "completed" &&
      !window.confirm("Discard this run? Unsaved progress will be lost.")
    ) {
      return;
    }

    requestController.current?.abort();
    refillBlockedAt.current = null;
    reset();
  }

  if (!hydrated) {
    return (
      <Card className="mx-auto max-w-3xl">
        <CardContent
          aria-live="polite"
          className="p-12 text-center text-sm text-[var(--muted)]"
          role="status"
        >
          Restoring your game…
        </CardContent>
      </Card>
    );
  }

  if (engine && engine.mode !== mode) {
    const otherHref = engine.mode === "arcade" ? "/app/play" : "/app/training";

    return (
      <Card className="mx-auto max-w-xl">
        <CardContent className="p-8 text-center sm:p-10">
          <h2 className="text-2xl font-black">Another run is in progress</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Your {engine.mode} run is safely paused. Continue it, or discard it
            to start {mode}.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Link className={buttonClassName()} href={otherHref}>
              Continue {engine.mode}
              <ArrowRight className="size-4" />
            </Link>
            <Button onClick={discardRun} variant="danger">
              <RotateCcw className="size-4" />
              Discard run
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!engine) {
    return (
      <CategorySelector
        disabled={startPending}
        error={startError}
        initialCategories={settings.defaultCategories}
        mode={mode}
        onStart={(categories) => void start(categories)}
      />
    );
  }

  return (
    <GameBoard
      guest={guest}
      initialBestScore={initialBestScore}
      onDiscard={discardRun}
      onRetryBatch={retryBatch}
      onRetrySave={() => void saveCompletedRun()}
      settings={settings}
    />
  );
}
