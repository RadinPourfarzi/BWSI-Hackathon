import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260724234000_database_media_compatibility.sql",
  ),
  "utf8",
);

describe("database media compatibility migration", () => {
  it("supports both catalog schemas without granting writes", () => {
    expect(migration).toContain("to_regclass('public.challenges')");
    expect(migration).toContain("to_regclass('public.questions')");
    expect(migration).toContain("grant select on table public.challenges");
    expect(migration).toContain("grant select on table public.questions");
    expect(migration).not.toMatch(/grant\s+(insert|update|delete)/i);
  });

  it("allows guests to read only the known challenge media buckets", () => {
    expect(migration).toContain("to anon, authenticated");
    expect(migration).toContain(
      "bucket_id in ('challenges', 'challenge-media')",
    );
  });
});
