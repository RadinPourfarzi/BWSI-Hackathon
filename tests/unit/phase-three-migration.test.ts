import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260724230000_phase_three_completion.sql",
  ),
  "utf8",
);

describe("Phase Three migration", () => {
  it("adds durable settings with owner-only RLS", () => {
    expect(migration).toContain(
      "create table if not exists public.user_settings",
    );
    expect(migration).toContain(
      "alter table public.user_settings enable row level security",
    );
    expect(migration).toContain("(select auth.uid()) = user_id");
    expect(migration).toContain("grant update (display_name)");
    expect(migration).not.toContain(
      "grant select, insert, update on table public.user_settings",
    );
  });

  it("keeps finalization idempotent and corrects the local activity date", () => {
    expect(migration).toContain("public.finalize_game_run_v2");
    expect(migration).toContain("p_timezone_offset_minutes");
    expect(migration).toContain("duplicate_submission");
    expect(migration).toContain("if duplicate_submission then");
    expect(migration).toContain("activity_date = session_activity_date");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("attempt_count > 0");
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
  });

  it("provides bounded server-side analytics", () => {
    expect(migration).toContain("public.get_user_analytics");
    expect(migration).toContain(
      "least(greatest(coalesce(p_session_limit, 120), 1), 200)",
    );
    expect(migration).toContain("status = 'completed'");
  });
});
