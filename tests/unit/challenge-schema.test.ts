import { describe, expect, it } from "vitest";

import { challengeSchema } from "@/features/game/schemas";

const validChallenge = {
  id: "00000000-0000-4000-8000-000000008888",
  category: "email",
  contentType: "email",
  payload: {
    kind: "email",
    senderName: "Project List",
    senderAddress: "members@example.com",
    subject: "Meeting notes",
    body: "The meeting notes are attached to the existing project thread.",
  },
  correctChoice: "option_b",
  labels: { optionA: "Scam", optionB: "Legitimate" },
  difficulty: { tier: "easy", signals: ["known context"] },
  explanation: "The context and sender are consistent.",
  sourceDataset: "Fixture",
  originalSourceUrl: "https://example.com/data",
  license: "CC0-1.0",
  attribution: "Test fixture",
  contentHash: "b".repeat(64),
  active: true,
  metadata: {},
};

describe("challenge schema", () => {
  it("accepts a category-aligned challenge", () => {
    expect(challengeSchema.safeParse(validChallenge).success).toBe(true);
  });

  it("rejects payload kinds that do not match the category", () => {
    const invalid = {
      ...validChallenge,
      contentType: "image",
      payload: {
        kind: "image",
        src: "/image.webp",
        alt: "Example",
        width: 768,
        height: 768,
      },
    };

    expect(challengeSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects malformed hashes", () => {
    expect(
      challengeSchema.safeParse({
        ...validChallenge,
        contentHash: "not-a-hash",
      }).success,
    ).toBe(false);
  });
});
