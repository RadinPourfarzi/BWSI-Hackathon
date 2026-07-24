import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnvironment } from "@/config/environment";

let adminClient: SupabaseClient | undefined;
let authenticationClient: SupabaseClient | undefined;

const sharedOptions = {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
} as const;

export function getSupabaseAdminClient(): SupabaseClient {
  if (adminClient) {
    return adminClient;
  }

  const environment = getEnvironment();
  if (!environment.SUPABASE_URL || !environment.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase administrator credentials are not configured.");
  }

  adminClient = createClient(
    environment.SUPABASE_URL,
    environment.SUPABASE_SERVICE_ROLE_KEY,
    sharedOptions,
  );
  return adminClient;
}

export function getSupabaseAuthenticationClient(): SupabaseClient {
  if (authenticationClient) {
    return authenticationClient;
  }

  const environment = getEnvironment();
  if (!environment.SUPABASE_URL || !environment.SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Supabase authentication credentials are not configured.");
  }

  authenticationClient = createClient(
    environment.SUPABASE_URL,
    environment.SUPABASE_PUBLISHABLE_KEY,
    sharedOptions,
  );
  return authenticationClient;
}
