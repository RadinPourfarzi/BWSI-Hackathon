// One-off uploader: pushes generated audio clips to the public `challenges` bucket
// via the Storage REST API (no supabase-js — avoids the realtime/WebSocket dep on
// Node 20). Reads NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY from .env.local. Requires a
// temporary anon write policy on storage.objects (added/removed around this run).
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

const env = readFileSync(join(root, '.env.local'), 'utf8');
const get = (k) => env.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.trim();
const url = get('NEXT_PUBLIC_SUPABASE_URL');
const key = get('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const BUCKET = 'challenges';

const sets = [
  { dir: join(here, 'output', 'ai'), prefix: 'audio/ai' },
  { dir: join(here, 'output', 'real'), prefix: 'audio/real' },
];

let ok = 0;
let fail = 0;
for (const { dir, prefix } of sets) {
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.wav'))) {
    const path = `${prefix}/${file}`;
    const body = readFileSync(join(dir, file));
    const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        'Content-Type': 'audio/wav',
        'x-upsert': 'true',
      },
      body,
    });
    if (res.ok) {
      console.log(`ok   ${path}`);
      ok += 1;
    } else {
      console.error(`FAIL ${path}: ${res.status} ${await res.text()}`);
      fail += 1;
    }
  }
}
console.log(`\nUploaded ${ok} file(s), ${fail} failure(s).`);
process.exit(fail ? 1 : 0);
