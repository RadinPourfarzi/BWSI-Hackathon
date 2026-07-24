import { beforeEach, describe, expect, it, vi } from "vitest";

import { getChallengeBatch } from "@/services/challenges";
import { makeChallenge } from "../fixtures/challenges";

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
  {
    id: "60000000-0000-4000-8000-000000000004",
    category_id: "image",
    media_url: "/datasets/images/ai/local-only.webp",
    is_ai: true,
    difficulty_rating: "MEDIUM",
    explanation_text: "This local-only row must not enter gameplay.",
    is_active: true,
    metadata: { altText: "Local-only image" },
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

  it("returns only legacy database rows and never fills from bundled data", async () => {
    const result = await getChallengeBatch({
      categories: ["image", "email", "voice"],
      excludeIds: [],
      limit: 15,
    });

    expect(result).toMatchObject({
      error: null,
      exhausted: false,
      availableCount: 3,
    });
    expect(result.challenges).toHaveLength(3);
    expect(
      result.challenges.some(
        (challenge) => challenge.id === "60000000-0000-4000-8000-000000000004",
      ),
    ).toBe(false);
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

  it("marks current-schema rows as Supabase content and resolves Storage media", async () => {
    const fixture = makeChallenge({
      index: 801,
      category: "image",
      correctChoice: "option_a",
    });
    const categoryId = "60000000-0000-4000-8000-000000000010";

    mocks.client = {
      from(table: string) {
        if (table === "categories") {
          return {
            select: () => ({
              in: () => ({
                eq: () =>
                  Promise.resolve({
                    data: [{ id: categoryId, slug: "image" }],
                    error: null,
                  }),
              }),
            }),
          };
        }

        if (table === "challenges") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  limit: () =>
                    Promise.resolve({
                      data: [
                        {
                          id: fixture.id,
                          category_id: categoryId,
                          content_type: fixture.contentType,
                          payload: fixture.payload,
                          correct_choice: fixture.correctChoice,
                          option_a_label: fixture.labels.optionA,
                          option_b_label: fixture.labels.optionB,
                          difficulty: fixture.difficulty.tier,
                          difficulty_metadata: {
                            signals: fixture.difficulty.signals,
                          },
                          explanation: fixture.explanation,
                          source_dataset: fixture.sourceDataset,
                          original_source_url: fixture.originalSourceUrl,
                          license: fixture.license,
                          attribution: fixture.attribution,
                          content_hash: fixture.contentHash,
                          active: true,
                          metadata: {
                            storagePath: "image/database.webp",
                          },
                        },
                      ],
                      error: null,
                    }),
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
                    Promise.resolve({
                      data: null,
                      error: { code: "42P01", message: "questions missing" },
                    }),
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

    const result = await getChallengeBatch({
      categories: ["image"],
      excludeIds: [],
      limit: 15,
    });

    expect(result.challenges).toHaveLength(1);
    expect(result.challenges[0]?.metadata.catalogSource).toBe(
      "modern-supabase",
    );
    expect(
      result.challenges[0]?.payload.kind === "image"
        ? result.challenges[0].payload.src
        : "",
    ).toContain("/storage/v1/object/sign/challenge-media/image/database.webp");
  });
});
