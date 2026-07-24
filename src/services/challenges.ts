import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  categoryConfig,
  categoryIds,
  type CategoryId,
} from "@/config/categories";
import type { DifficultyId } from "@/config/difficulty";
import { gameConfig } from "@/config/game";
import { challengeSchema } from "@/features/game/schemas";
import type { Challenge } from "@/features/game/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";
import type { LegacyDatabase } from "@/types/legacy-database";

export type ChallengeBatchResult = {
  challenges: Challenge[];
  error: string | null;
  exhausted: boolean;
  availableCount: number;
};

type NormalizedBatchRequest = {
  limit: number;
  categories: CategoryId[];
  excludeIds: Set<string>;
};

type CatalogBatch = {
  challenges: Challenge[];
  availableCount: number;
  exhausted: boolean;
};

const legacyQuestionSchema = z.object({
  id: z.uuid(),
  category_id: z.string().trim().min(1),
  media_url: z.string().trim().min(1),
  is_ai: z.boolean(),
  difficulty_rating: z.string().trim().optional().nullable(),
  explanation_text: z.string().trim().optional().nullable(),
  is_active: z.boolean().optional().default(true),
  metadata: z.unknown().optional().nullable(),
});

function randomize<T>(values: T[]): T[] {
  const copy = [...values];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    const currentValue = copy[index];
    const targetValue = copy[target];

    if (currentValue === undefined || targetValue === undefined) continue;
    copy[index] = targetValue;
    copy[target] = currentValue;
  }

  return copy;
}

function normalizeBatchRequest({
  limit,
  categories,
  excludeIds = [],
}: {
  limit: number;
  categories: CategoryId[];
  excludeIds?: string[];
}): NormalizedBatchRequest {
  return {
    limit: Math.min(
      gameConfig.batch.maximumRequestSize,
      Math.max(1, Math.floor(limit)),
    ),
    categories: categoryIds.filter((category) => categories.includes(category)),
    excludeIds: new Set(excludeIds),
  };
}

function metadataRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function metadataString(
  metadata: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return null;
}

function metadataNumber(
  metadata: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }

  return null;
}

function metadataStrings(
  metadata: Record<string, unknown>,
  keys: string[],
): string[] {
  for (const key of keys) {
    const value = metadata[key];
    if (!Array.isArray(value)) continue;

    return value.filter(
      (item): item is string => typeof item === "string" && item.trim() !== "",
    );
  }

  return [];
}

function validHttpUrl(value: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function normalizeStoragePath(path: string, bucket: string): string {
  const storagePrefix = "storage://";
  let normalized = path.trim().replace(/^\/+/, "");

  if (normalized.startsWith(storagePrefix)) {
    normalized = normalized.slice(storagePrefix.length);
    const separator = normalized.indexOf("/");
    if (separator >= 0) normalized = normalized.slice(separator + 1);
  }

  if (normalized.startsWith(`${bucket}/`)) {
    normalized = normalized.slice(bucket.length + 1);
  }

  return normalized;
}

async function resolveStorageMedia({
  supabase,
  bucket,
  path,
  fallback,
}: {
  supabase: SupabaseClient<Database>;
  bucket: string;
  path: string;
  fallback: string;
}): Promise<string> {
  const absoluteUrl = validHttpUrl(path);
  if (absoluteUrl) return absoluteUrl;
  if (path.startsWith("/")) return path;

  const storagePath = normalizeStoragePath(path, bucket);
  if (!storagePath) return fallback;

  try {
    const signed = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, 60 * 60);

    if (!signed.error && signed.data.signedUrl) {
      return signed.data.signedUrl;
    }
  } catch {
    // Public buckets do not require a signed URL.
  }

  const publicResult = supabase.storage.from(bucket).getPublicUrl(storagePath);
  return publicResult.data.publicUrl || fallback;
}

function difficultyFromLegacy(value: string | null | undefined): DifficultyId {
  const normalized = value?.toLowerCase();
  if (normalized === "easy") return "easy";
  if (normalized === "hard" || normalized === "expert") return "hard";
  return "medium";
}

function categoryFromLegacy(value: string): CategoryId | null {
  if (value === "image" || value === "email") return value;
  if (value === "audio" || value === "voice") return "voice";
  return null;
}

function legacyCategoryIds(categories: CategoryId[]): string[] {
  return categories.map((category) =>
    category === "voice" ? "audio" : category,
  );
}

function contentHashFromUuid(id: string): string {
  const compact = id.replaceAll("-", "").toLowerCase();
  return `${compact}${compact}`;
}

function usesLocalMedia(challenge: Challenge): boolean {
  if (
    challenge.payload.kind === "image" ||
    challenge.payload.kind === "audio"
  ) {
    return challenge.payload.src.startsWith("/");
  }

  return challenge.payload.screenshotSrc?.startsWith("/") ?? false;
}

function hasResolvableStoragePath(metadataValue: unknown): boolean {
  const storagePath = metadataString(metadataRecord(metadataValue), [
    "storagePath",
    "storage_path",
  ]);

  return Boolean(
    storagePath &&
    (validHttpUrl(storagePath) !== null || !storagePath.startsWith("/")),
  );
}

export function mapLegacyQuestionToChallenge(
  value: unknown,
  resolvedMediaUrl: string,
): Challenge | null {
  const parsedRow = legacyQuestionSchema.safeParse(value);
  if (!parsedRow.success) return null;

  const row = parsedRow.data;
  const category = categoryFromLegacy(row.category_id);
  if (!category || !row.is_active) return null;

  const metadata = metadataRecord(row.metadata);
  const labels = categoryConfig[category];
  const sourceUrl =
    validHttpUrl(
      metadataString(metadata, [
        "originalSourceUrl",
        "original_source_url",
        "sourceUrl",
        "source_url",
      ]),
    ) ??
    validHttpUrl(row.media_url) ??
    "https://supabase.com/";
  const explanation =
    row.explanation_text ??
    metadataString(metadata, ["explanation", "explanationText"]) ??
    "Review the content carefully and compare its strongest authenticity signals.";
  const signals = metadataStrings(metadata, [
    "signals",
    "detectionSignals",
  ]).slice(0, 8);
  const common = {
    id: row.id,
    category,
    correctChoice: row.is_ai ? ("option_a" as const) : ("option_b" as const),
    labels: {
      optionA: labels.optionA,
      optionB: labels.optionB,
    },
    difficulty: {
      tier: difficultyFromLegacy(row.difficulty_rating),
      signals,
    },
    explanation,
    sourceDataset:
      metadataString(metadata, ["sourceDataset", "source_dataset"]) ??
      "Current Supabase catalog",
    originalSourceUrl: sourceUrl,
    license:
      metadataString(metadata, ["license", "licenseName"]) ??
      "Project-provided educational content",
    attribution:
      metadataString(metadata, ["attribution", "source"]) ??
      "Bot or Not Supabase catalog",
    contentHash: contentHashFromUuid(row.id),
    active: true,
    metadata: {
      ...metadata,
      catalogSource: "legacy-supabase",
      originalMediaPath: row.media_url,
    },
  };

  const candidate =
    category === "image"
      ? {
          ...common,
          contentType: "image" as const,
          payload: {
            kind: "image" as const,
            src: resolvedMediaUrl,
            alt:
              metadataString(metadata, ["altText", "alt_text", "alt"]) ??
              "Image authenticity challenge",
            width: Math.max(
              1,
              Math.round(
                metadataNumber(metadata, ["widthPx", "width_px", "width"]) ??
                  1_024,
              ),
            ),
            height: Math.max(
              1,
              Math.round(
                metadataNumber(metadata, ["heightPx", "height_px", "height"]) ??
                  1_024,
              ),
            ),
          },
        }
      : category === "voice"
        ? {
            ...common,
            contentType: "audio" as const,
            payload: {
              kind: "audio" as const,
              src: resolvedMediaUrl,
              transcript:
                metadataString(metadata, ["transcript", "audioTranscript"]) ??
                undefined,
              durationSeconds:
                metadataNumber(metadata, ["durationSeconds"]) ??
                (() => {
                  const durationMs = metadataNumber(metadata, [
                    "durationMs",
                    "duration_ms",
                  ]);
                  return durationMs ? durationMs / 1_000 : undefined;
                })(),
            },
          }
        : {
            ...common,
            contentType: "email" as const,
            payload: {
              kind: "email" as const,
              senderName:
                metadataString(metadata, ["senderName", "sender_name"]) ??
                "Unknown sender",
              senderAddress:
                metadataString(metadata, [
                  "senderAddress",
                  "sender_address",
                  "from",
                ]) ?? "unknown@example.com",
              subject:
                metadataString(metadata, ["subject", "emailSubject"]) ??
                "Email authenticity challenge",
              body:
                metadataString(metadata, [
                  "body",
                  "bodyText",
                  "body_text",
                  "text",
                  "html",
                ]) ??
                "Inspect the email screenshot, sender identity, wording, and requested action.",
              receivedAt:
                metadataString(metadata, ["receivedAt", "received_at"]) ??
                undefined,
              screenshotSrc: resolvedMediaUrl,
            },
          };

  const parsedChallenge = challengeSchema.safeParse(candidate);
  return parsedChallenge.success ? parsedChallenge.data : null;
}

async function resolveModernChallengeMedia({
  challenge,
  metadataValue,
  supabase,
}: {
  challenge: Challenge;
  metadataValue: Json;
  supabase: SupabaseClient<Database>;
}): Promise<Challenge> {
  const metadata = metadataRecord(metadataValue);
  const storagePath = metadataString(metadata, ["storagePath", "storage_path"]);
  if (!storagePath) return challenge;

  const bucket =
    metadataString(metadata, ["storageBucket", "storage_bucket", "bucket"]) ??
    process.env.SUPABASE_MEDIA_BUCKET ??
    "challenge-media";
  const fallback =
    challenge.payload.kind === "image" || challenge.payload.kind === "audio"
      ? challenge.payload.src
      : "";
  const source = await resolveStorageMedia({
    supabase,
    bucket,
    path: storagePath,
    fallback,
  });

  if (challenge.payload.kind === "image") {
    return {
      ...challenge,
      payload: { ...challenge.payload, src: source },
    };
  }

  if (challenge.payload.kind === "audio") {
    return {
      ...challenge,
      payload: { ...challenge.payload, src: source },
    };
  }

  return {
    ...challenge,
    payload: { ...challenge.payload, screenshotSrc: source },
  };
}

async function getModernCatalogBatch(
  supabase: SupabaseClient<Database>,
  request: NormalizedBatchRequest,
): Promise<CatalogBatch> {
  const categoryResult = await supabase
    .from("categories")
    .select("id, slug")
    .in("slug", request.categories)
    .eq("active", true);

  if (categoryResult.error || !categoryResult.data?.length) {
    return { challenges: [], availableCount: 0, exhausted: false };
  }

  const categoryById = new Map(
    categoryResult.data.map((category) => [category.id, category.slug]),
  );
  const categoryDatabaseIds = categoryResult.data.map(
    (category) => category.id,
  );
  const challengeResult = await supabase
    .from("challenges")
    .select("*")
    .eq("active", true)
    .in("category_id", categoryDatabaseIds)
    .limit(Math.max(request.limit * 6, request.limit));

  if (challengeResult.error) {
    return { challenges: [], availableCount: 0, exhausted: false };
  }

  const validated = (challengeResult.data ?? [])
    .map((row) => {
      const category = categoryById.get(row.category_id);
      const difficultyMetadata = metadataRecord(row.difficulty_metadata);
      const signals = metadataStrings(difficultyMetadata, ["signals"]);
      const metadata = {
        ...metadataRecord(row.metadata),
        catalogSource: "modern-supabase",
      };
      const parsed = challengeSchema.safeParse({
        id: row.id,
        category,
        contentType: row.content_type,
        payload: row.payload,
        correctChoice: row.correct_choice,
        labels: {
          optionA: row.option_a_label,
          optionB: row.option_b_label,
        },
        difficulty: {
          tier: row.difficulty as DifficultyId,
          signals,
        },
        explanation: row.explanation,
        sourceDataset: row.source_dataset,
        originalSourceUrl: row.original_source_url,
        license: row.license,
        attribution: row.attribution,
        contentHash: row.content_hash,
        active: row.active,
        metadata,
      });

      return parsed.success
        ? { challenge: parsed.data, metadata: row.metadata }
        : null;
    })
    .filter(
      (
        item,
      ): item is {
        challenge: Challenge;
        metadata: Json;
      } => item !== null,
    );
  const playable = validated.filter(
    ({ challenge, metadata }) =>
      !usesLocalMedia(challenge) || hasResolvableStoragePath(metadata),
  );
  const selected = randomize(
    playable.filter(({ challenge }) => !request.excludeIds.has(challenge.id)),
  ).slice(0, request.limit);
  const challenges = await Promise.all(
    selected.map(({ challenge, metadata }) =>
      resolveModernChallengeMedia({
        challenge,
        metadataValue: metadata,
        supabase,
      }),
    ),
  );

  return {
    challenges,
    availableCount: playable.length,
    exhausted:
      challenges.length === 0 &&
      playable.length > 0 &&
      playable.every(({ challenge }) => request.excludeIds.has(challenge.id)),
  };
}

async function getLegacyCatalogBatch(
  supabase: SupabaseClient<Database>,
  request: NormalizedBatchRequest,
): Promise<CatalogBatch> {
  const legacyClient = supabase as unknown as SupabaseClient<LegacyDatabase>;
  const questionResult = await legacyClient
    .from("questions")
    .select(
      "id, category_id, media_url, is_ai, difficulty_rating, explanation_text, is_active, metadata",
    )
    .eq("is_active", true)
    .in("category_id", legacyCategoryIds(request.categories))
    .limit(Math.max(request.limit * 6, request.limit));

  if (questionResult.error) {
    return { challenges: [], availableCount: 0, exhausted: false };
  }

  const validatedRows = (questionResult.data ?? [])
    .map((row) => legacyQuestionSchema.safeParse(row))
    .filter((result) => result.success)
    .map((result) => result.data);
  const playableRows = validatedRows.filter(
    (row) =>
      validHttpUrl(row.media_url) !== null || !row.media_url.startsWith("/"),
  );
  const selectedRows = randomize(
    playableRows.filter((row) => !request.excludeIds.has(row.id)),
  ).slice(0, request.limit);
  const challenges = (
    await Promise.all(
      selectedRows.map(async (row) => {
        const metadata = metadataRecord(row.metadata);
        const bucket =
          metadataString(metadata, [
            "storageBucket",
            "storage_bucket",
            "bucket",
          ]) ?? "challenges";
        const source = await resolveStorageMedia({
          supabase,
          bucket,
          path: row.media_url,
          fallback: row.media_url,
        });

        return mapLegacyQuestionToChallenge(row, source);
      }),
    )
  ).filter((challenge): challenge is Challenge => challenge !== null);

  return {
    challenges,
    availableCount: playableRows.length,
    exhausted:
      challenges.length === 0 &&
      playableRows.length > 0 &&
      playableRows.every((row) => request.excludeIds.has(row.id)),
  };
}

export async function getChallengeBatch({
  limit,
  categories = [...categoryIds],
  excludeIds = [],
}: {
  limit: number;
  categories?: CategoryId[];
  excludeIds?: string[];
}): Promise<ChallengeBatchResult> {
  const normalized = normalizeBatchRequest({
    limit,
    categories,
    excludeIds,
  });

  if (normalized.categories.length === 0) {
    return {
      challenges: [],
      error: "Select at least one valid challenge category.",
      exhausted: false,
      availableCount: 0,
    };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      challenges: [],
      error:
        "Supabase is not configured. Add the public Supabase URL and anon key, restart the app, and try again.",
      exhausted: false,
      availableCount: 0,
    };
  }

  const [modernBatch, legacyBatch] = await Promise.all([
    getModernCatalogBatch(supabase, normalized),
    getLegacyCatalogBatch(supabase, normalized),
  ]);
  const databaseChallenges = new Map<string, Challenge>();

  for (const challenge of [
    ...modernBatch.challenges,
    ...legacyBatch.challenges,
  ]) {
    if (usesLocalMedia(challenge)) continue;

    if (!databaseChallenges.has(challenge.id)) {
      databaseChallenges.set(challenge.id, challenge);
    }
  }

  const challenges = [...databaseChallenges.values()].slice(
    0,
    normalized.limit,
  );
  const availableCount =
    modernBatch.availableCount + legacyBatch.availableCount;

  if (challenges.length > 0) {
    return {
      challenges,
      error: null,
      exhausted: false,
      availableCount: Math.max(challenges.length, availableCount),
    };
  }

  const exhausted = modernBatch.exhausted || legacyBatch.exhausted;

  return {
    challenges: [],
    error: exhausted
      ? "Every active Supabase challenge in this selection has been used."
      : "No active Supabase challenges are available for this selection. Check the catalog policies, media migration, and database rows.",
    exhausted,
    availableCount,
  };
}
