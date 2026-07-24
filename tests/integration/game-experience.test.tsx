// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GameExperience } from "@/features/game/game-experience";
import { useGameStore } from "@/features/game/store";
import { makeChallenge } from "../fixtures/challenges";

const mocks = vi.hoisted(() => ({
  fetchChallengeBatch: vi.fn(),
  persistGameRun: vi.fn(),
}));

vi.mock("@/services/challenges-client", () => ({
  fetchChallengeBatch: mocks.fetchChallengeBatch,
}));

vi.mock("@/services/game-persistence", () => ({
  persistGameRun: mocks.persistGameRun,
}));

describe("Training experience", () => {
  beforeEach(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    window.localStorage.clear();
    window.sessionStorage.clear();
    useGameStore.getState().reset();
    mocks.fetchChallengeBatch.mockReset();
    mocks.persistGameRun.mockReset();

    const challenges = Array.from({ length: 8 }, (_value, index) =>
      makeChallenge({
        index: 600 + index,
        category: "email",
        correctChoice: "option_b",
      }),
    );
    mocks.fetchChallengeBatch.mockResolvedValue({
      challenges,
      error: null,
      exhausted: false,
      availableCount: challenges.length,
    });
    mocks.persistGameRun.mockResolvedValue({
      sessionId: "30000000-0000-4000-8000-000000000001",
      score: 1_000,
      xpEarned: 110,
      currentStreak: 2,
      isNewHighScore: false,
      duplicate: false,
    });
  });

  it("starts, answers, explains, exits, and saves through mocked boundaries", async () => {
    render(<GameExperience initialBestScore={0} mode="training" />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Start Training" }),
    );

    await screen.findByText(/Fixture subject 60[0-7]/);
    fireEvent.click(screen.getByRole("button", { name: /Legitimate/i }));

    expect(
      await screen.findByText(/Fixture explanation 60[0-7]/),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Finish training" }));

    expect(await screen.findByText("Training summary")).toBeVisible();
    await waitFor(() => expect(mocks.persistGameRun).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByText("Progress saved to your profile."),
    ).toBeVisible();
  });

  it("does not spin on refills when a tiny pool is currently queued", async () => {
    const onlyChallenge = makeChallenge({
      index: 700,
      category: "email",
      correctChoice: "option_b",
    });
    mocks.fetchChallengeBatch
      .mockReset()
      .mockResolvedValueOnce({
        challenges: [onlyChallenge],
        error: null,
        exhausted: false,
        availableCount: 1,
      })
      .mockResolvedValue({
        challenges: [],
        error: "Every available challenge has been used.",
        exhausted: true,
        availableCount: 1,
      });

    render(<GameExperience initialBestScore={0} mode="training" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Start Training" }),
    );

    await screen.findByText("Fixture subject 700");
    await waitFor(() =>
      expect(mocks.fetchChallengeBatch).toHaveBeenCalledTimes(2),
    );
    await new Promise((resolve) => window.setTimeout(resolve, 30));
    expect(mocks.fetchChallengeBatch).toHaveBeenCalledTimes(2);
  });
});
