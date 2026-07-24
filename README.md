# Signal or Synthetic

Signal or Synthetic is an educational AI-detection game—the “GeoGuessr of AI
detection.” Players make fast binary calls on generated images, sanitized
scam-email samples, and synthetic voices, then receive immediate explanations
about the signals that mattered.

Phase two includes complete, authenticated Arcade and Training experiences; a
pure deterministic game engine; an atomic Supabase persistence boundary; and a
lightweight, redistribution-safe starter corpus.

## Included

- Next.js App Router, React, strict TypeScript, and Tailwind CSS
- Supabase email/password authentication, protected routes, PostgreSQL, RLS,
  atomic run persistence, and optional Storage uploads
- One serializable binary engine with deterministic shuffling, batch merging,
  lives, timeouts, pause/resume, duplicate protection, and session summaries
- Category-specific scoring plateaus followed by configurable power decay,
  1×–4× combos, progressive difficulty, and XP rewards
- Arcade with three lives, auto-advance feedback, high scores, and rich
  game-over metrics
- Unlimited Training with immediate feedback, explanations, exit summaries,
  and no score pressure
- Mixed category selection by default, persistent category toggles, and
  authenticated 15-challenge batches that replenish below five queued items
- Registered image, inert email, and audio renderers with accessible loading,
  error, attribution, replay, and keyboard behavior
- Zustand with separate durable run snapshots and transient network/save state;
  Zod validation at data boundaries
- Analytics, Profile, and Settings shell routes
- Recharts analytics visualization
- A 38-challenge starter corpus:
  - 14 images: 7 AI / 7 real
  - 12 emails: 6 scam / 6 legitimate
  - 12 voice clips: 6 AI / 6 real
- Reproducible dataset preparation, hashing, validation, seeding, and optional
  Storage upload scripts
- Vitest unit, store, renderer, and mocked-boundary integration tests plus
  public and authenticated Playwright journeys

## Requirements

- Node.js 22 or newer
- npm 10 or newer
- A Supabase project for authentication and persistent gameplay
- The Supabase CLI if applying migrations from the command line
- An `ffmpeg` build with the Flite filter only when regenerating bundled audio

The public home page and local validation commands work without Supabase.
Protected gameplay fails gracefully with setup instructions until Supabase is
configured.

## Local setup

1. Install dependencies.

   ```bash
   npm install
   ```

2. Copy the environment template.

   ```bash
   cp .env.example .env.local
   ```

3. Create a Supabase project and fill in the values in `.env.local`. Keep
   `SUPABASE_SERVICE_ROLE_KEY` server-only.

4. Apply both database migrations. With a linked Supabase CLI project:

   ```bash
   supabase db push
   ```

   For a local Supabase project, `supabase db reset` applies the migration and
   `supabase/seed.sql`.

5. Validate and seed the starter challenges.

   ```bash
   npm run data:validate
   npm run data:seed
   ```

   Use `npm run data:upload` instead when media should also be copied into the
   `challenge-media` Storage bucket. The current web payloads intentionally use
   the bundled `/public` paths; uploaded object paths are retained in challenge
   metadata for a hosted-media adapter.

6. Start the app.

   ```bash
   npm run dev
   ```

   Open `http://localhost:3000`, create an account, and play from the protected
   application.

## Environment variables

| Variable                        | Visibility   | Purpose                        |
| ------------------------------- | ------------ | ------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Browser-safe | Supabase project URL           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe | Supabase anonymous key         |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server only  | Dataset/database seeding       |
| `SUPABASE_MEDIA_BUCKET`         | Server only  | Optional media upload bucket   |
| `NEXT_PUBLIC_SITE_URL`          | Browser-safe | Authentication callback origin |

Never expose the service-role key to browser code or commit real credentials.

## Data workflow

The committed manifest is `data/dataset-manifest.json`. It contains the generic
challenge records, source metadata, labels, licensing, attributions, and
content hashes.

```bash
npm run data:prepare:dry  # show corpus preparation without writes/downloads
npm run data:prepare      # reproducibly fetch and preprocess supported sources
npm run data:manifest     # rebuild hashes and the machine-readable manifest
npm run data:validate     # validate schema, balance, uniqueness, files, and hashes
npm run data:seed         # upsert categories and challenges into Supabase
npm run data:upload       # seed plus optional Storage uploads
```

The preparation script uses pinned upstream revisions for reproducibility.
Email records are curated, plain-text condensations of open corpus samples:
addresses, HTML, live links, identifying details, and attachments are not
included or executed.

See [DATA_SOURCES.md](docs/DATA_SOURCES.md) and
[DATA_LICENSE.md](DATA_LICENSE.md) before redistributing the starter data.

## Quality commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Playwright requires an installed Chromium browser. Supabase-backed end-to-end
flows also require a configured project and a dedicated test account:

```bash
E2E_EMAIL="test-account@example.com" \
E2E_PASSWORD="test-account-password" \
npm run test:e2e
```

Without those two variables, the public landing-page test runs and the
authenticated journey is reported as skipped.

## Repository map

```text
src/app/                 Next.js routes and protected shell
src/components/          Reusable application and UI components
src/config/              Configuration-driven game mechanics
src/features/            Auth, game, analytics, and profile features
src/lib/                 Environment, Supabase, and utility boundaries
src/services/            Challenge, profile, and persistence operations
src/types/               Strongly typed database representation
supabase/migrations/     Normalized schema, atomic functions, constraints, RLS
supabase/seed/           Stable category seed
scripts/                 Dataset preparation, manifest, and ingestion tooling
data/                    Machine-readable challenge manifest
public/datasets/         Lightweight starter media
docs/                    Product, architecture, sources, and decisions
tests/                   Unit, integration, fixture, and Playwright tests
```

## Documentation

- [Product specification](docs/PRODUCT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data sources and safety](docs/DATA_SOURCES.md)
- [Architecture decisions](docs/DECISIONS.md)

## Security and current boundaries

The browser receives each validated challenge’s correct option so feedback and
score resolution remain immediate and a refreshed run can resume without an
answer round trip. The final database function does not trust the submitted
facts: it reloads each challenge, recomputes correctness, timing parameters,
obtainable score, combo multiplier, awarded score, lives, XP, streaks, and
aggregates before committing one transaction. This is appropriate for
educational casual play, but the exposed answer key means this is not a
cheat-resistant ranked protocol. A future ranked mode must issue ordered
server-side challenges and resolve answers on an authoritative clock.

The project does not ship multiplayer, public leaderboards, classroom
management, video challenges, or a production analytics pipeline. The schema
and renderer registry leave explicit extension points for those features.
Cloud migration, hosted seeding, Storage uploads, and authenticated browser
testing require project credentials and are never reported as successful
unless run against a real Supabase project.
