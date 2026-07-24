# Architecture decisions

## ADR-001: Next.js App Router with server-first routes

**Status:** Accepted

**Context:** Authentication, protected data access, and a public landing page
must coexist without shipping unnecessary client JavaScript.

**Decision:** Use Next.js App Router. Server components authenticate and compose
pages; only interactive auth forms, charts, and gameplay become client
components.

**Consequences:** Supabase cookies and redirects stay at a clear server boundary.
Interactive modules must explicitly opt into client execution.

## ADR-002: One binary engine with category-specific labels

**Status:** Accepted

**Context:** Images and voice use AI/Real while email uses Scam/Legitimate.
Category branches in scoring would make future media types expensive.

**Decision:** Store and resolve `option_a` / `option_b`; keep display labels in
configuration and challenge records.

**Consequences:** Every category shares scoring, attempts, sessions, and XP.
Validation must ensure labels and payload kinds agree with their category.

## ADR-003: Discriminated payload union and renderer registry

**Status:** Accepted

**Context:** Images, email text, and audio need distinct fields and presentation
but identical game mechanics.

**Decision:** Use a Zod discriminated union for payloads and a typed
category-to-renderer registry.

**Consequences:** Adding media requires a schema case and renderer registration,
not a game-engine rewrite. Database payload JSON stays flexible while runtime
validation recovers strong types.

## ADR-004: Resolve answers locally, persist in the background

**Status:** Accepted

**Context:** Waiting on a network request before feedback would make the game
feel slow.

**Decision:** Make score resolution deterministic and synchronous on the
client. Write the resulting facts through ownership-checking Supabase RPCs
without blocking feedback.

**Consequences:** Casual play is highly responsive and transient write failures
can be explained. Phase-one scores are not cheat-resistant; ranked play later
needs server-authoritative timing and scoring.

## ADR-005: Zustand only for transient round state

**Status:** Accepted

**Context:** The game needs shared interactive state but not a large client data
framework.

**Decision:** Use one small Zustand store for queue, index, status, attempts,
score, combo, and timing. Leave server data in server components and services.

**Consequences:** Components stay focused and hydration is small. In-progress
round recovery is not automatic in phase one.

## ADR-006: PostgreSQL functions own multi-table updates

**Status:** Accepted

**Context:** An attempt affects the attempt ledger and session aggregates; final
completion affects stats, XP history, and streaks.

**Decision:** Use security-definer `record_attempt` and
`complete_game_session` functions with explicit ownership and value checks.

**Consequences:** Related writes are atomic and retry-safe. Migration functions
require careful review because they cross normal table-level RLS boundaries.

## ADR-007: RLS protects all user-owned rows

**Status:** Accepted

**Context:** Browser clients connect directly to Supabase and must not read or
modify another user's data.

**Decision:** Enable RLS on every application table. Authenticated users may
read active catalog rows and their own records; direct attempt/XP writes are
withheld in favor of secure functions.

**Consequences:** A missed service query fails closed. Public leaderboard views
must be deliberately designed rather than exposing session tables.

## ADR-008: Local starter media plus optional Storage ingestion

**Status:** Accepted

**Context:** The hackathon demo should work reliably without hotlinks, but
hosted deployments need a path to managed media.

**Decision:** Commit a small redistribution-safe, content-hashed corpus under
`public/datasets`. Offer idempotent, content-addressed Supabase Storage uploads
and retain object paths in challenge metadata.

**Consequences:** The repository remains self-contained and lightweight.
Switching renderers to signed Storage URLs can happen through a media adapter
without changing the challenge model.

## ADR-009: Manifest is the dataset contract

**Status:** Accepted

**Context:** Source, license, attribution, byte identity, label balance, and
database representation need one reproducible boundary.

**Decision:** Treat `data/dataset-manifest.json` as the canonical ingestion
contract. Generate hashes, validate with Zod, and seed from it.

**Consequences:** Media changes require manifest regeneration. Invalid or
duplicate data stops before cloud writes.

## ADR-010: Email samples are inert curated text

**Status:** Accepted

**Context:** Original mail corpora may contain personal data, tracking, unsafe
links, HTML, or attachments.

**Decision:** Include only reviewed plain-text educational condensations with
identifiers and active content removed. Render with React text nodes, never
HTML injection.

**Consequences:** The corpus demonstrates useful patterns without recreating a
mail client or exposing unsafe content. It is unsuitable for raw-corpus
benchmark claims.

## ADR-011: No production guest mode

**Status:** Accepted

**Context:** Progress, analytics, ownership, and future classroom features need
a stable user identity, and the product requirement explicitly excludes guest
play.

**Decision:** Keep the landing page public and require Supabase authentication
for every application route.

**Consequences:** A live Supabase project is required for end-to-end gameplay.
Unit tests may mock auth utilities; production routes never synthesize a user.

## ADR-012: Reserve extension points, avoid speculative services

**Status:** Accepted

**Context:** Future plans include multiplayer, leaderboards, classrooms, and
additional media, but phase one is a hackathon MVP.

**Decision:** Preserve generic challenge, renderer, session, attempt, category,
and metadata boundaries. Document additive future tables and authoritative
ranked scoring, but do not build unused services.

**Consequences:** The current system stays understandable. Future features have
an evolution path without carrying premature operational complexity today.
