import { describe, expect, it } from "vitest";

import { mapLegacyQuestionToChallenge } from "@/services/challenges";

const baseQuestion = {
  id: "40000000-0000-4000-8000-000000000001",
  category_id: "image",
  media_url: "image/example.webp",
  is_ai: true,
  difficulty_rating: "HARD",
  explanation_text: "The lighting and geometry are inconsistent.",
  is_active: true,
  metadata: {},
};

describe("legacy Supabase challenge adapter", () => {
  it("maps image rows and resolved Storage URLs into the game contract", () => {
    const challenge = mapLegacyQuestionToChallenge(
      {
        ...baseQuestion,
        metadata: {
          altText: "A person standing outside",
          widthPx: 900,
          heightPx: 600,
          source: "Team dataset",
        },
      },
      "https://project.supabase.co/storage/v1/object/sign/challenges/image/example.webp",
    );

    expect(challenge).toMatchObject({
      category: "image",
      contentType: "image",
      correctChoice: "option_a",
      difficulty: { tier: "hard" },
      payload: {
        kind: "image",
        alt: "A person standing outside",
        width: 900,
        height: 600,
      },
    });
    expect(challenge?.payload).toHaveProperty(
      "src",
      "https://project.supabase.co/storage/v1/object/sign/challenges/image/example.webp",
    );
  });

  it("maps the legacy audio category to voice and preserves audio metadata", () => {
    const challenge = mapLegacyQuestionToChallenge(
      {
        ...baseQuestion,
        id: "40000000-0000-4000-8000-000000000002",
        category_id: "audio",
        media_url: "audio/example.mp3",
        is_ai: false,
        difficulty_rating: "EASY",
        metadata: {
          transcript: "This is a sample.",
          durationMs: 3_250,
        },
      },
      "https://project.supabase.co/storage/v1/object/public/challenges/audio/example.mp3",
    );

    expect(challenge).toMatchObject({
      category: "voice",
      contentType: "audio",
      correctChoice: "option_b",
      difficulty: { tier: "easy" },
      payload: {
        kind: "audio",
        transcript: "This is a sample.",
        durationSeconds: 3.25,
      },
    });
  });

  it("uses legacy email media as a screenshot while keeping metadata text", () => {
    const challenge = mapLegacyQuestionToChallenge(
      {
        ...baseQuestion,
        id: "40000000-0000-4000-8000-000000000003",
        category_id: "email",
        media_url: "email/example.png",
        metadata: {
          senderName: "Account Team",
          senderAddress: "notice@example.com",
          subject: "Review your account",
          bodyText: "Check the sender and requested action.",
          receivedAt: "2026-07-24",
        },
      },
      "https://project.supabase.co/storage/v1/object/public/challenges/email/example.png",
    );

    expect(challenge).toMatchObject({
      category: "email",
      contentType: "email",
      payload: {
        kind: "email",
        senderName: "Account Team",
        senderAddress: "notice@example.com",
        subject: "Review your account",
        body: "Check the sender and requested action.",
        screenshotSrc:
          "https://project.supabase.co/storage/v1/object/public/challenges/email/example.png",
      },
    });
  });
});
