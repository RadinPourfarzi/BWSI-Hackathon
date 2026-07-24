# Product specification

## Product statement

Signal or Synthetic is the “GeoGuessr of AI detection”: an educational,
account-based web game that builds practical instincts for recognizing
AI-generated images, scam emails, and AI-generated voice audio. A player sees
one challenge, makes a fast two-choice classification, receives immediate
feedback, and learns which signals supported the answer.

This first phase is a complete hackathon foundation. It favors a small,
playable, strongly typed system over enterprise complexity while preserving
clean extension points for video, websites, social posts, text messages,
multiplayer, leaderboards, classrooms, and new challenge types.

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

## Non-goals for phase one

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
2. The server selects active challenges from the enabled categories.
3. The client renders a challenge through its registered category renderer.
4. The player chooses one of two configured labels.
5. The client resolves correctness, response time, obtainable points, awarded
   points, and combo immediately.
6. The UI locks the answer, shows the correct classification, awards points,
   and explains useful signals.
7. Persistence runs in the background and does not block the next visual state.
8. At round completion, the server finalizes XP, statistics, streaks, and
   session aggregates.

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

- A mixed-category, score-oriented round
- 12 questions by default
- Time decay, difficulty multipliers, and combo multipliers affect score
- Completion contributes to XP, statistics, and daily streaks

### Training

- A learning-oriented session type supported by the engine and schema
- 10 questions by default
- Uses the same challenge records and answer-resolution path
- The player can choose a category for a focused phase-one round

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
phase-one corpus contains 14 images, 12 emails, and 12 voice clips.

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

### Persistence and analytics

- Store complete sessions and per-question attempts
- Capture response time, correctness, points available at answer time, points
  awarded, and combo before/after
- Maintain total XP, level, streaks, total/correct answers, and category
  aggregates
- Support future leaderboard queries without exposing another user's private
  attempt history
- Reserve multiplayer identifiers/metadata without coupling the phase-one game
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

- A configured user can sign up, sign in, reach a protected mixed round, answer
  all questions, get immediate feedback, and have progress persisted.
- The same answer engine handles image, email, and audio challenges.
- Starter data validates with at least 12 balanced challenges in every category
  and no duplicate IDs or hashes.
- A developer without cloud credentials can install, validate data, run unit
  tests, and build the public application; protected routes explain the missing
  configuration.
- A developer with Supabase credentials can apply the schema and seed the
  manifest without hand-editing challenge rows.
- Required formatting, lint, typecheck, unit-test, and production-build commands
  pass before the phase-one branch is published.

## Safety and educational framing

The game teaches probabilistic signals, not certainty. Explanations should
encourage checking context, sender identity, source provenance, and multiple
clues. Email samples are inert plain text and must never become clickable or
render as HTML. Dataset expansion requires license review, privacy review,
hash-based deduplication, and balanced-label validation before activation.
