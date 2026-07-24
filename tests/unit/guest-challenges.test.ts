import { describe, expect, it } from "vitest";

import { getGuestChallengeBatch } from "@/services/challenges";

describe("guest challenge batches", () => {
  it("serves validated bundled challenges without Supabase", () => {
    const result = getGuestChallengeBatch({
      categories: ["image", "email", "voice"],
      excludeIds: [],
      limit: 15,
    });

    expect(result.error).toBeNull();
    expect(result.challenges).toHaveLength(15);
    expect(result.availableCount).toBe(38);
    expect(result.challenges.every((challenge) => challenge.active)).toBe(true);
  });

  it("honors category filters and exclusions", () => {
    const first = getGuestChallengeBatch({
      categories: ["email"],
      excludeIds: [],
      limit: 12,
    });
    const excludedIds = first.challenges.map((challenge) => challenge.id);
    const exhausted = getGuestChallengeBatch({
      categories: ["email"],
      excludeIds: excludedIds,
      limit: 12,
    });

    expect(first.availableCount).toBe(12);
    expect(
      first.challenges.every((challenge) => challenge.category === "email"),
    ).toBe(true);
    expect(exhausted.challenges).toHaveLength(0);
    expect(exhausted.exhausted).toBe(true);
  });
});
