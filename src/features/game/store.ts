"use client";

import { create } from "zustand";

import type { CategoryId } from "@/config/categories";
import { gameConfig, type GameMode } from "@/config/game";
import {
  advanceToNextChallenge,
  answerCurrentChallenge,
  appendChallengeBatch,
  beginNewChallengeCycle,
  createGameState,
  deserializeGameState,
  exitTraining,
  expireCurrentChallenge,
  failGame,
  finishForExhaustedPool,
  pauseGame,
  resumeGame,
  serializeGameState,
} from "@/features/game/engine";
import type {
  BinaryChoice,
  Challenge,
  GameEngineState,
  PersistedGameResult,
} from "@/features/game/types";

export type BatchStatus = "idle" | "loading" | "error";
export type SaveStatus = "idle" | "saving" | "saved" | "error";

type StartRunInput = {
  runId: string;
  mode: GameMode;
  enabledCategories: CategoryId[];
  challenges: Challenge[];
  nowMs: number;
  shuffleSeed: number;
};

export type GameStore = {
  engine: GameEngineState | null;
  hydrated: boolean;
  batchStatus: BatchStatus;
  batchError: string | null;
  activeBatchRequestId: string | null;
  saveStatus: SaveStatus;
  saveError: string | null;
  savedResult: PersistedGameResult | null;
  hydrate: () => void;
  startRun: (input: StartRunInput) => void;
  startBatchRequest: (requestId: string) => void;
  receiveBatch: (
    requestId: string,
    challenges: Challenge[],
    nowMs: number,
  ) => void;
  rejectBatch: (requestId: string, message: string) => void;
  clearBatchRequest: (requestId: string) => void;
  retryBatch: () => void;
  beginNewCycle: () => void;
  answer: (choice: BinaryChoice, nowMs: number) => void;
  expire: (nowMs: number) => void;
  advance: (nowMs: number) => void;
  pause: (nowMs: number) => void;
  resume: (nowMs: number) => void;
  finishTraining: (nowMs: number) => void;
  finishExhausted: (nowMs: number) => void;
  setFatalError: (message: string) => void;
  setSaving: () => void;
  setSaved: (result: PersistedGameResult) => void;
  setSaveError: (message: string) => void;
  reset: () => void;
};

function persistEngine(engine: GameEngineState | null): void {
  if (typeof window === "undefined") return;

  if (!engine) {
    window.sessionStorage.removeItem(gameConfig.localStorage.activeRun);
    return;
  }

  window.sessionStorage.setItem(
    gameConfig.localStorage.activeRun,
    serializeGameState(engine),
  );
}

function updateEngine(
  set: (
    update:
      | Partial<GameStore>
      | ((state: GameStore) => Partial<GameStore> | GameStore),
  ) => void,
  transform: (engine: GameEngineState) => GameEngineState,
): void {
  set((state) => {
    if (!state.engine) return state;

    const engine = transform(state.engine);
    if (engine === state.engine) return state;
    persistEngine(engine);
    return { engine };
  });
}

const transientInitialState = {
  hydrated: false,
  batchStatus: "idle" as BatchStatus,
  batchError: null,
  activeBatchRequestId: null,
  saveStatus: "idle" as SaveStatus,
  saveError: null,
  savedResult: null,
};

export const useGameStore = create<GameStore>((set) => ({
  engine: null,
  ...transientInitialState,
  hydrate: () => {
    if (typeof window === "undefined") {
      set({ hydrated: true });
      return;
    }

    const serialized = window.sessionStorage.getItem(
      gameConfig.localStorage.activeRun,
    );
    const restored = serialized ? deserializeGameState(serialized) : null;
    const engine =
      restored && ["loading", "playing", "feedback"].includes(restored.status)
        ? pauseGame(
            restored,
            restored.questionStartedAtMs ??
              restored.questionElapsedBeforePauseMs,
          )
        : restored;

    if (serialized && !engine) {
      window.sessionStorage.removeItem(gameConfig.localStorage.activeRun);
    }

    if (engine) persistEngine(engine);
    set({ engine, hydrated: true });
  },
  startRun: (input) => {
    const engine = createGameState({
      runId: input.runId,
      mode: input.mode,
      enabledCategories: input.enabledCategories,
      initialChallenges: input.challenges,
      nowMs: input.nowMs,
      shuffleSeed: input.shuffleSeed,
    });

    persistEngine(engine);
    set({
      engine,
      hydrated: true,
      batchStatus: "idle",
      batchError: null,
      activeBatchRequestId: null,
      saveStatus: "idle",
      saveError: null,
      savedResult: null,
    });
  },
  startBatchRequest: (requestId) =>
    set({
      activeBatchRequestId: requestId,
      batchStatus: "loading",
      batchError: null,
    }),
  receiveBatch: (requestId, challenges, nowMs) =>
    set((state) => {
      if (state.activeBatchRequestId !== requestId || !state.engine) {
        return state;
      }

      const engine = appendChallengeBatch(state.engine, challenges, nowMs);
      persistEngine(engine);
      return {
        engine,
        activeBatchRequestId: null,
        batchStatus: "idle",
        batchError: null,
      };
    }),
  rejectBatch: (requestId, message) =>
    set((state) =>
      state.activeBatchRequestId === requestId
        ? {
            activeBatchRequestId: null,
            batchStatus: "error",
            batchError: message,
          }
        : state,
    ),
  clearBatchRequest: (requestId) =>
    set((state) =>
      state.activeBatchRequestId === requestId
        ? {
            activeBatchRequestId: null,
            batchStatus: "idle",
            batchError: null,
          }
        : state,
    ),
  retryBatch: () =>
    set({
      batchStatus: "idle",
      batchError: null,
    }),
  beginNewCycle: () =>
    updateEngine(set, (engine) => beginNewChallengeCycle(engine)),
  answer: (choice, nowMs) =>
    updateEngine(set, (engine) =>
      answerCurrentChallenge(engine, choice, nowMs),
    ),
  expire: (nowMs) =>
    updateEngine(set, (engine) => expireCurrentChallenge(engine, nowMs)),
  advance: (nowMs) =>
    updateEngine(set, (engine) => advanceToNextChallenge(engine, nowMs)),
  pause: (nowMs) => updateEngine(set, (engine) => pauseGame(engine, nowMs)),
  resume: (nowMs) => updateEngine(set, (engine) => resumeGame(engine, nowMs)),
  finishTraining: (nowMs) =>
    updateEngine(set, (engine) => exitTraining(engine, nowMs)),
  finishExhausted: (nowMs) =>
    updateEngine(set, (engine) => finishForExhaustedPool(engine, nowMs)),
  setFatalError: (message) =>
    updateEngine(set, (engine) => failGame(engine, message)),
  setSaving: () =>
    set({
      saveStatus: "saving",
      saveError: null,
      savedResult: null,
    }),
  setSaved: (result) =>
    set({
      saveStatus: "saved",
      saveError: null,
      savedResult: result,
    }),
  setSaveError: (message) =>
    set({
      saveStatus: "error",
      saveError: message,
      savedResult: null,
    }),
  reset: () => {
    persistEngine(null);
    set({
      engine: null,
      ...transientInitialState,
      hydrated: true,
    });
  },
}));

export const selectEngine = (state: GameStore) => state.engine;
export const selectHydrated = (state: GameStore) => state.hydrated;
export const selectCurrentChallenge = (state: GameStore) =>
  state.engine?.currentChallenge ?? null;
export const selectStatus = (state: GameStore) =>
  state.engine?.status ?? "idle";
export const selectScore = (state: GameStore) => state.engine?.score ?? 0;
export const selectCombo = (state: GameStore) => state.engine?.combo ?? 0;
export const selectLives = (state: GameStore) => state.engine?.lives ?? null;
export const selectQuestionNumber = (state: GameStore) =>
  state.engine?.questionNumber ?? 0;
export const selectLatestAttempt = (state: GameStore) =>
  state.engine?.attempts.at(-1) ?? null;
export const selectQueueLength = (state: GameStore) =>
  state.engine?.challengeQueue.length ?? 0;
export const selectBatchStatus = (state: GameStore) => state.batchStatus;
export const selectBatchError = (state: GameStore) => state.batchError;
export const selectSaveStatus = (state: GameStore) => state.saveStatus;
export const selectSaveError = (state: GameStore) => state.saveError;
export const selectSavedResult = (state: GameStore) => state.savedResult;
