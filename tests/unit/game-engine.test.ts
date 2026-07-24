import { describe, expect, it } from "vitest";

import {
  advanceToNextChallenge,
  answerCurrentChallenge,
  appendChallengeBatch,
  beginNewChallengeCycle,
  createGameRunSubmission,
  createGameState,
  deserializeGameState,
  exitTraining,
  expireCurrentChallenge,
  getBatchExclusionIds,
  getCurrentQuestionElapsedMs,
  getGameSummary,
  getQuestionRules,
  pauseGame,
  resumeGame,
  serializeGameState,
  shuffleChallenges,
} from "@/features/game/engine";
import { makeChallenge, makeChallengeSet } from "../fixtures/challenges";

const runId = "10000000-0000-4000-8000-000000000001";

function arcadeState(nowMs = 100) {
  return createGameState({
    runId,
    mode: "arcade",
    enabledCategories: ["image", "email", "voice"],
    initialChallenges: makeChallengeSet(12),
    nowMs,
    shuffleSeed: 42,
  });
}

describe("deterministic game engine", () => {
  it("shuffles repeatably without mutating its input", () => {
    const challenges = makeChallengeSet(10);
    const originalIds = challenges.map((challenge) => challenge.id);
    const first = shuffleChallenges(challenges, 123).map(
      (challenge) => challenge.id,
    );
    const second = shuffleChallenges(challenges, 123).map(
      (challenge) => challenge.id,
    );
    const different = shuffleChallenges(challenges, 456).map(
      (challenge) => challenge.id,
    );

    expect(first).toEqual(second);
    expect(first).not.toEqual(different);
    expect(challenges.map((challenge) => challenge.id)).toEqual(originalIds);
  });

  it("filters disabled categories and duplicate rows when starting", () => {
    const image = makeChallenge({ index: 201, category: "image" });
    const email = makeChallenge({ index: 202, category: "email" });
    const state = createGameState({
      runId,
      mode: "training",
      enabledCategories: ["image"],
      initialChallenges: [image, image, email],
      nowMs: 0,
      shuffleSeed: 1,
    });

    expect(state.currentChallenge?.id).toBe(image.id);
    expect(state.challengeQueue).toHaveLength(0);
    expect(state.enabledCategories).toEqual(["image"]);
  });

  it("accepts one answer only and advances to a new challenge", () => {
    const initial = arcadeState();
    const challengeId = initial.currentChallenge?.id;
    const correctChoice = initial.currentChallenge!.correctChoice;
    const answered = answerCurrentChallenge(initial, correctChoice, 500);
    const duplicate = answerCurrentChallenge(answered, correctChoice, 550);
    const advanced = advanceToNextChallenge(answered, 700);

    expect(answered.attempts).toHaveLength(1);
    expect(duplicate).toBe(answered);
    expect(advanced.status).toBe("playing");
    expect(advanced.currentChallenge?.id).not.toBe(challengeId);
    expect(advanced.questionNumber).toBe(2);
  });

  it("depletes three lives and completes Arcade after feedback", () => {
    let state = arcadeState();

    for (let miss = 0; miss < 3; miss += 1) {
      const challenge = state.currentChallenge!;
      const incorrect =
        challenge.correctChoice === "option_a" ? "option_b" : "option_a";
      state = answerCurrentChallenge(
        state,
        incorrect,
        state.questionStartedAtMs! + 100,
      );
      expect(state.lives).toBe(2 - miss);
      state = advanceToNextChallenge(state, 1_000 + miss);
    }

    expect(state.status).toBe("completed");
    expect(state.endReason).toBe("lives_depleted");
    expect(state.attempts).toHaveLength(3);
  });

  it("expires only at the configured time limit", () => {
    const initial = arcadeState(1_000);
    const rules = getQuestionRules(
      initial.currentChallenge!.category,
      initial.questionNumber,
    );
    const early = expireCurrentChallenge(
      initial,
      initial.questionStartedAtMs! + rules.timeLimitMs - 1,
    );
    const expired = expireCurrentChallenge(
      initial,
      initial.questionStartedAtMs! + rules.timeLimitMs,
    );

    expect(early).toBe(initial);
    expect(expired.attempts[0]).toMatchObject({
      selectedChoice: null,
      timedOut: true,
      awardedPoints: 0,
    });
    expect(expired.lives).toBe(2);
  });

  it("uses monotonic elapsed time and excludes paused duration", () => {
    const initial = arcadeState(100);
    const paused = pauseGame(initial, 1_100);
    const resumed = resumeGame(paused, 9_000);

    expect(getCurrentQuestionElapsedMs(paused, 8_000)).toBe(1_000);
    expect(getCurrentQuestionElapsedMs(resumed, 9_500)).toBe(1_500);
  });

  it("merges batches without active-cycle duplicates", () => {
    const initial = arcadeState();
    const existing = initial.currentChallenge!;
    const addition = makeChallenge({ index: 250, category: "image" });
    const appended = appendChallengeBatch(
      initial,
      [existing, addition, addition],
      200,
    );

    expect(
      appended.challengeQueue.filter(
        (challenge) => challenge.id === addition.id,
      ),
    ).toHaveLength(1);
    expect(getBatchExclusionIds(appended)).toContain(addition.id);

    const nextCycle = beginNewChallengeCycle(appended);
    expect(nextCycle.cycleNumber).toBe(2);
    expect(nextCycle.seenChallengeIds).toEqual(appended.seenChallengeIds);
  });

  it("round-trips validated serializable state and rejects corruption", () => {
    const state = pauseGame(arcadeState(), 600);
    const serialized = serializeGameState(state);

    expect(deserializeGameState(serialized)).toEqual(state);
    expect(deserializeGameState("{broken")).toBeNull();
    expect(
      deserializeGameState(JSON.stringify({ ...state, enabledCategories: [] })),
    ).toBeNull();
  });

  it("creates a rich Training summary and submission", () => {
    let state = createGameState({
      runId,
      mode: "training",
      enabledCategories: ["email"],
      initialChallenges: [
        makeChallenge({
          index: 301,
          category: "email",
          correctChoice: "option_b",
        }),
      ],
      nowMs: 100,
      shuffleSeed: 2,
    });
    state = answerCurrentChallenge(state, "option_b", 600);
    state = exitTraining(state, 700);

    const summary = getGameSummary(state);
    const submission = createGameRunSubmission(state);

    expect(summary).toMatchObject({
      answered: 1,
      correct: 1,
      accuracy: 100,
      endReason: "training_exit",
    });
    expect(summary?.categoryBreakdown.email).toMatchObject({
      answered: 1,
      correct: 1,
    });
    expect(summary?.xpEarned).toBeGreaterThan(0);
    expect(submission?.attempts).toHaveLength(1);
  });
});
