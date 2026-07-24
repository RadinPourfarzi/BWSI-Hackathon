import { describe, expect, it } from "vitest";

import {
  defaultPlayerSettings,
  settingsSchema,
} from "@/features/settings/types";

describe("settings schema", () => {
  it("accepts the safe application defaults", () => {
    expect(settingsSchema.parse(defaultPlayerSettings)).toEqual(
      defaultPlayerSettings,
    );
  });

  it("requires a category and bounds volume and timezone", () => {
    expect(
      settingsSchema.safeParse({
        ...defaultPlayerSettings,
        defaultCategories: [],
      }).success,
    ).toBe(false);
    expect(
      settingsSchema.safeParse({
        ...defaultPlayerSettings,
        volume: 101,
      }).success,
    ).toBe(false);
    expect(
      settingsSchema.safeParse({
        ...defaultPlayerSettings,
        timezoneOffsetMinutes: 900,
      }).success,
    ).toBe(false);
  });
});
