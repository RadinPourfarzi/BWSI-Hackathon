import { NextResponse } from "next/server";
import { z } from "zod";

import { categoryIds } from "@/config/categories";
import { gameConfig } from "@/config/game";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getChallengeBatch } from "@/services/challenges";

const requestSchema = z.object({
  categories: z.array(z.enum(categoryIds)).min(1),
  excludeIds: z.array(z.uuid()).max(gameConfig.maximumRecordedAttempts),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(gameConfig.batch.maximumRequestSize),
});

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "The game service is not configured." },
      { status: 503 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in to load challenges." },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const parsed = requestSchema.safeParse({
    categories: url.searchParams.get("categories")?.split(",").filter(Boolean),
    excludeIds:
      url.searchParams.get("exclude")?.split(",").filter(Boolean) ?? [],
    limit: url.searchParams.get("limit"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "The challenge request is invalid." },
      { status: 400 },
    );
  }

  const result = await getChallengeBatch({
    categories: parsed.data.categories,
    excludeIds: parsed.data.excludeIds,
    limit: parsed.data.limit,
  });

  return NextResponse.json(result, {
    status: result.challenges.length > 0 || result.exhausted ? 200 : 503,
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
