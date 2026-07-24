# Server architecture

## Responsibility boundary

The design follows one rule:

> Database stores truth. Server interprets truth. Client presents truth.

The database stores private answers, content, profiles, completed runs, and
durable active state. The server decides what happens after each player action.
The UI renders only the public result.

## Request flow

1. A route verifies the Supabase access token or the explicitly enabled mock
   development header.
2. Zod validates untrusted request bytes.
3. `GameSessionService` verifies ownership, active status, current question,
   and selected option.
4. The server measures elapsed time from `challengeStartedAtMs`.
5. `GameRuleEngine` evaluates the private answer and applies configured rules.
6. The session store performs a version-checked update.
7. On game over, the repository atomically persists the run and progression.
8. A public mapper guarantees the private answer never enters the response.

## Public/private split

`QuestionRecord` contains `correctOptionId` and `explanation`. It exists only in
server state and service-role database reads. `PublicQuestion` contains content,
display difficulty, and answer buttons, but no answer or explanation.

There is one conversion function:
`src/shared/utilities/question-public.mapper.ts`. Keeping a single exit point
makes accidental answer leakage easy to audit and test.

## Active state and concurrency

The authoritative state includes:

- owner, status, mode, and enabled categories;
- immutable configuration snapshot and version;
- score, lives, combo, counters, and current question;
- server start timestamps and already-shown IDs;
- derived attempt records;
- optimistic concurrency version.

Mock mode stores cloned state in memory. Supabase mode stores the same validated
JSON in `active_game_sessions`. Updates use `WHERE version = expectedVersion`,
so two simultaneous answers cannot both commit.

## Configuration consistency

Production loads the active `game_config` plus category configuration at game
start. That complete snapshot is stored inside the active session. A database
balance change therefore affects new games only; it cannot change timers or
scoring midway through an existing game.

`DEFAULT_GAME_CONFIG` is the mock-mode fallback and must match migration version

1. Runtime Zod validation checks tiers, answer-option references, category
   renderer types, and numeric ranges.

## Crash-safe completion

Ending a game is a two-stage, retryable operation:

1. Save an ended active state with a completion summary using compare-and-swap.
2. Persist it through the idempotent database completion operation.

In Supabase, `persist_completed_game(session_id)` locks the active row, derives
attempt correctness and scoring again from private database answers, updates
the profile, writes the completed records, and deletes active state in one
transaction.

If persistence temporarily fails, the ended active row remains. Fetching the
session retries completion. If the response is lost after the transaction
commits, the reconnect endpoint recovers the already-completed record.

## Rule semantics

- Arcade: score, combo, timer, three lives, game over at zero, XP enabled.
- Training: no score/combo/timer/lives/XP, detailed explanation enabled.
- Multiplier uses combo before the answer, then combo changes.
- Effective full-score plateau is tier plateau plus category grace.
- Timer slack protects against network arrival jitter but never changes decay.
- Pool exhaustion counts as a completed run; manual exit is abandoned.
- Training attempts persist for analytics but award no XP.

## Dependency direction

Routes depend on services. Services depend on repository/session interfaces.
Concrete mock and Supabase implementations are selected only in the container.
Pure engine modules depend on types and configuration, never Next.js, React, or
Supabase. This keeps game behavior fast to test and inexpensive to migrate.
