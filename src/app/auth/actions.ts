'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export interface AuthActionState {
  error: string | null;
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
