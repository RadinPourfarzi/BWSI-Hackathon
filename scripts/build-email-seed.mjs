#!/usr/bin/env node
/**
 * Builds supabase/seed_emails.sql from data/emails.json.
 *
 * The generated SQL is idempotent (guarded by metadata->>'seedId') and deactivates the
 * original placeholder email questions (eml-001..006) so the pool is the curated set.
 * Run: `node scripts/build-email-seed.mjs`. Apply the SQL in the Supabase SQL editor
 * (or via the MCP). Source of truth is the JSON; regenerate after editing it.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { emails } = JSON.parse(readFileSync(join(root, 'data', 'emails.json'), 'utf8'));

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

const rows = emails
  .map((e) => {
    const metadata = {
      kind: 'email',
      subject: e.subject,
      senderName: e.senderName,
      senderAddress: e.senderAddress,
      bodyFormat: 'html',
      seedId: e.seedId,
    };
    return `  (${q(e.body)}, ${e.is_ai}, ${q(e.difficulty_rating)}, ${q(e.explanation)}, ${q(
      JSON.stringify(metadata),
    )}::jsonb)`;
  })
  .join(',\n');

const sql = `-- Bot Or Not — curated email dataset. GENERATED from data/emails.json by
-- scripts/build-email-seed.mjs. Do not edit by hand; edit the JSON and regenerate.
-- Idempotent (guarded by metadata->>'seedId'). ${emails.length} emails.

-- Retire the original placeholder emails (kept in table, just hidden from play).
UPDATE questions SET is_active = false
WHERE category_id = 'email' AND metadata->>'seedId' IN ('eml-001','eml-002','eml-003','eml-004','eml-005','eml-006');

INSERT INTO questions (category_id, media_url, is_ai, difficulty_rating, explanation_text, metadata)
SELECT 'email', v.body, v.is_ai, v.difficulty_rating, v.explanation, v.metadata
FROM (VALUES
${rows}
) AS v(body, is_ai, difficulty_rating, explanation, metadata)
WHERE NOT EXISTS (
  SELECT 1 FROM questions q WHERE q.metadata->>'seedId' = v.metadata->>'seedId'
);
`;

writeFileSync(join(root, 'supabase', 'seed_emails.sql'), sql);
console.log(`Wrote supabase/seed_emails.sql (${emails.length} emails).`);
