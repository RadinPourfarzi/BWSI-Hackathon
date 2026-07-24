import { describe, expect, it, vi } from "vitest";

import { getChallengeBatch } from "@/services/challenges";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => Promise.resolve(null),
}));

describe("Supabase-only challenge delivery", () => {
  it("does not serve bundled examples when Supabase is not configured", async () => {
    const result = await getChallengeBatch({
      categories: ["image", "email", "voice"],
      excludeIds: [],
      limit: 15,
    });

    expect(result.challenges).toEqual([]);
    expect(result.availableCount).toBe(0);
    expect(result.exhausted).toBe(false);
    expect(result.error).toContain("Supabase is not configured");
  });
});
