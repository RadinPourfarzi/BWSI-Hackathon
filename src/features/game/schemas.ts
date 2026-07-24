import { z } from "zod";

import { categoryIds } from "@/config/categories";
import { difficultyIds } from "@/config/difficulty";

export const binaryChoiceSchema = z.enum(["option_a", "option_b"]);

export const labelsSchema = z.object({
  optionA: z.string().trim().min(1).max(32),
  optionB: z.string().trim().min(1).max(32),
});

const imagePayloadSchema = z.object({
  kind: z.literal("image"),
  src: z.string().min(1),
  alt: z.string().trim().min(1).max(240),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const emailPayloadSchema = z.object({
  kind: z.literal("email"),
  senderName: z.string().trim().min(1).max(100),
  senderAddress: z.string().trim().min(1).max(160),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(2_000),
  receivedAt: z.string().trim().min(1).max(80).optional(),
});

const audioPayloadSchema = z.object({
  kind: z.literal("audio"),
  src: z.string().min(1),
  transcript: z.string().trim().max(500).optional(),
  durationSeconds: z.number().positive().max(60).optional(),
});

export const challengePayloadSchema = z.discriminatedUnion("kind", [
  imagePayloadSchema,
  emailPayloadSchema,
  audioPayloadSchema,
]);

export const challengeSchema = z
  .object({
    id: z.uuid(),
    category: z.enum(categoryIds),
    contentType: z.enum(["image", "email", "audio"]),
    payload: challengePayloadSchema,
    correctChoice: binaryChoiceSchema,
    labels: labelsSchema,
    difficulty: z.object({
      tier: z.enum(difficultyIds),
      signals: z.array(z.string().trim().min(1).max(160)).max(8),
    }),
    explanation: z.string().trim().min(1).max(800),
    sourceDataset: z.string().trim().min(1).max(160),
    originalSourceUrl: z.url(),
    license: z.string().trim().min(1).max(120),
    attribution: z.string().trim().min(1).max(300),
    contentHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/, "Expected a lowercase SHA-256 hash"),
    active: z.boolean(),
    metadata: z.record(z.string(), z.unknown()),
  })
  .superRefine((challenge, context) => {
    const expectedContentType = {
      image: "image",
      email: "email",
      voice: "audio",
    }[challenge.category];

    if (challenge.contentType !== expectedContentType) {
      context.addIssue({
        code: "custom",
        path: ["contentType"],
        message: `Category ${challenge.category} requires ${expectedContentType} content`,
      });
    }

    if (challenge.payload.kind !== expectedContentType) {
      context.addIssue({
        code: "custom",
        path: ["payload", "kind"],
        message: `Payload kind must be ${expectedContentType}`,
      });
    }
  });

export const datasetSourceSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  url: z.url(),
  license: z.string().trim().min(1),
  accessDate: z.iso.date(),
  bundled: z.boolean(),
  notes: z.string().trim().min(1),
});

export const datasetManifestSchema = z
  .object({
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    generatedAt: z.iso.datetime(),
    sources: z.array(datasetSourceSchema).min(3),
    challenges: z.array(challengeSchema).min(36),
  })
  .superRefine((manifest, context) => {
    const ids = new Set<string>();
    const hashes = new Set<string>();

    manifest.challenges.forEach((challenge, index) => {
      if (ids.has(challenge.id)) {
        context.addIssue({
          code: "custom",
          path: ["challenges", index, "id"],
          message: "Challenge IDs must be unique",
        });
      }
      ids.add(challenge.id);

      if (hashes.has(challenge.contentHash)) {
        context.addIssue({
          code: "custom",
          path: ["challenges", index, "contentHash"],
          message: "Content hashes must be unique",
        });
      }
      hashes.add(challenge.contentHash);
    });

    for (const category of categoryIds) {
      const challenges = manifest.challenges.filter(
        (challenge) => challenge.category === category,
      );
      const optionA = challenges.filter(
        (challenge) => challenge.correctChoice === "option_a",
      ).length;
      const optionB = challenges.length - optionA;

      if (challenges.length < 12 || optionA !== optionB) {
        context.addIssue({
          code: "custom",
          path: ["challenges"],
          message: `${category} must have at least 12 challenges with balanced labels`,
        });
      }
    }
  });
