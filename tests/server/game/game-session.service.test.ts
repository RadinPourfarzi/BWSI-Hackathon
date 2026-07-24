import { describe, expect, it } from "vitest";
import { MockGameRepository } from "@/database/mock/mock-game.repository";
import { GameSessionService } from "@/server/game/game-session.service";
import { RandomQuestionSelector } from "@/server/game/question-selector";
import { GameRuleEngine } from "@/server/game/rule-engine";
import { InMemoryActiveSessionStore } from "@/server/sessions/active-session.store";

const USER_ID = "99999999-9999-4999-8999-999999999999";
const OTHER_USER_ID = "88888888-8888-4888-8888-888888888888";
const SESSION_ID = "77777777-7777-4777-8777-777777777777";

function createHarness() {
  const repository = new MockGameRepository();
  const sessions = new InMemoryActiveSessionStore();
  let now = 1_000_000;
  const service = new GameSessionService({
    repository,
    sessions,
    selector: new RandomQuestionSelector(repository, () => 0),
    rules: new GameRuleEngine(),
    nowMs: () => now,
    createId: () => SESSION_ID,
  });

  return {
    repository,
    sessions,
    service,
    advance(milliseconds: number) {
      now += milliseconds;
    },
  };
}

describe("GameSessionService", () => {
  it("runs an authoritative answer loop without exposing the answer key", async () => {
    const harness = createHarness();
    const start = await harness.service.startGame(USER_ID, {
      mode: "ARCADE",
      categories: ["image"],
    });

    expect(start.state).toMatchObject({
      score: 0,
      lives: 3,
      combo: 0,
      questionNumber: 1,
    });
    expect(start.challenge).not.toHaveProperty("isAi");

    harness.advance(1_000);
    const answer = await harness.service.submitAnswer(USER_ID, {
      sessionId: SESSION_ID,
      challengeId: start.challenge.id,
      selectedAnswer: "AI",
    });

    expect(answer).toMatchObject({
      wasCorrect: true,
      awardedPoints: 100,
      responseTimeMs: 1_000,
      state: { score: 100, lives: 3, combo: 1, questionNumber: 2 },
    });
    expect(answer.nextChallenge).toBeDefined();
    expect(answer.nextChallenge).not.toHaveProperty("isAi");
  });

  it("rejects another user's access", async () => {
    const harness = createHarness();
    await harness.service.startGame(USER_ID, {
      mode: "ARCADE",
      categories: ["image"],
    });

    await expect(
      harness.service.getGame(OTHER_USER_ID, SESSION_ID),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });

  it("rejects a stale duplicate challenge submission", async () => {
    const harness = createHarness();
    const start = await harness.service.startGame(USER_ID, {
      mode: "ARCADE",
      categories: ["image"],
    });
    harness.advance(1_000);
    await harness.service.submitAnswer(USER_ID, {
      sessionId: SESSION_ID,
      challengeId: start.challenge.id,
      selectedAnswer: "AI",
    });

    await expect(
      harness.service.submitAnswer(USER_ID, {
        sessionId: SESSION_ID,
        challengeId: start.challenge.id,
        selectedAnswer: "AI",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT", status: 409 });
  });

  it("ends Arcade when the third life is lost and persists analytics", async () => {
    const harness = createHarness();
    let response = await harness.service.startGame(USER_ID, {
      mode: "ARCADE",
      categories: ["image", "email", "audio"],
    });

    for (let answerNumber = 0; answerNumber < 3; answerNumber += 1) {
      harness.advance(500);
      const answer = await harness.service.submitAnswer(USER_ID, {
        sessionId: SESSION_ID,
        challengeId: response.challenge.id,
        selectedAnswer:
          response.challenge.id === "22222222-2222-4222-8222-222222222222"
            ? "AI"
            : "REAL",
      });
      if (answer.nextChallenge) {
        response = { ...response, challenge: answer.nextChallenge };
      }
      if (answerNumber < 2) {
        expect(answer.summary).toBeUndefined();
      } else {
        expect(answer.summary).toMatchObject({
          questionsAnswered: 3,
          incorrectAnswers: 3,
          finalScore: 0,
        });
        expect(answer.state).toMatchObject({
          status: "completed",
          lives: 0,
        });
      }
    }

    expect(await harness.sessions.get(SESSION_ID)).toBeNull();
    const analytics = await harness.repository.getAnalytics(USER_ID);
    expect(analytics).toMatchObject({ attempts: 3, correct: 0 });
  });

  it("ignores timers and returns explanations in Training", async () => {
    const harness = createHarness();
    const start = await harness.service.startGame(USER_ID, {
      mode: "TRAINING",
      categories: ["image"],
    });
    harness.advance(60_000);
    const answer = await harness.service.submitAnswer(USER_ID, {
      sessionId: SESSION_ID,
      challengeId: start.challenge.id,
      selectedAnswer: "AI",
    });

    expect(answer).toMatchObject({
      wasCorrect: true,
      awardedPoints: 0,
      state: { lives: null, score: 0, combo: 0 },
    });
    expect(answer.explanation).toBeTruthy();
  });

  it("uses optimistic versions to reject concurrent writes", async () => {
    const harness = createHarness();
    await harness.service.startGame(USER_ID, {
      mode: "ARCADE",
      categories: ["image"],
    });
    const firstCopy = await harness.sessions.get(SESSION_ID);
    const secondCopy = await harness.sessions.get(SESSION_ID);
    expect(firstCopy).not.toBeNull();
    expect(secondCopy).not.toBeNull();

    firstCopy!.score = 100;
    await harness.sessions.save(firstCopy!, 0);
    secondCopy!.score = 200;

    await expect(harness.sessions.save(secondCopy!, 0)).rejects.toMatchObject({
      code: "CONFLICT",
      status: 409,
    });
  });
});
