/**
 * Public Supabase env vars (safe for the browser; NEXT_PUBLIC_*). The publishable/anon key
 * is intended to be shipped to clients — RLS enforces access. Never expose the service_role
 * key here.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Surface misconfiguration early rather than failing on the first request.
  console.warn('[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or key. Set them in .env.local.');
}
