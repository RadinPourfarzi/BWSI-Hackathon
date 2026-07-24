"use server";

import { revalidatePath } from "next/cache";

import { categoryIds } from "@/config/categories";
import { settingsSchema, type PlayerSettings } from "@/features/settings/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SettingsActionState = {
  error?: string;
  message?: string;
  settings?: PlayerSettings;
};

export async function updateSettings(
  _previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = settingsSchema.safeParse({
    defaultCategories: formData.getAll("defaultCategories"),
    soundEffects: formData.get("soundEffects") === "on",
    reducedMotion: formData.get("reducedMotion"),
    volume: Number(formData.get("volume")),
    showKeyboardShortcuts: formData.get("showKeyboardShortcuts") === "on",
    confirmAbandon: formData.get("confirmAbandon") === "on",
    timezoneOffsetMinutes: Number(formData.get("timezoneOffsetMinutes")),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Check your preferences and try again.",
    };
  }

  const categories = categoryIds.filter((category) =>
    parsed.data.defaultCategories.includes(category),
  );
  const settings = { ...parsed.data, defaultCategories: categories };
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { error: "Settings are unavailable until Supabase is configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in and try again." };

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      default_categories: settings.defaultCategories,
      sound_effects: settings.soundEffects,
      reduced_motion: settings.reducedMotion,
      volume: settings.volume,
      show_keyboard_shortcuts: settings.showKeyboardShortcuts,
      confirm_abandon: settings.confirmAbandon,
      timezone_offset_minutes: settings.timezoneOffsetMinutes,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return {
      error:
        "Settings could not be saved. Apply the Phase 3 migration and retry.",
    };
  }

  revalidatePath("/app", "layout");
  return { message: "Settings saved.", settings };
}
