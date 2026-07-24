# Data sources

Access review date: **2026-07-24**

The starter corpus is intentionally small and committed only when its source
permits redistribution. Gameplay never hotlinks media. The canonical
machine-readable record is `data/dataset-manifest.json`; it contains every
challenge's source URL, license, attribution, payload, and SHA-256 checksum.

## Starter corpus summary

| Category  | Option A |     Option B |  Total | Format           |
| --------- | -------: | -----------: | -----: | ---------------- |
| Images    |     7 AI |       7 real |     14 | Lightweight WebP |
| Emails    |   6 scam | 6 legitimate |     12 | JSON plain text  |
| Voice     |     6 AI |       6 real |     12 | Lightweight Opus |
| **Total** |   **19** |       **19** | **38** | About 1 MB       |

The manifest validator requires unique IDs, unique hashes, at least 12 records
per category, and exact option balance within every category.

## Bundled sources

### Project-generated AI image starter set

- Source: [OpenAI image generation](https://openai.com/index/image-generation-api/)
- Included: 7 generated images
- Data release: CC0 1.0 project data release
- Accessed: 2026-07-24
- Method: Generated specifically for this project, converted to 768 × 768 WebP,
  hashed, and released with the starter data
- Attribution: “Generated for Signal or Synthetic; released with the starter
  data.”

The prompts describe ordinary, non-sensitive scenes. No training-dataset claim
is made. These project-generated assets make the demo playable without copying
a large generative-image archive.

### scikit-image sample data v0.25.2

- Source:
  [scikit-image sample data at v0.25.2](https://github.com/scikit-image/scikit-image/tree/v0.25.2/skimage/data)
- Included: 7 real reference images
- License: Public domain or CC0 1.0 per image, as documented upstream
- Accessed: 2026-07-24
- Method: Fetch pinned source files and convert to bounded WebP assets

Per-item attribution:

| Bundled file      | Attribution                                                    |
| ----------------- | -------------------------------------------------------------- |
| `astronaut.webp`  | NASA photograph of Eileen Collins; public domain               |
| `cat.webp`        | Photograph by Stefan van der Walt; CC0 1.0                     |
| `coffee.webp`     | Photograph by Rachel Michetti; CC0 1.0                         |
| `deep-field.webp` | NASA/ESA Hubble eXtreme Deep Field; public domain              |
| `moon.webp`       | NASA Moon imagery distributed with scikit-image; public domain |
| `retina.webp`     | Mikael Häggström clinical image; CC0 1.0                       |
| `rocket.webp`     | SpaceX launch photograph; public domain                        |

The manifest remains authoritative if upstream documentation changes.

### stdlib-js SpamAssassin public mail corpus

- Source:
  [stdlib-js SpamAssassin dataset](https://github.com/stdlib-js/datasets-spam-assassin)
- Upstream corpus origin:
  [Apache SpamAssassin public corpus](https://spamassassin.apache.org/old/publiccorpus/)
- Included: 12 safe, manually reviewed condensations—6 scam/spam and 6
  legitimate
- License: PDDL 1.0 for the database; CC0 1.0 for contents, as declared by the
  source package
- Pinned revision: `de215192f2eb3eb158b810d7e1ad2a56f5bec5ec`
- Accessed: 2026-07-24

The application does **not** ship original mailbox files. Each included record
is an inert educational condensation. The curation process removes or replaces:

- Real names and personal email addresses
- Message IDs and routing headers
- HTML, scripts, tracking pixels, and remote images
- Live URLs and actionable contact details
- Attachments and executable content
- Unnecessary quoted history and signatures

The renderer uses ordinary React text nodes and never injects HTML. Links are
represented as non-clickable placeholders where they are relevant to the
lesson. The source corpus is never executed.

### Flite synthetic speech

- Source: [Flite](https://github.com/festvox/flite)
- Included: 6 synthetic voice clips
- License: BSD-style Flite license; original project phrases and generated
  outputs released under CC0 1.0
- Accessed: 2026-07-24
- Method: Generate short original phrases with the Flite filter in `ffmpeg`,
  then normalize and encode them as mono Opus

The phrases contain no real personal information and do not imitate a named
person. Generation is reproducible with `npm run data:prepare`.

### SpeechBrain ASR test samples

- Source:
  [SpeechBrain ASR samples at pinned revision](https://github.com/speechbrain/speechbrain/tree/e5cb1f65b940634215650aa1171e0440d0808123/tests/samples/ASR)
- Included: 6 short human speech clips
- License: Apache 2.0
- Pinned revision: `e5cb1f65b940634215650aa1171e0440d0808123`
- Accessed: 2026-07-24
- Method: Fetch the exact test samples, normalize loudness, and convert to mono
  Opus with `ffmpeg`

The conversion changes the encoding, not the real/synthetic classification.
Original project attribution and license are preserved in the manifest and this
document.

## Documented expansion sources

These sources are **not** bundled. They are documented for later, license-aware
expansion:

| Source                                                              | Use                        | License       | Why not bundled                                                       |
| ------------------------------------------------------------------- | -------------------------- | ------------- | --------------------------------------------------------------------- |
| [DiffusionDB](https://huggingface.co/datasets/poloclub/diffusiondb) | Generated images           | CC0 1.0       | Multi-million-image archives are unnecessary for the MVP              |
| [WaveFake](https://zenodo.org/records/5642694)                      | Synthetic speech benchmark | CC BY-SA 4.0  | Large archives and share-alike review belong in a later ingestion job |
| [LJSpeech 1.1](https://keithito.com/LJ-Speech-Dataset/)             | Human reference speech     | Public domain | Large corpus; starter human clips already cover the demo              |

Expansion data must not be activated merely because it is downloadable. It
still requires a license, privacy, content-safety, balance, and quality review.

## Reproduction and validation

```bash
npm run data:prepare:dry
npm run data:prepare
npm run data:manifest
npm run data:validate
```

`scripts/prepare-starter-media.mjs` uses pinned source locations, clear external
tool checks, and bounded conversions. `scripts/build-manifest.mjs` creates the
canonical record and computes the hashes. `scripts/ingest-datasets.ts` then:

1. Parses the entire manifest through Zod.
2. Verifies unique IDs and hashes.
3. Enforces per-category label balance.
4. Verifies every committed media file and email payload checksum.
5. Stops with grouped, actionable errors before network writes.
6. In seed mode, upserts categories and challenge metadata.
7. In upload mode, stores media under a content-addressed path and records that
   path in metadata.

Validation and dry-run modes need no credentials and perform no cloud writes.
Seeding requires the server-only service-role key.

## Legal, privacy, and safety constraints

- Do not add a source until its intended demo/redistribution use is clear.
- Do not commit large archives, secrets, private messages, active tracking
  content, malware, or attachments.
- Do not render user-provided email HTML.
- Replace identifying information unless retaining it is necessary, lawful, and
  documented.
- Preserve attribution and share-alike terms when they apply.
- Treat source labels as educational ground truth for the sample, not proof that
  a visual or audio clue is universally reliable.
- Re-run manifest generation and validation after any byte-level media change.

See `DATA_LICENSE.md` for the concise redistribution notice.
