import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getPublicSupabaseConfig } from "@/lib/env";
import type { Database } from "@/types/database";

export async function createServerSupabaseClient(): Promise<SupabaseClient<Database> | null> {
  const config = getPublicSupabaseConfig();
  if (!config) return null;

  const cookieStore = await cookies();

  return createServerClient<Database>(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot set cookies. The proxy refreshes them.
        }
      },
    },
  });
}
