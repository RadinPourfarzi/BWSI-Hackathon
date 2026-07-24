import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260724200000_arcade_training_gameplay.sql",
  ),
  "utf8",
);

describe("Phase Two persistence migration", () => {
  it("defines an authenticated atomic and idempotent run boundary", () => {
    expect(migration).toContain(
      "create or replace function public.finalize_game_run",
    );
    expect(migration).toContain("security definer");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("game_sessions_user_client_run_idx");
    expect(migration).toContain(
      "grant execute on function public.finalize_game_run",
    );
  });

  it("recomputes answers, timing, combos, lives, XP, and aggregates", () => {
    for (const contractMarker of [
      "challenge_record.correct_choice",
      "expected_decay_alpha",
      "expected_combo_multiplier",
      "incorrect_total >= 3",
      "answer_xp :=",
      "category_accuracy_value",
      "new_high_score",
    ]) {
      expect(migration).toContain(contractMarker);
    }
  });

  it("keeps all final writes inside the completion function", () => {
    const functionBody = migration.slice(
      migration.indexOf("create or replace function public.finalize_game_run"),
    );

    expect(functionBody).toContain("insert into public.game_sessions");
    expect(functionBody).toContain("insert into public.question_attempts");
    expect(functionBody).toContain("insert into public.xp_history");
    expect(functionBody).toContain("update public.user_stats");
    expect(functionBody).toContain("insert into public.daily_streaks");
  });
});
