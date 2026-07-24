# Server build order

Use the same branch, `radin/feat/server-engine-foundation`, with small commits in
this order.

## Phase 1 — Contracts and pure rules

- Review `src/shared` with the UI and database developers.
- Finalize combo, timeout, completion-bonus, and Training rules.
- Extend unit tests before changing formulas.

Exit condition: `npm run typecheck` and `npm test` pass without Next.js or a
database running.

## Phase 2 — Complete session loop

- Test starting sessions.
- Test ownership checks.
- Test stale and duplicate answers.
- Test no-repeat question selection.
- Test automatic game-over.
- Decide how a depleted question pool ends a run.

Exit condition: a complete game works against `MockGameRepository`.

## Phase 3 — UI integration

- Give the UI developer the request/response types from `src/shared/contracts`.
- Keep API routes thin.
- Do not expose `QuestionRecord` or any repository type to the UI.
- Add end-to-end request tests once the basic gameplay screen exists.

## Phase 4 — Supabase

- Generate database types with the Supabase CLI.
- Implement `SupabaseGameRepository`.
- Add real authentication.
- Add a durable `ActiveSessionStore`.
- Apply restrictive RLS policies.
- Verify the client cannot read answer keys or write authoritative values.

## Phase 5 — Analytics and polish

- Implement leaderboard queries.
- Implement player/category accuracy.
- Add structured server logging.
- Add rate limits.
- Add idempotency/version checks for answer submission.
