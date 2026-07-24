# Product specification

## Product statement

Bot or Not is the “GeoGuessr of AI detection”: an educational,
account-based web game that builds practical instincts for recognizing
AI-generated images, scam emails, and AI-generated voice audio. A player sees
one challenge, makes a fast two-choice classification, receives immediate
feedback, and learns which signals supported the answer.

Phase three is the complete hackathon MVP. It favors a small, strongly typed
system over enterprise complexity while adding real analytics, long-term
progression, local-day streaks, profile editing, durable settings, recovery
flows, CI, and deployment readiness. Clean extension points remain for video,
websites, social posts, text messages, multiplayer, leaderboards, classrooms,
and new challenge types.

## Goals

- Make gameplay feel immediate, legible, and game-like rather than
  administrative.
- Teach a repeatable observation process through short explanations and signal
  tags.
- Use real, openly accessible source data with documented provenance.
- Keep UI, game logic, source data, and persistence clearly separated.
- Make important scoring, difficulty, XP, animation, UI, category, and batch
  values configurable.
- Require a real account in production so progress and analytics have a stable
  owner.
- Preserve enough attempt-level data for future learning analytics,
  leaderboards, and multiplayer without redesigning the core tables.

## Non-goals for the current release

- Claiming that a single clue proves media is synthetic or malicious
- A general-purpose AI or phishing detector
- Public guest play
- Public rankings, live multiplayer, classroom administration, or moderation
  tooling
- Video, website, social-post, or text-message renderers
- A large production-scale dataset or paid data provider
- Executing or rendering original email HTML, scripts, links, or attachments

## Audiences

- Learners who want quick practice identifying manipulated or deceptive media
- Educators demonstrating media-literacy signals
- Hackathon reviewers evaluating a coherent end-to-end prototype
- Future contributors adding content types, mechanics, or social play

## Core game loop

1. The authenticated player chooses Arcade or Training.
2. The player keeps the mixed default or toggles one to three categories.
3. The server returns a bounded authenticated batch from those categories.
4. The client renders a challenge through its registered category renderer.
5. The player chooses one of two configured labels.
6. The client resolves correctness, response time, obtainable points, awarded
   points, and combo immediately.
7. Arcade shows brief feedback and advances; Training shows the explanation and
   waits for the player.
8. The queue replenishes before it runs out and excludes active-cycle IDs.
9. At completion, one idempotent server transaction validates and saves
   attempts, XP, statistics, streaks, and session aggregates.

## Classification labels

Every category uses the same internal `option_a` / `option_b` binary engine.
Category-specific wording resolves the product prompt's label ambiguity without
introducing category-specific scoring logic:

| Category        | Option A | Option B   | Content type     |
| --------------- | -------- | ---------- | ---------------- |
| Images          | AI       | Real       | Image            |
| Email defense   | Scam     | Legitimate | Plain-text email |
| Voice detection | AI       | Real       | Audio            |

Labels are stored with each challenge and configured per category. The engine
only compares option identifiers.

## Modes

### Arcade

- A mixed-category, score-oriented run with three lives
- Ends when all three lives are depleted
- Category-specific plateaus and power decay affect obtainable points
- Correct streaks unlock exact 2×, 3×, and 4× combo tiers
- Difficulty increases by question count with shorter timers and larger maxima
- Feedback is brief and the next challenge advances automatically
- Game over includes score, high-score indication, accuracy, response timing,
  longest combo, category breakdown, and XP

### Training

- Unlimited practice with no lives or score pressure
- Uses the same engine, timing, challenge records, and attempt schema
- Supports any one-to-three-category selection, with mixed mode as the default
- Shows correctness, the explanation, and observable signal tags immediately
- Ends on player exit and persists a learning summary

## Functional requirements

### Challenge content

Each active challenge records:

- ID, category, content type, and media/text payload
- Correct binary option and player-facing labels
- Difficulty tier and observable signal metadata
- Explanation
- Source dataset, original source URL, license, attribution, and SHA-256 hash
- Active state and extensible JSON metadata

The starter corpus must contain at least 12 balanced records per category. The
committed corpus contains 14 images, 12 emails, and 12 voice clips.

### Authentication

- Supabase email/password sign-up and sign-in
- Sign-out
- Server-enforced protected application routes
- Cookie-based session restoration
- Intended-destination preservation with safe local redirects
- Useful validation, loading, configuration, and provider-error messages
- No production guest mode

### Application shell

- Public game-forward home page
- Authentication pages
- Protected navigation for Arcade, Training, Analytics, Profile, and Settings
- Level, XP progress, and daily streak values populated from Supabase statistics
- Reusable button, card, progress, dialog, loading, error, and empty states
- Responsive black/blue/white visual system with a restrained pink accent,
  subtle transitions, and minimal gradients

### Analytics and progression

- Real aggregates from persisted completed sessions and attempts
- Overall, mode, category, score, speed, XP, level, combo, and streak metrics
- Six responsive historical charts bounded to the latest 120 sessions
- Explicit dates, sample sizes, accessible text equivalents, and honest
  small-sample states
- Configuration-driven, indefinitely increasing levels
- Auditable XP history and idempotent session rewards
- Local-calendar daily activity based on the browser UTC offset recorded at
  completion

### Profile and settings

- Display name, email, join date, progression, strongest category, recent
  activity, and secure sign-out
- Safe display-name updates only; no internal identifiers are exposed
- Account-backed category defaults, sound effects, volume, motion, keyboard
  hints, and abandon confirmation
- Local preference cache for responsive interaction and offline recovery

### Persistence and analytics

- Store complete sessions and per-question attempts in one atomic transaction
- Capture response time, correctness, points available at answer time, points
  awarded, timeout, combo/multiplier, timing curve, and sequence
- Treat client run IDs as idempotency keys so retries cannot double-count
- Recompute answers, scoring, combos, and lives from server-owned challenge
  records and configured bounds before accepting a run
- Maintain total XP, level, streaks, total/correct answers, and category
  aggregates
- Support future leaderboard queries without exposing another user's private
  attempt history
- Reserve multiplayer identifiers/metadata without coupling the current game
  engine to multiplayer

### Data ingestion

- Document sources, licenses, attribution, and access dates
- Prefer stable, pinned, direct sources and avoid paid APIs or large archives
- Provide a machine-readable manifest and reproducible preparation script
- Validate runtime schema, IDs, hashes, local media, balance, and deduplication
- Support dry-run validation, database upserts, and optional Storage upload
- Commit only lightweight, redistribution-safe starter assets
- Sanitize email text; remove identifying addresses, markup, executable content,
  active tracking, links, and attachments
- Never hotlink gameplay media

## Quality requirements

- Next.js App Router, React, strict TypeScript, and Tailwind CSS
- Supabase Auth, PostgreSQL, and Storage
- Zustand for transient client state
- Zod validation at application/data boundaries
- Recharts analytics foundation
- Vitest unit tests and Playwright end-to-end foundation
- ESLint and Prettier
- Production build free of known TypeScript or lint errors
- Idempotent migrations, RLS, constraints, indexes, and typed database access

## Acceptance criteria

- A configured user can sign in, choose categories, play life-bounded Arcade or
  unlimited Training, get mode-appropriate feedback, and persist progress.
- Arcade ends after three misses; Training can exit after any number of
  attempts; both produce accurate summaries.
- The scoring engine preserves each category plateau, decays monotonically to
  zero, applies 1×–4× combo thresholds, and increases difficulty by question
  count.
- Batches begin between 10 and 20 rows, replenish below five queued rows, ignore
  stale responses, and avoid duplicates while enough unseen content exists.
- A refresh restores an active run paused, and duplicate answer/save requests
  do not create duplicate attempts or aggregate rewards.
- The same answer engine handles image, email, and audio challenges.
- Starter data validates with at least 12 balanced challenges in every category
  and no duplicate IDs or hashes.
- A developer without cloud credentials can install, validate data, run unit
  tests, and build the public application; protected routes explain the missing
  configuration.
- A developer with Supabase credentials can apply the schema and seed the
  manifest without hand-editing challenge rows.
- Required formatting, lint, typecheck, unit/integration-test, production-build,
  and supported Playwright commands pass before the branch is published.
- Analytics, Profile, and Settings render persisted user data and useful empty
  or unavailable states.
- Password recovery completes through a safe local callback, and protected
  routes reject expired or missing sessions.
- CI enforces locked dependencies, formatting, lint, types, tests, dataset
  validation, the production build, and Playwright.

## Safety and educational framing

The game teaches probabilistic signals, not certainty. Explanations should
encourage checking context, sender identity, source provenance, and multiple
clues. Email samples are inert plain text and must never become clickable or
render as HTML. Dataset expansion requires license review, privacy review,
hash-based deduplication, and balanced-label validation before activation.
