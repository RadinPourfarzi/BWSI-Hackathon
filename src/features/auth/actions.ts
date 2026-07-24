"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  passwordResetRequestSchema,
  passwordUpdateSchema,
  signInSchema,
  signUpSchema,
} from "@/features/auth/schemas";
import { getSiteUrl } from "@/lib/env";
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

function signInErrorMessage(message: string): string {
  if (message === "Invalid login credentials") {
    return "The email or password is incorrect.";
  }
  if (message.toLowerCase().includes("email not confirmed")) {
    return "Confirm your email address before signing in.";
  }
  if (message.toLowerCase().includes("rate limit")) {
    return "Too many attempts. Wait a moment and try again.";
  }

  return "Sign-in could not be completed. Please try again.";
}

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
    return { error: signInErrorMessage(error.message) };
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
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(safeNextPath(result.data.next))}`,
    },
  });

  if (error) {
    return {
      error:
        "The account could not be created. Try signing in or resetting your password.",
    };
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect(safeNextPath(result.data.next));
  }

  return {
    message:
      "Account created. Check your email to confirm your address, then sign in.",
  };
}

export async function requestPasswordReset(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = passwordResetRequestSchema.safeParse({
    email: formData.get("email"),
  });

  if (!result.success) {
    return {
      error: "Enter a valid email address.",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return initialError;

  await supabase.auth.resetPasswordForEmail(result.data.email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=%2Freset-password`,
  });

  return {
    message:
      "If an account matches that email, a secure password-reset link is on its way.",
  };
}

export async function updatePassword(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = passwordUpdateSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!result.success) {
    return {
      error: "Check the highlighted fields and try again.",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return initialError;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: "This reset link has expired. Request a new password-reset link.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: result.data.password,
  });
  if (error) {
    return { error: "The password could not be updated. Request a new link." };
  }

  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/sign-in?message=password-updated");
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  if (supabase) await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/");
}
