// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { gameConfig } from "@/config/game";
import { useGameStore } from "@/features/game/store";
import { makeChallenge, makeChallengeSet } from "../fixtures/challenges";

const runId = "20000000-0000-4000-8000-000000000001";

function startStore() {
  useGameStore.getState().startRun({
    runId,
    mode: "arcade",
    enabledCategories: ["image", "email", "voice"],
    challenges: makeChallengeSet(8),
    nowMs: 100,
    shuffleSeed: 9,
  });
}

describe("game store coordination", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    useGameStore.getState().reset();
  });

  it("blocks duplicate submissions through the engine lifecycle", () => {
    startStore();
    const challenge = useGameStore.getState().engine!.currentChallenge!;
    const choice = challenge.correctChoice;

    useGameStore.getState().answer(choice, 200);
    useGameStore.getState().answer(choice, 250);

    expect(useGameStore.getState().engine?.attempts).toHaveLength(1);
    expect(useGameStore.getState().engine?.status).toBe("feedback");
  });

  it("ignores results from stale batch requests", () => {
    startStore();
    const before = useGameStore.getState().engine;
    const extra = makeChallenge({ index: 401, category: "image" });

    useGameStore.getState().startBatchRequest("current");
    useGameStore.getState().receiveBatch("stale", [extra], 200);

    expect(useGameStore.getState().engine).toBe(before);
    expect(useGameStore.getState().activeBatchRequestId).toBe("current");
  });

  it("persists active state and restores it safely in a paused state", () => {
    startStore();
    expect(
      window.sessionStorage.getItem(gameConfig.localStorage.activeRun),
    ).not.toBeNull();

    useGameStore.setState({
      engine: null,
      hydrated: false,
    });
    useGameStore.getState().hydrate();

    expect(useGameStore.getState().engine?.runId).toBe(runId);
    expect(useGameStore.getState().engine?.status).toBe("paused");
  });

  it("keeps gameplay usable when browser storage is unavailable", () => {
    const storage = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("Storage is disabled", "SecurityError");
      });

    expect(startStore).not.toThrow();
    expect(useGameStore.getState().engine?.runId).toBe(runId);
    storage.mockRestore();
  });

  it("accepts only the active batch result and clears transient errors", () => {
    startStore();
    const extra = makeChallenge({ index: 402, category: "image" });

    useGameStore.getState().startBatchRequest("request-1");
    useGameStore.getState().rejectBatch("request-1", "Network unavailable");
    expect(useGameStore.getState().batchStatus).toBe("error");

    useGameStore.getState().retryBatch();
    useGameStore.getState().startBatchRequest("request-2");
    useGameStore.getState().receiveBatch("request-2", [extra], 300);

    expect(useGameStore.getState().batchStatus).toBe("idle");
    expect(
      useGameStore
        .getState()
        .engine?.challengeQueue.some((challenge) => challenge.id === extra.id),
    ).toBe(true);
  });
});
