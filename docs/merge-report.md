# Merge report

Two independently working archives were compared. Both passed their original
tests and type checks before merging.

## Source strengths

| Area            | Rich domain archive                               | Production server archive                  | Final choice                                                         |
| --------------- | ------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| Question model  | Renderer-specific content and category option IDs | Uniform AI/REAL metadata                   | Renderer content plus category-specific options                      |
| Mock content    | 15 playable questions and media placeholders      | 4 records without bundled media            | 15 questions and bundled media                                       |
| Rule coverage   | 61 tests and detailed mode behavior               | 20 tests with cleaner external test layout | Expanded external suite with both behavior sets                      |
| Configuration   | Complete mode rules and network slack             | DB-loaded versioned config                 | DB-loaded full snapshot plus slack and validation                    |
| Auth            | Cookie adapter and permissive dev default         | Verified bearer token and UUID dev header  | Bearer auth; dev header explicit and impossible in production        |
| Active sessions | Memory only                                       | Memory plus durable Supabase CAS           | Durable Supabase CAS with validated JSON                             |
| Completion      | Separate non-atomic writes                        | Atomic RPC and idempotency                 | Atomic DB re-derivation from locked active state                     |
| Progression     | Rich profile statistics/streaks                   | Basic XP/level/streak                      | Rich profile fields with atomic update                               |
| Tooling         | Basic scripts                                     | Docker, CI, deployment docs                | Updated Node 24, Docker, CI, CodeQL, Dependabot, protected DB deploy |

## Conflicts resolved

### Private answers

The database outline exposed `is_ai` to authenticated clients, while the PDF
requires server-owned truth. The final program follows the PDF: no browser
question-table access and no answer key in shared responses.

### Submission trust

One draft accepted `is_correct` and response time from the browser. The final
API accepts only session ID, challenge ID, and selected option ID. The server
measures time and derives all game values. PostgreSQL verifies them again.

### Answer vocabulary

Uniform `AI`/`REAL` was easy but did not fit scam email or human voice labels.
The final contract supports `ai/real`, `scam/legit`, and `ai/human` while the
category table records which option corresponds to `is_ai`.

### Live state

Memory sessions are correct only for one long-lived process. The final program
uses memory in mock mode and durable Supabase rows in production, with the same
interface and optimistic version checks.

### Supabase hosting

Supabase is retained for database, Auth, Storage, and durable sessions.
Next.js Route Handlers remain the single authoritative API, so the application
server is hosted on a Node platform rather than duplicated as Deno Edge
Functions.

## Additional improvements

- Unified one-step baseline migration and local Supabase config/seed.
- Completion retry after transient persistence failure or lost HTTP response.
- Runtime validation for environment, config, requests, database questions,
  and persisted sessions.
- Narrow PostCSS and Sharp overrides to patched releases because Next.js
  16.2.11 pins advisory-affected transitive versions; clean install, audit,
  tests, and production build all pass with the overrides.
- Dense-rank leaderboard, accuracy trend, category analytics, high scores,
  longest combo, counters, and streaks.
- Secret patterns and downloaded credential files ignored by Git.
- Windows PowerShell npm troubleshooting in setup documentation.
- K&R-compatible TypeScript style enforced by Prettier and ESLint.

No supplied credential value is present in the repository or output archive.
