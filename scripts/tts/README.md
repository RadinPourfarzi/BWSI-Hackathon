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

## Notes

- AI clips are 24 kHz; real LibriSpeech clips stay at their native 16 kHz (no upsampling —
  resampling would be a synthetic artifact). True sample rate is recorded per clip in the
  manifest.
- No `explanation_text` for audio (same as images).
- Hosting/seeding into Supabase is a later step (Storage bucket TBD).
