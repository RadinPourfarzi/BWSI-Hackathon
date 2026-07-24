"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ProfileActionState = {
  error?: string;
  message?: string;
};

const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters.")
    .max(40, "Display name must be 40 characters or fewer."),
});

export async function updateProfile(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const result = profileSchema.safeParse({
    displayName: formData.get("displayName"),
  });
  if (!result.success) {
    return {
      error: result.error.issues[0]?.message ?? "Enter a valid display name.",
    };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { error: "Profile editing requires a configured Supabase project." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in and try again." };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: result.data.displayName })
    .eq("id", user.id);
  if (error) return { error: "Your display name could not be saved." };

  await supabase.auth.updateUser({
    data: { display_name: result.data.displayName },
  });

  revalidatePath("/app", "layout");
  return { message: "Profile updated." };
}
