import { z } from "zod";

import { categoryIds, type CategoryId } from "@/config/categories";

export const reducedMotionValues = ["system", "reduce", "allow"] as const;
export type ReducedMotionPreference = (typeof reducedMotionValues)[number];

export type PlayerSettings = {
  defaultCategories: CategoryId[];
  soundEffects: boolean;
  reducedMotion: ReducedMotionPreference;
  volume: number;
  showKeyboardShortcuts: boolean;
  confirmAbandon: boolean;
  timezoneOffsetMinutes: number;
};

export const defaultPlayerSettings: PlayerSettings = {
  defaultCategories: [...categoryIds],
  soundEffects: true,
  reducedMotion: "system",
  volume: 70,
  showKeyboardShortcuts: true,
  confirmAbandon: true,
  timezoneOffsetMinutes: 0,
};

export const settingsSchema = z.object({
  defaultCategories: z.array(z.enum(categoryIds)).min(1).max(3),
  soundEffects: z.boolean(),
  reducedMotion: z.enum(reducedMotionValues),
  volume: z.number().int().min(0).max(100),
  showKeyboardShortcuts: z.boolean(),
  confirmAbandon: z.boolean(),
  timezoneOffsetMinutes: z.number().int().min(-840).max(840),
});

export const preferencesStorageKey = "bot-or-not:preferences:v1";
