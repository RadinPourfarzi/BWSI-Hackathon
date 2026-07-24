"use client";

import { create } from "zustand";

import type {
  AttemptResolution,
  Challenge,
  GameStatus,
} from "@/features/game/types";

type GameState = {
  questions: Challenge[];
  currentIndex: number;
  score: number;
  combo: number;
  attempts: AttemptResolution[];
  status: GameStatus;
  questionStartedAt: number;
  start: (questions: Challenge[], now: number) => void;
  recordAnswer: (resolution: AttemptResolution) => void;
  advance: (now: number) => void;
  reset: () => void;
};

const initialState = {
  questions: [],
  currentIndex: 0,
  score: 0,
  combo: 0,
  attempts: [],
  status: "idle" as GameStatus,
  questionStartedAt: 0,
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,
  start: (questions, now) =>
    set({
      ...initialState,
      questions,
      questionStartedAt: now,
      status: questions.length > 0 ? "playing" : "complete",
    }),
  recordAnswer: (resolution) =>
    set((state) => {
      if (state.status !== "playing") return state;

      return {
        attempts: [...state.attempts, resolution],
        combo: resolution.comboAfter,
        score: state.score + resolution.awardedPoints,
        status: "answered",
      };
    }),
  advance: (now) =>
    set((state) => {
      if (state.status !== "answered") return state;

      const nextIndex = state.currentIndex + 1;
      const complete = nextIndex >= state.questions.length;

      return {
        currentIndex: complete ? state.currentIndex : nextIndex,
        questionStartedAt: now,
        status: complete ? "complete" : "playing",
      };
    }),
  reset: () => set(initialState),
}));
