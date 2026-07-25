'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export interface AuthActionState {
  error: string | null;
}

export interface ForgotPasswordState {
  error: string | null;
  sent: boolean;
}

async function requestOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get('origin');
  if (origin) return origin;
  const host = h.get('host') ?? 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
}

function readCredentials(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  return { email, password };
}

/** Email/password sign-in. Redirects to the target (or home) on success. */
export async function signIn(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const { email, password } = readCredentials(formData);
  const redirectTo = String(formData.get('redirect') ?? '') || '/';

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message };
  }
  redirect(redirectTo);
}

/** Email/password sign-up. Username is stored in user metadata for the profile trigger. */
export async function signUp(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const { email, password } = readCredentials(formData);
  const username = String(formData.get('username') ?? '').trim();
  const redirectTo = String(formData.get('redirect') ?? '') || '/';

  if (!email || !password || !username) {
    return { error: 'Username, email, and password are required.' };
  }
  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) {
    return { error: error.message };
  }
  redirect(redirectTo);
}

/** Sign out and return to the login page. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

/**
 * Send a password-reset email. The link routes through /auth/callback (which exchanges the
 * recovery code for a session) and lands on /reset-password. Requires the project's email
 * (SMTP) to be configured and the origin allowed in Supabase Auth URL settings.
 */
export async function requestPasswordReset(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) {
    return { error: 'Email is required.', sent: false };
  }

  const supabase = await createClient();
  const origin = await requestOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  if (error) {
    return { error: error.message, sent: false };
  }
  return { error: null, sent: true };
}

/** Set a new password for the recovery session created by the reset link. */
export async function updatePassword(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters.' };
  }
  if (password !== confirm) {
    return { error: 'Passwords do not match.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }
  redirect('/');
}
