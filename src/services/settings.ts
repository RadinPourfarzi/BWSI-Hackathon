import { categoryIds, type CategoryId } from "@/config/categories";
import { cache } from "react";
import {
  defaultPlayerSettings,
  reducedMotionValues,
  type PlayerSettings,
  type ReducedMotionPreference,
} from "@/features/settings/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function validCategories(values: string[]): CategoryId[] {
  const categories = categoryIds.filter((category) =>
    values.includes(category),
  );
  return categories.length > 0 ? categories : [...categoryIds];
}

function validReducedMotion(value: string): ReducedMotionPreference {
  return reducedMotionValues.includes(value as ReducedMotionPreference)
    ? (value as ReducedMotionPreference)
    : "system";
}

export const getPlayerSettings = cache(async function getPlayerSettings(
  userId: string,
): Promise<PlayerSettings> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return defaultPlayerSettings;

  const { data } = await supabase
    .from("user_settings")
    .select(
      "default_categories, sound_effects, reduced_motion, volume, show_keyboard_shortcuts, confirm_abandon, timezone_offset_minutes",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return defaultPlayerSettings;

  return {
    defaultCategories: validCategories(data.default_categories),
    soundEffects: data.sound_effects,
    reducedMotion: validReducedMotion(data.reduced_motion),
    volume: data.volume,
    showKeyboardShortcuts: data.show_keyboard_shortcuts,
    confirmAbandon: data.confirm_abandon,
    timezoneOffsetMinutes: data.timezone_offset_minutes,
  };
});
