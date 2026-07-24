# Audio pipeline — AI voice detection category

Generates the audio challenges: **AI** clips (synthesized) vs **real** clips (human).

Fairness principle: the only tell is **voice authenticity**. Every clip — AI and
real — is mono, silence-trimmed, and RMS-normalized to the same target
(`data/audio.json` → `target`), so level, length, and format never betray the label.

## Sources & licenses

| Set  | Source | License | Attribution |
|------|--------|---------|-------------|
| AI   | [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) via `kokoro` | Apache-2.0 | — |
| Real | [LibriSpeech `test-clean`](https://www.openslr.org/12/) | CC BY 4.0 | "LibriSpeech" — V. Panayotov et al., 2015 |

Real clips are read speech from public-domain audiobooks. Keep the attribution above
if these ship in a public build.

## Regenerate

Run in the conda `pytorch` env (CPU is fine — ~18 short clips render in seconds):

```powershell
& "C:\Users\advai\anaconda3\envs\pytorch\python.exe" scripts\tts\gen_ai_voices.py
& "C:\Users\advai\anaconda3\envs\pytorch\python.exe" scripts\tts\extract_real_voices.py
```

- `gen_ai_voices.py` reads the `ai` array in `data/audio.json` and writes
  `output/ai/<id>.wav` + `output/ai/manifest.json`.
- `extract_real_voices.py` downloads LibriSpeech to `scripts/tts/data/` (gitignored,
  re-downloadable, ~346 MB), extracts one clean utterance from each of 18 distinct
  speakers, and writes `output/real/<id>.wav` + `output/real/manifest.json`.

## Dependencies

Installed into the conda `pytorch` env: `kokoro`, `soundfile`, and a torch-2.2-compatible
`transformers==4.44.2` (Kokoro's default `transformers` 5.x requires torch ≥ 2.4). Torch
itself was left untouched (CPU build).

## Publish to Supabase (upload + seed)

Clips live in the **public `challenges` Storage bucket** under `audio/ai/` and
`audio/real/`; `questions.media_url` holds the full public URL (the app consumes it
verbatim). Two steps:

```powershell
# 1. Upload the 36 wavs to the bucket (uses the anon key from .env.local).
node scripts\tts\upload_audio.mjs

# 2. Regenerate the seed SQL from the manifests, then run supabase/seed_audio.sql.
node scripts\tts\build_audio_seed.mjs
```

`upload_audio.mjs` POSTs to the Storage REST API directly (no supabase-js — its realtime
dep needs a WebSocket global missing on Node 20). Uploading with the anon key requires a
**temporary** write policy on `storage.objects`; the scoped `bucket_id = 'challenges'`
check fails because `bucket_id` isn't populated at RLS-check time, so use a broad
`with check (true)` policy for the run and **drop it afterward** (public buckets stay
readable via their `public` flag with no select policy):

```sql
create policy "temp_write_all"  on storage.objects for insert to public with check (true);
create policy "temp_update_all" on storage.objects for update to public using (true) with check (true);
-- ... run node scripts\tts\upload_audio.mjs ...
drop policy "temp_write_all"  on storage.objects;
drop policy "temp_update_all" on storage.objects;
```

`seed_audio.sql` deactivates legacy `aud-%` placeholders (they're referenced by
`question_attempts` and can't be deleted), removes any prior childless `ai-%`/`real-%`
rows, then inserts 36 rows. Difficulty maps `1→EASY, 2→MEDIUM, 3→HARD`; metadata is
`{kind:'audio', seedId, durationMs, mimeType:'audio/wav'}` — no transcript, so the
19th-century LibriSpeech wording can't leak the label.

## Notes

- AI clips are 24 kHz; real LibriSpeech clips stay at their native 16 kHz (no upsampling —
  resampling would be a synthetic artifact). True sample rate is recorded per clip in the
  manifest.
- No `explanation_text` for audio (same as images).
