import { beforeEach, describe, expect, it, vi } from "vitest";

import { getChallengeBatch } from "@/services/challenges";

const mocks = vi.hoisted(() => ({
  client: null as unknown,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => Promise.resolve(mocks.client),
}));

const questions = [
  {
    id: "60000000-0000-4000-8000-000000000001",
    category_id: "image",
    media_url: "image/database.webp",
    is_ai: true,
    difficulty_rating: "HARD",
    explanation_text: "Database image explanation.",
    is_active: true,
    metadata: { altText: "Database image" },
  },
  {
    id: "60000000-0000-4000-8000-000000000002",
    category_id: "audio",
    media_url: "audio/database.mp3",
    is_ai: false,
    difficulty_rating: "EASY",
    explanation_text: "Database audio explanation.",
    is_active: true,
    metadata: { durationMs: 2_500 },
  },
  {
    id: "60000000-0000-4000-8000-000000000003",
    category_id: "email",
    media_url: "email/database.png",
    is_ai: true,
    difficulty_rating: "MEDIUM",
    explanation_text: "Database email explanation.",
    is_active: true,
    metadata: {
      senderName: "Database Sender",
      senderAddress: "sender@example.com",
      subject: "Database subject",
      bodyText: "Database email body.",
    },
  },
];

describe("database-backed challenge batching", () => {
  beforeEach(() => {
    mocks.client = {
      from(table: string) {
        if (table === "categories") {
          return {
            select: () => ({
              in: () => ({
                eq: () =>
                  Promise.resolve({
                    data: null,
                    error: { code: "42703", message: "slug does not exist" },
                  }),
              }),
            }),
          };
        }

        if (table === "questions") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  limit: () =>
                    Promise.resolve({ data: questions, error: null }),
                }),
              }),
            }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      },
      storage: {
        from(bucket: string) {
          return {
            createSignedUrl: (path: string) =>
              Promise.resolve({
                data: {
                  signedUrl: `https://project.supabase.co/storage/v1/object/sign/${bucket}/${path}?token=test`,
                },
                error: null,
              }),
            getPublicUrl: (path: string) => ({
              data: {
                publicUrl: `https://project.supabase.co/storage/v1/object/public/${bucket}/${path}`,
              },
            }),
          };
        },
      },
    };
  });

  it("uses legacy database rows and Storage media before bundled fallback", async () => {
    const result = await getChallengeBatch({
      categories: ["image", "email", "voice"],
      excludeIds: [],
      limit: 3,
    });

    expect(result).toMatchObject({
      error: null,
      exhausted: false,
    });
    expect(result.challenges).toHaveLength(3);
    expect(
      result.challenges.every(
        (challenge) => challenge.metadata.catalogSource === "legacy-supabase",
      ),
    ).toBe(true);

    const audio = result.challenges.find(
      (challenge) => challenge.category === "voice",
    );
    expect(audio?.payload).toMatchObject({
      kind: "audio",
      durationSeconds: 2.5,
    });
    expect(audio?.payload.kind === "audio" ? audio.payload.src : "").toContain(
      "/storage/v1/object/sign/challenges/audio/database.mp3",
    );

    const email = result.challenges.find(
      (challenge) => challenge.category === "email",
    );
    expect(
      email?.payload.kind === "email" ? email.payload.screenshotSrc : "",
    ).toContain("/storage/v1/object/sign/challenges/email/database.png");
  });
});
