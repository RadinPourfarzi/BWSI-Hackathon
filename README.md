# Bot or Not

Bot or Not is a fast educational game for learning how to recognize
AI-generated images, scam emails, and synthetic voices. Players make a timed
binary choice, receive immediate feedback, and build a persistent record of
accuracy, speed, XP, levels, streaks, and category strengths.

The final hackathon MVP includes guest and authenticated Arcade and Training
modes, a real analytics dashboard, profile and settings management,
local-calendar streaks, resilient game restoration, automated tests, CI, and
deployment-ready Supabase and Vercel configuration.

## Product tour

- **Arcade:** three lives, score decay, 1×–4× combos, progressive difficulty,
  auto-advance feedback, high scores, and XP.
- **Training:** unlimited practice, category selection, explanations, signal
  tags, and a persisted learning summary.
- **Guest play:** Arcade and Training use the bundled validated corpus without
  Supabase. Guest results are intentionally not added to account analytics.
- **Analytics:** overall and category accuracy, question/game totals, response
  time, score, levels, XP, streaks, category insights, and six historical
  charts. Histories are bounded to 120 sessions and small samples are labeled.
- **Profile:** display name editing, email, join date, progression, strongest
  category, recent activity, and secure sign-out.
- **Settings:** default categories, sound effects, volume, reduced motion,
  keyboard hints, and abandon confirmation. Preferences are stored in Supabase
  and cached locally.
- **Reliability:** run snapshots survive refreshes, duplicate saves are
  idempotent, queued play continues during refill failures, and failed saves
  can be retried.
- **Accessibility:** keyboard play, visible focus, semantic controls,
  screen-reader feedback, chart text equivalents, reduced-motion support, and
  responsive touch targets.

## Architecture

Bot or Not uses Next.js App Router and React for the application, Supabase Auth
and PostgreSQL for identity and persistence, Zustand for active run state, Zod
for runtime validation, and Recharts for analytics.

The browser resolves answers immediately for responsive educational gameplay.
At completion, `finalize_game_run_v2` calls the server-owned scoring
transaction, verifies the authenticated owner, reloads challenge answers,
recomputes scoring and combos, prevents duplicate rewards, applies the player’s
local calendar date, and commits progression atomically. Analytics read
pre-aggregated session facts through a bounded RPC, so gameplay routes do not
load chart code or large attempt histories.

```text
src/app/                 Routes, layouts, API handlers, health endpoint
src/components/          Shared navigation and UI primitives
src/config/              Game, score, XP, category, and animation configuration
src/features/            Auth, game, analytics, profile, settings, progression
src/lib/                 Environment, Supabase, and utility boundaries
src/services/            Bounded data access and persistence
src/types/               Generated-style database types
supabase/migrations/     Schema, RLS, secure functions, settings, analytics
scripts/                 Dataset preparation, validation, and ingestion
data/                    Machine-readable dataset manifest
public/datasets/         Lightweight bundled media
docs/                    Architecture, decisions, sources, and demo guide
tests/                   Unit, integration, and Playwright tests
```

## Starter dataset

The repository contains 38 balanced, content-hashed challenges:

| Category  | Option A |     Option B |  Total |
| --------- | -------: | -----------: | -----: |
| Images    |     7 AI |       7 real |     14 |
| Email     |   6 scam | 6 legitimate |     12 |
| Voice     |     6 AI |       6 real |     12 |
| **Total** |   **19** |       **19** | **38** |

Images come from project-generated CC0 assets and redistribution-safe
scikit-image samples. Email challenges are inert, sanitized condensations based
on the SpamAssassin public corpus. Voice clips use Flite synthetic speech and
SpeechBrain test samples. Full licenses, pinned revisions, access dates, and
per-item attribution are in [Data sources](docs/DATA_SOURCES.md) and
[DATA_LICENSE.md](DATA_LICENSE.md).

## Requirements

- Node.js 22 or newer
- npm with lockfile support
- A Supabase project for authentication and persistent gameplay; optional for
  guest-only play
- Supabase CLI for command-line migrations
- Playwright Chromium for browser tests
- `ffmpeg` with the Flite filter only when regenerating bundled audio

## Local setup

1. Install exactly the locked dependencies.

   ```bash
   npm ci
   ```

2. Create a local environment file.

   ```bash
   cp .env.example .env.local
   ```

3. To use accounts and cloud persistence, fill in the Supabase values. Never
   expose or commit the service-role key. You may skip this step for guest play.

4. Link the Supabase project and apply all three migrations.

   ```bash
   npx supabase@latest login
   npx supabase@latest link --project-ref YOUR_PROJECT_REF
   npx supabase@latest db push
   ```

5. Validate and seed the starter catalog.

   ```bash
   npm run data:validate
   npm run data:seed
   ```

   Use `npm run data:upload` to copy media into the private
   `challenge-media` bucket as well. Bundled `/public` paths remain the
   reliable MVP default.

6. Start the application.

   ```bash
   npm run dev
   ```

   Open `http://localhost:3000`.

## Environment variables

| Variable                        | Visibility     | Required      | Purpose                              |
| ------------------------------- | -------------- | ------------- | ------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Browser-safe   | Yes           | Supabase project URL                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe   | Yes           | Supabase anonymous key               |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server only    | Seeding only  | Dataset and Storage ingestion        |
| `SUPABASE_MEDIA_BUCKET`         | Server only    | No            | Defaults to `challenge-media`        |
| `NEXT_PUBLIC_SITE_URL`          | Browser-safe   | Yes           | Exact deployed authentication origin |
| `E2E_EMAIL`                     | CI/server only | Full E2E only | Dedicated test account               |
| `E2E_PASSWORD`                  | CI/server only | Full E2E only | Dedicated test password              |

Only variables prefixed with `NEXT_PUBLIC_` may enter browser bundles. The
service-role key is imported only by the ingestion script.

## Supabase authentication setup

In Supabase Authentication URL Configuration:

- Set **Site URL** to the production origin, such as
  `https://bot-or-not.example.com`.
- Add `http://localhost:3000/auth/callback` for development.
- Add `https://YOUR_DOMAIN/auth/callback` for production.
- Keep email/password authentication enabled.
- Use a dedicated account—not a personal account—for authenticated E2E tests.

Sign-in preserves safe local destinations. Confirmation and password-recovery
links exchange their short-lived code through `/auth/callback`. Redirect
validation rejects absolute, protocol-relative, backslash, and control-character
destinations.

Without a configured session, `/app/play` and `/app/training` use the local
validated manifest. Guest sessions keep only the active refresh-recovery
snapshot and never call the account persistence RPC. Analytics, Profile,
Settings, and the account home remain protected.

## Dataset workflow

```bash
npm run data:prepare:dry
npm run data:prepare
npm run data:manifest
npm run data:validate
npm run data:seed
npm run data:upload
```

`data:validate` verifies schemas, category counts, label balance, unique IDs,
unique SHA-256 hashes, local media, and attribution metadata without cloud
writes. Seeding uses idempotent upserts.

## Quality commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm audit --omit=dev --audit-level=high
npm run data:validate
npm run build
npx playwright install chromium
npm run test:e2e
```

The public Playwright journey runs without credentials. The authenticated
journey runs when `E2E_EMAIL` and `E2E_PASSWORD` are present; otherwise it is
reported as skipped. GitHub Actions executes the complete quality gate on
pushes and pull requests with npm caching and lockfile enforcement.

To enable the authenticated CI journey, add
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `E2E_EMAIL`, and
`E2E_PASSWORD` as repository secrets. The E2E account should belong to a
disposable seeded test project. No service-role key is needed by CI.

## Deployment

### Supabase

```bash
npx supabase@latest link --project-ref YOUR_PROJECT_REF
npx supabase@latest db push
npm run data:seed
```

Run `npm run data:upload` only when the hosted-media copy is required. Confirm
that RLS is enabled for every user-owned table and that `user_settings`,
`finalize_game_run_v2`, and `get_user_analytics` exist before deploying the
web application.

### Vercel

```bash
npx vercel@latest link
npx vercel@latest env add NEXT_PUBLIC_SUPABASE_URL
npx vercel@latest env add NEXT_PUBLIC_SUPABASE_ANON_KEY
npx vercel@latest env add NEXT_PUBLIC_SITE_URL
npx vercel@latest deploy --prod
```

The install command is `npm ci`; the build command is `npm run build`. The
service-role key is unnecessary for normal runtime and should be omitted from
Vercel unless a deliberately server-only ingestion job needs it.

After deployment:

```bash
curl --fail https://YOUR_DOMAIN/api/health
```

Then smoke-test sign-up/sign-in, Arcade completion, analytics, settings, and
sign-out. Record the verified production URL here only after those checks pass.

### Hackathon rollback

- Web: promote the previous known-good Vercel deployment.
- Database: migrations are forward-only. Before applying a migration to a
  shared project, create a Supabase backup or use a disposable demo project.
- Data: ingestion is idempotent; deactivate incorrect challenge rows instead
  of deleting player history.

## Security model

- Protected routes validate the Supabase user server-side.
- RLS restricts profiles, settings, sessions, attempts, XP, analytics, and
  streak rows to their owner.
- Runtime inputs use Zod or SQL constraints and bounded arrays/limits.
- Session completion is authenticated, advisory-lock protected, and keyed by a
  unique `(user_id, client_run_id)` value.
- Scam-email content is rendered only as React text. No HTML, scripts, links,
  forms, trackers, or attachments execute.
- Challenge media is bundled locally; optional Storage objects remain private.
- Provider and database errors are converted to safe user-facing messages.
- Security headers disable framing, MIME sniffing, unnecessary browser
  capabilities, and cross-origin opener sharing.

### Accepted MVP limitation

Correct choices are delivered to the browser so feedback is immediate and an
active run can be restored. The server recomputes submitted results, which
prevents forged persisted totals, but a determined player can inspect the
answer payload. This educational MVP is therefore unranked. A ranked version
must keep answers and timing server-authoritative.

## Known limitations

- No multiplayer, public leaderboard, classroom administration, or video
  renderer.
- The starter dataset is intentionally small; cycle-aware batching can reuse
  content after the finite pool is exhausted.
- Authenticated browser tests and cloud migrations require external
  credentials.
- Local time is represented by the browser’s UTC offset at completion. This
  handles local calendar days deliberately but does not preserve a named IANA
  timezone across future daylight-saving changes until the next saved game or
  settings update.
- Sessions completed before the Phase 3 migration are explicitly backfilled as
  UTC because no historical browser offset exists for them.

## Demo flow

1. Create or sign into an account.
2. Show the level, XP bar, streak, and high score on Home.
3. Select all categories and start Arcade.
4. Demonstrate image, inert email, and audio renderers; point out score decay
   and combo tiers.
5. Reach game over and show persisted XP.
6. Open Analytics and show category insights and sample-aware charts.
7. Start Training, inspect an explanation, and exit safely.
8. Update a preference, edit the display name, and sign out.

The complete presenter script is in [DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md).

## Troubleshooting

- **`tsx` or `playwright` not found:** run `npm ci` before project commands.
- **`supabase` not found:** use `npx supabase@latest ...`.
- **Repository not found:** verify the exact owner/repository URL and your
  collaborator access.
- **Login loops:** verify `NEXT_PUBLIC_SITE_URL`, Supabase Site URL, redirect
  allow-list entries, and restart Next.js after changing `.env.local`.
- **Analytics/settings unavailable:** apply the Phase 3 migration with
  `npx supabase@latest db push`.
- **No challenges:** run `npm run data:validate` and `npm run data:seed`.
- **Authenticated E2E skipped:** set `E2E_EMAIL` and `E2E_PASSWORD`.
- **Failed progress save:** reconnect and use the retry button; the run ID makes
  retries safe.

## Documentation

- [Product specification](docs/PRODUCT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Architecture decisions](docs/DECISIONS.md)
- [Data sources](docs/DATA_SOURCES.md)
- [Demo script](docs/DEMO_SCRIPT.md)

## Future roadmap

Server-authoritative ranked play, seasonal leaderboards, multiplayer rooms,
classroom cohorts, larger reviewed datasets, named-timezone streaks, and
additional media renderers can be added without replacing the core session and
attempt model.
