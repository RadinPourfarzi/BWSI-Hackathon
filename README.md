# AI Detection Game — Server / Game Engine

Finished Next.js + TypeScript implementation of the authoritative server described
in `AI Detection Game Architecture.pdf`.

The project runs in two modes:

- **Mock mode:** no cloud account or database is required. Use this while learning,
  testing, and integrating the UI.
- **Supabase mode:** verifies real Supabase users, keeps private answers on the
  server, stores active sessions durably, and atomically persists games,
  attempts, XP, levels, streaks, analytics, and leaderboard data.

## First run

```bash
npm ci
```

Copy `.env.example` to `.env.local`, leave `APP_DATA_PROVIDER=mock`, then:

```bash
npm run dev
```

Visit <http://localhost:3000/api/health>. A ready server returns:

```json
{ "status": "ready" }
```

## Validation

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## Documentation

- [Setup and dependencies](docs/setup-and-dependencies.md)
- [Server architecture and design decisions](docs/server-architecture.md)
- [Architecture requirements map](docs/architecture-requirements-map.md)
- [API reference](docs/api-reference.md)
- [Supabase/database integration](docs/database-integration.md)
- [Git workflow for the team](docs/git-workflow.md)
- [Azure deployment](docs/azure-deployment.md)
- [Recommended build order](docs/server-build-order.md)

## Implemented responsibilities

- Authentication and session ownership
- Game-session controller
- Public/private challenge separation
- Random no-repeat question selection
- Server-side answer evaluation
- Server-measured response time
- Score plateau and exponential decay
- Combo multipliers and reset
- Arcade lives and game-over
- Training-mode exceptions and explanations
- Difficulty tiers
- XP, levels, daily streaks, and high-score persistence
- Analytics and leaderboard services
- Runtime request/config/database validation
- Duplicate/stale-answer protection
- Optimistic concurrency for simultaneous submissions
- Mock and Supabase repositories
- Durable Supabase active-session store
- Thin Next.js API routes
- Docker/Azure packaging
- GitHub Actions validation

## Core security rule

`QuestionRecord.isAi` is private. Only `PublicQuestion` crosses the HTTP
boundary. The browser submits an action (`"AI"` or `"REAL"`); it never submits
correctness, points, score, lives, combo, or XP.
