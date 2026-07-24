# Server integration order

Use the same branch, `radin/feat/server-engine-foundation`, with small commits in
this order.

The server code is implemented. Use these phases to review and integrate it.

## Phase 1 — Contracts and pure rules (implemented)

- Review `src/shared` with the UI and database developers.
- Finalize combo, timeout, completion-bonus, and Training rules.
- Extend unit tests before changing formulas.

Exit condition: `npm run typecheck` and `npm test` pass without Next.js or a
database running.

## Phase 2 — Complete session loop (implemented)

- Test starting sessions.
- Test ownership checks.
- Test stale and duplicate answers.
- Test no-repeat question selection.
- Test automatic game-over.
- Decide how a depleted question pool ends a run.

Exit condition: a complete game works against `MockGameRepository`.

## Phase 3 — UI integration (team action)

- Give the UI developer the request/response types from `src/shared/contracts`.
- Keep API routes thin.
- Do not expose `QuestionRecord` or any repository type to the UI.
- Add end-to-end request tests once the basic gameplay screen exists.

## Phase 4 — Supabase (code implemented; project setup required)

- Have the database teammate review and apply the included migration.
- Replace the handwritten minimal database row types with generated types if
  desired.
- Add the real Supabase project environment settings.
- Verify the client cannot read answer keys or write authoritative values.

## Phase 5 — Analytics and polish (implemented, with optional extensions)

- Leaderboard and category analytics are implemented.
- Idempotency and optimistic session versions are implemented.
- Optional after the hackathon: structured log aggregation and a distributed
  rate limiter.
