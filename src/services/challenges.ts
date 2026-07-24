import { categoryIds, type CategoryId } from "@/config/categories";
import type { DifficultyId } from "@/config/difficulty";
import { gameConfig } from "@/config/game";
import { challengeSchema } from "@/features/game/schemas";
import type { Challenge } from "@/features/game/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ChallengeBatchResult = {
  challenges: Challenge[];
  error: string | null;
  exhausted: boolean;
  availableCount: number;
};

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

export async function getChallengeBatch({
  limit,
  categories = [...categoryIds],
  excludeIds = [],
}: {
  limit: number;
  categories?: CategoryId[];
  excludeIds?: string[];
}): Promise<ChallengeBatchResult> {
  const normalizedLimit = Math.min(
    gameConfig.batch.maximumRequestSize,
    Math.max(1, Math.floor(limit)),
  );
  const normalizedCategories = categoryIds.filter((category) =>
    categories.includes(category),
  );

  if (normalizedCategories.length === 0) {
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
      error: "Supabase is not configured.",
      exhausted: false,
      availableCount: 0,
    };
  }

  const categoryResult = await supabase
    .from("categories")
    .select("id, slug")
    .in("slug", normalizedCategories)
    .eq("active", true);

  if (categoryResult.error || !categoryResult.data?.length) {
    return {
      challenges: [],
      error:
        categoryResult.error?.message ??
        "No active challenge categories are seeded.",
      exhausted: false,
      availableCount: 0,
    };
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
    .limit(Math.max(normalizedLimit * 4, normalizedLimit));

  if (challengeResult.error) {
    return {
      challenges: [],
      error: challengeResult.error.message,
      exhausted: false,
      availableCount: 0,
    };
  }

  const excluded = new Set(excludeIds);
  const validatedChallenges = (challengeResult.data ?? [])
    .map((row) => {
      const category = categoryById.get(row.category_id);
      const difficultyMetadata =
        row.difficulty_metadata &&
        typeof row.difficulty_metadata === "object" &&
        !Array.isArray(row.difficulty_metadata)
          ? row.difficulty_metadata
          : {};
      const signals = Array.isArray(difficultyMetadata.signals)
        ? difficultyMetadata.signals.filter(
            (value): value is string => typeof value === "string",
          )
        : [];

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
        metadata: row.metadata,
      });

      return parsed.success ? parsed.data : null;
    })
    .filter((challenge): challenge is Challenge => challenge !== null);
  const challenges = randomize(
    validatedChallenges.filter((challenge) => !excluded.has(challenge.id)),
  ).slice(0, normalizedLimit);
  const exhausted =
    challenges.length === 0 &&
    validatedChallenges.length > 0 &&
    validatedChallenges.every((challenge) => excluded.has(challenge.id));

  return {
    challenges,
    error:
      challenges.length > 0
        ? null
        : exhausted
          ? "Every available challenge in this selection has been used."
          : "Active rows were found, but none passed challenge validation.",
    exhausted,
    availableCount: validatedChallenges.length,
  };
}
