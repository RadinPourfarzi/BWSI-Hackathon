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

## ADR-004: Resolve answers locally, persist the completed run atomically

**Status:** Accepted

**Context:** Waiting on a network request before feedback would make the game
feel slow.

**Decision:** Make score resolution deterministic and synchronous on the
client. At completion, submit one serializable run record to
`finalize_game_run`, which recomputes and commits all durable facts in one
transaction.

**Consequences:** Casual play is highly responsive, a failed save can be
retried without double-counting, and partially persisted sessions cannot occur.
Correct answers remain visible in client batches, so ranked play still needs
server-authoritative challenge delivery, timing, and scoring.

## ADR-005: Zustand separates serializable run state from transient I/O

**Status:** Accepted

**Context:** The game needs shared interactive state but not a large client data
framework.

**Decision:** Put a versioned, UI-independent engine state inside one Zustand
store and snapshot it to `sessionStorage`. Keep request IDs, load errors, and
save state as separate transient fields. Leave catalog and profile access in
services.

**Consequences:** Components use focused selectors, refresh restores a paused
run safely, and engine serialization can be tested independently. A future
schema change must version or migrate saved snapshots.

## ADR-006: One PostgreSQL function owns run completion

**Status:** Accepted

**Context:** Attempts, the session, XP history, streaks, category accuracy, and
user stats must never disagree after a retry or network interruption.

**Decision:** Use security-definer `finalize_game_run` with authentication,
per-user/run locking, a unique client run ID, challenge reloads, server score
recomputation, and explicit bounds. Keep the Phase One functions only for
migration compatibility; the Phase Two client does not call them.

**Consequences:** Related writes are atomic and retry-safe, and submitted
correctness or totals are not trusted. Migration functions require careful
review because they cross normal table-level RLS boundaries.

## ADR-013: Life-bounded Arcade and open-ended Training share one engine

**Status:** Accepted

**Context:** Arcade needs pressure and automatic pacing while Training needs
unlimited deliberate practice and explanations.

**Decision:** Use the same queue, timing, answer resolution, attempts, summary,
and persistence record. Arcade initializes three lives and auto-advances after
brief feedback. Training has no lives, waits for the player after explanation,
and ends only on an explicit exit or unavailable pool.

**Consequences:** Mode differences are configuration and transition policy, not
duplicated scoring implementations.

## ADR-014: Bounded replenishing batches with finite-pool cycles

**Status:** Accepted

**Context:** Loading the full catalog is wasteful, but fixed rounds conflict
with an unlimited Training mode and life-bounded Arcade.

**Decision:** Fetch 15 initially and 12 below a queue threshold of five. Exclude
current, queued, and active-cycle IDs. If the selected finite pool is exhausted,
begin another cycle while retaining immediate duplicate guards.

**Consequences:** Startup is bounded, play normally has no loading gap, and
small datasets degrade to controlled reuse rather than a crash.

## ADR-015: Monotonic active timing with paused refresh recovery

**Status:** Accepted

**Context:** Wall-clock changes must not alter answer time, and refresh should
not duplicate or silently lose a live question.

**Decision:** Pass monotonic `performance.now()` values into pure engine
transitions. On pause, convert the active timestamp into accumulated elapsed
time. Persist the snapshot and restore active snapshots as paused.

**Consequences:** Active timing is not affected by system clock changes.
Refresh does not count away time; the player explicitly resumes.

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

## ADR-011: Bounded guest gameplay fallback

**Status:** Accepted

**Context:** Progress and analytics need stable ownership, but the hackathon
demo must remain playable while authentication or database setup is
unavailable.

**Decision:** Allow unauthenticated access only to Arcade and Training. Serve
guest batches from the validated bundled manifest, keep active run recovery in
the existing browser snapshot, and skip every persistence RPC. Keep account
Home, Analytics, Profile, Settings, and password reset protected.

**Consequences:** The core learning loop works without cloud configuration and
never invents a user identity. Guest XP, streaks, high scores, and analytics are
not durable; the UI labels this limitation and offers sign-up after play.

## ADR-012: Reserve extension points, avoid speculative services

**Status:** Accepted

**Context:** Future plans include multiplayer, leaderboards, classrooms, and
additional media, but the current release is a hackathon MVP.

**Decision:** Preserve generic challenge, renderer, session, attempt, category,
and metadata boundaries. Document additive future tables and authoritative
ranked scoring, but do not build unused services.

**Consequences:** The current system stays understandable. Future features have
an evolution path without carrying premature operational complexity today.

## ADR-016: Bounded server-side analytics

**Status:** Accepted

**Context:** The dashboard needs complete metrics and useful trends without
shipping an unbounded attempt history or adding chart cost to gameplay.

**Decision:** Aggregate complete summary values and category facts in an
owner-bound PostgreSQL RPC. Return only the latest 120 completed session
aggregates for trends. Load Recharts only on the Analytics route.

**Consequences:** The dashboard remains fast as histories grow. Very old
session-level points are intentionally omitted from charts while all-time
summary values remain complete.

## ADR-017: Local-day streaks use recorded UTC offsets

**Status:** Accepted

**Context:** A database UTC date does not match a player’s local calendar day,
and duplicate saves must never increment a streak twice.

**Decision:** Submit and validate the browser UTC offset during the idempotent
completion RPC. Record the resolved activity date and offset on the session,
reconcile daily XP, and recompute streak islands in the same transaction.

**Consequences:** Local days are correct at play time with no location
permission or notification service. The offset is not a named timezone, so a
future version should add IANA zones for long-term daylight-saving semantics.

## ADR-018: Durable settings with a local interaction cache

**Status:** Accepted

**Context:** Preferences should follow an account while still applying
immediately during transient network loss.

**Decision:** Store supported settings in an owner-only Supabase row and cache
the validated values in local storage. Keep profile editing limited to a
bounded display name.

**Consequences:** Account behavior is consistent across sessions, local
interaction remains responsive, and no secrets or internal IDs enter the
preferences surface.

## ADR-019: Password recovery shares the safe callback boundary

**Status:** Accepted

**Context:** Email/password login needs a complete recovery path without adding
an open redirect or leaking whether an account exists.

**Decision:** Send recovery links through `/auth/callback`, validate every
destination as same-origin and local, exchange the one-time code into cookies,
and use generic reset-request responses.

**Consequences:** Confirmation and recovery use one reviewed boundary. Invalid
or expired links fail closed and return the player to sign-in.
