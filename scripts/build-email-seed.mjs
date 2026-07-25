#!/usr/bin/env node
/**
 * Builds supabase/seed_emails.sql from data/emails.json.
 *
 * Renders two body templates to inline-styled HTML:
 *  - 'plain':         person-to-person / simple internal notes (padded text block).
 *  - 'transactional': branded automated email (colored header, body, styled non-clickable
 *                     CTA with the URL printed as visible text, muted footer).
 *
 * The generated SQL is idempotent (guarded by metadata->>'seedId') AND update-capable: it
 * UPDATEs bodies/labels/metadata for existing seedIds and INSERTs any new ones, so it can
 * be re-run against an already-seeded database. It also retires the original placeholder
 * emails (eml-001..006). Run: `node scripts/build-email-seed.mjs`.
 *
 * Security: content is authored here (trusted) and uses inline styles only — no scripts,
 * event handlers, or external resources. CTAs are styled spans, not real links.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { emails } = JSON.parse(readFileSync(join(root, 'data', 'emails.json'), 'utf8'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function renderPlain(e) {
  return (
    '<div style="padding:16px;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;' +
    `font-size:14px;line-height:1.6;">${esc(e.body)}</div>`
  );
}

function renderTransactional(e) {
  const headerText = e.brandTextColor ?? '#ffffff';
  const lines = (e.lines ?? [])
    .map(
      (l) =>
        `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#1a1a1a;">${esc(l)}</p>`,
    )
    .join('');

  let cta = '';
  if (e.cta) {
    cta =
      '<div style="margin:18px 0 8px;">' +
      `<span style="display:inline-block;background:${e.brandColor};color:${headerText};` +
      'padding:11px 22px;border-radius:6px;font-size:14px;font-weight:bold;">' +
      `${esc(e.cta.label)}</span></div>` +
      '<p style="margin:0;font-size:12px;color:#6b7280;word-break:break-all;">' +
      `${esc(e.cta.url)}</p>`;
  }

  const footer = e.footer
    ? `<div style="padding:12px 18px;background:#f4f4f5;color:#71717a;font-size:11px;` +
      `line-height:1.4;">${esc(e.footer)}</div>`
    : '';

  return (
    '<div style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;">' +
    `<div style="background:${e.brandColor};padding:14px 18px;">` +
    `<span style="color:${headerText};font-size:16px;font-weight:bold;letter-spacing:0.3px;">` +
    `${esc(e.brand)}</span></div>` +
    `<div style="padding:18px;">${lines}${cta}</div>` +
    footer +
    '</div>'
  );
}

function renderBody(e) {
  return e.template === 'transactional' ? renderTransactional(e) : renderPlain(e);
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

const values = emails
  .map((e) => {
    const metadata = {
      kind: 'email',
      subject: e.subject,
      senderName: e.senderName,
      senderAddress: e.senderAddress,
      bodyFormat: 'html',
      seedId: e.seedId,
    };
    return `  (${q(renderBody(e))}, ${e.is_ai}, ${q(e.difficulty_rating)}, ${q(
      e.explanation,
    )}, ${q(JSON.stringify(metadata))}::jsonb)`;
  })
  .join(',\n');

const valuesBlock = `(VALUES\n${values}\n) AS v(body, is_ai, difficulty_rating, explanation, metadata)`;

const sql = `-- Bot Or Not — curated email dataset. GENERATED from data/emails.json by
-- scripts/build-email-seed.mjs. Do not edit by hand; edit the JSON and regenerate.
-- Idempotent + update-capable (matched on metadata->>'seedId'). ${emails.length} emails.

-- Retire the original placeholder emails (kept in table, just hidden from play).
UPDATE questions SET is_active = false
WHERE category_id = 'email' AND metadata->>'seedId' IN ('eml-001','eml-002','eml-003','eml-004','eml-005','eml-006');

-- Update existing curated rows in place (body, label, difficulty, explanation, metadata).
UPDATE questions q SET
  media_url = v.body,
  is_ai = v.is_ai,
  difficulty_rating = v.difficulty_rating,
  explanation_text = v.explanation,
  metadata = v.metadata,
  is_active = true
FROM ${valuesBlock}
WHERE q.metadata->>'seedId' = v.metadata->>'seedId';

-- Insert any curated rows that don't exist yet.
INSERT INTO questions (category_id, media_url, is_ai, difficulty_rating, explanation_text, metadata)
SELECT 'email', v.body, v.is_ai, v.difficulty_rating, v.explanation, v.metadata
FROM ${valuesBlock}
WHERE NOT EXISTS (
  SELECT 1 FROM questions q WHERE q.metadata->>'seedId' = v.metadata->>'seedId'
);
`;

writeFileSync(join(root, 'supabase', 'seed_emails.sql'), sql);
console.log(`Wrote supabase/seed_emails.sql (${emails.length} emails).`);
