import {
  analyticsPayloadSchema,
  calculateAnalytics,
  emptyAnalytics,
} from "@/features/analytics/calculations";
import type { PlayerAnalytics } from "@/features/analytics/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getPlayerAnalytics(): Promise<PlayerAnalytics> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return emptyAnalytics(false);

  const { data, error } = await supabase.rpc("get_user_analytics", {
    p_session_limit: 120,
  });
  if (error) return emptyAnalytics(false);

  const parsed = analyticsPayloadSchema.safeParse(data);
  return parsed.success
    ? calculateAnalytics(parsed.data)
    : emptyAnalytics(false);
}
