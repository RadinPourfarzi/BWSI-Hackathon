"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { signInSchema, signUpSchema } from "@/features/auth/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/utils";

export type AuthActionState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const initialError: AuthActionState = {
  error:
    "Authentication is not configured. Add the Supabase values from .env.example and restart the application.",
};

export async function signIn(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });

  if (!result.success) {
    return {
      error: "Check the highlighted fields and try again.",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return initialError;

  const { error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  });

  if (error) {
    return {
      error:
        error.message === "Invalid login credentials"
          ? "The email or password is incorrect."
          : error.message,
    };
  }

  revalidatePath("/", "layout");
  redirect(safeNextPath(result.data.next));
}

export async function signUp(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = signUpSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });

  if (!result.success) {
    return {
      error: "Check the highlighted fields and try again.",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return initialError;

  const { data, error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      data: {
        display_name: result.data.displayName,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback?next=${encodeURIComponent(safeNextPath(result.data.next))}`,
    },
  });

  if (error) return { error: error.message };

  if (data.session) {
    revalidatePath("/", "layout");
    redirect(safeNextPath(result.data.next));
  }

  return {
    message:
      "Account created. Check your email to confirm your address, then sign in.",
  };
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  if (supabase) await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/");
}
