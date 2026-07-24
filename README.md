# AI Detection Game - Server / Game Engine

Authoritative Next.js and TypeScript game server based on
`AI Detection Game Architecture.pdf`.

The server chooses questions, measures response time, evaluates answers, applies
score/combo/lives/difficulty/XP rules, owns active sessions, and persists
completed runs. The browser sends player actions only. It never sends
correctness, response time, score, lives, combo, or XP.

## Quick start

Requirements: Node.js 24 LTS and Git.

```bash
npm ci
```

Copy `.env.example` to `.env.local` and keep mock mode enabled:

```dotenv
APP_DATA_PROVIDER=mock
ALLOW_DEV_AUTH_HEADER=true
```

Then run:

```bash
npm run dev
```

Check <http://localhost:3000/api/health>. Mock mode needs no Supabase account,
Docker, or real credentials.

If PowerShell blocks `npm.ps1`, use `npm.cmd ci` immediately and follow the
permanent, current-user-only fix in
[Setup and dependencies](docs/setup-and-dependencies.md#powershell-blocks-npmps1).

## Quality gate

```bash
npm run check
npm run build
```

The suite covers pure rule math, public/private question separation, complete
Arcade and Training loops, ownership, stale answers, server timing, optimistic
concurrency, pool exhaustion, idempotent completion, and persistence recovery.

## Production topology

Supabase hosts PostgreSQL, Auth, Storage, and durable active sessions. The
Next.js Route Handlers are the authoritative API and must be hosted on a
Node-compatible platform such as Vercel or Azure App Service.

Do not duplicate the game API as Supabase Edge Functions unless the team
deliberately migrates the whole server layer. Two authoritative engines would
drift.

## Main API

| Method | Path                        | Purpose                                                      |
| ------ | --------------------------- | ------------------------------------------------------------ |
| `POST` | `/api/game/start`           | Start a run and receive the first public question            |
| `POST` | `/api/game/answer`          | Submit one option ID and receive authoritative results       |
| `GET`  | `/api/game/session/:id`     | Reconnect without resetting the timer; recover final results |
| `POST` | `/api/game/next`            | Compatibility alias for reconnect                            |
| `POST` | `/api/game/end`             | Abandon an active run idempotently                           |
| `GET`  | `/api/profile`              | Read permanent progression                                   |
| `GET`  | `/api/analytics`            | Read completed-attempt analytics                             |
| `GET`  | `/api/leaderboard?limit=20` | Read ranked high scores                                      |
| `GET`  | `/api/health`               | Readiness check                                              |

Protected routes accept `Authorization: Bearer <Supabase access token>`.
Development-only mock requests may use `x-user-id: <uuid>` when explicitly
enabled.

## Project map

```text
src/app/api/              thin HTTP Route Handlers
src/server/game/          pure rules and session orchestration
src/server/sessions/      active-state interface and memory implementation
src/server/repositories/  persistence contract
src/database/mock/        local questions and in-memory persistence
src/database/supabase/    auth/admin clients, mappers, repository, durable store
src/shared/               public contracts, schemas, and public mapper
src/config/               validated environment and fallback game balance
supabase/                 local config, migration, and seed content
tests/                    behavior-focused Vitest suite
```

## Documentation

- [Setup and dependencies](docs/setup-and-dependencies.md)
- [Server architecture](docs/server-architecture.md)
- [API reference](docs/api-reference.md)
- [Supabase deployment](docs/supabase-deployment.md)
- [Database integration](docs/database-integration.md)
- [Testing](docs/testing.md)
- [K&R / Node.js style guide](docs/style-guide.md)
- [Git workflow](docs/git-workflow.md)
- [Merge report and decisions](docs/merge-report.md)
- [Azure application deployment](docs/azure-deployment.md)

## Secret rule

Commit `.env.example`; never commit `.env.local`, `env.download`, a Supabase
service-role key, a database password, or an access token. The supplied
credential file is intentionally not included in this project.
