import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database.types';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

/**
 * Server Supabase client for Server Components, Server Actions, and Route Handlers. A new
 * client is created per request because it depends on that request's cookies.
 *
 * Server Components cannot write cookies; the `setAll` try/catch swallows that case. The
 * proxy (proxy.ts) is responsible for refreshing and persisting the auth token.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component — safe to ignore; the proxy refreshes sessions.
        }
      },
    },
  });
}
