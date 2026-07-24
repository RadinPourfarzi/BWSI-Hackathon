"use client";

import { z } from "zod";

import type { CategoryId } from "@/config/categories";
import { challengeSchema } from "@/features/game/schemas";
import type { Challenge } from "@/features/game/types";

const challengeBatchResponseSchema = z.object({
  challenges: z.array(challengeSchema),
  error: z.string().nullable(),
  exhausted: z.boolean(),
  availableCount: z.number().int().nonnegative(),
});
const challengeErrorResponseSchema = z.object({
  error: z.string().min(1),
});

export type ClientChallengeBatch = {
  challenges: Challenge[];
  error: string | null;
  exhausted: boolean;
  availableCount: number;
};

export async function fetchChallengeBatch({
  categories,
  excludeIds,
  limit,
  signal,
}: {
  categories: CategoryId[];
  excludeIds: string[];
  limit: number;
  signal?: AbortSignal;
}): Promise<ClientChallengeBatch> {
  const search = new URLSearchParams({
    categories: categories.join(","),
    exclude: excludeIds.join(","),
    limit: String(limit),
  });
  const requestOptions: RequestInit = {
    cache: "no-store",
    credentials: "same-origin",
  };
  if (signal) requestOptions.signal = signal;

  const response = await fetch(
    `/api/challenges?${search.toString()}`,
    requestOptions,
  );
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorPayload = challengeErrorResponseSchema.safeParse(payload);
    throw new Error(
      errorPayload.success
        ? errorPayload.data.error
        : "Challenges could not be loaded.",
    );
  }

  const parsed = challengeBatchResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("The challenge service returned an invalid response.");
  }

  return parsed.data;
}
