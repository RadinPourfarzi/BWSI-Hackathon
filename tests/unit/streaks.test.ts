import { describe, expect, it } from "vitest";

import { calculateStreaks } from "@/features/progression/streaks";

describe("calculateStreaks", () => {
  it("counts one calendar date once and keeps yesterday active", () => {
    expect(
      calculateStreaks(
        ["2026-07-20", "2026-07-20", "2026-07-21", "2026-07-22"],
        "2026-07-23",
      ),
    ).toEqual({ current: 3, longest: 3 });
  });

  it("resets the current streak after a missed local day", () => {
    expect(
      calculateStreaks(
        ["2026-07-18", "2026-07-19", "2026-07-20"],
        "2026-07-23",
      ),
    ).toEqual({ current: 0, longest: 3 });
  });

  it("handles month boundaries as consecutive days", () => {
    expect(
      calculateStreaks(
        ["2026-07-30", "2026-07-31", "2026-08-01"],
        "2026-08-01",
      ),
    ).toEqual({ current: 3, longest: 3 });
  });
});
