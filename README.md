# AI Detection Game — Server/Game Engine Starter

Runnable Next.js + TypeScript foundation for Radin's complete **Server / Game
Engine** responsibility. It includes a mock repository, authoritative engine,
API routes, shared contracts, validation, and unit tests. The UI and real
Supabase adapter remain integration points for the other team members.

## Start here

```bash
npm install
cp .env.example .env.local
npm run test
npm run dev
```

Open <http://localhost:3000/api/health> and expect:

```json
{ "status": "ok" }
```

## Put it on your branch

From the cloned team repository:

```bash
git switch main
git pull --ff-only origin main
git switch -c radin/feat/server-engine-foundation
```

Copy the contents of this starter into the repository root, then:

```bash
npm install
npm run typecheck
npm run test

git add .
git commit -m "feat(server): add game engine foundation"
git push -u origin radin/feat/server-engine-foundation
```

Since your team has assigned the entire server/engine to this personal branch,
you can continue committing its parts there. Keep commits narrow enough to
review independently:

```text
feat(server): define shared game contracts
feat(engine): implement scoring and combo rules
feat(engine): add authoritative session controller
feat(api): expose start answer and end routes
feat(database): connect Supabase game repository
test(engine): cover timeout and game-over rules
```

Regularly incorporate teammates' merged work:

```bash
git switch main
git pull --ff-only origin main
git switch radin/feat/server-engine-foundation
git merge main
```

## What is implemented

- `POST /api/game/start`
- `POST /api/game/answer`
- `POST /api/game/end`
- `GET /api/analytics`
- `GET /api/leaderboard`
- `GET /api/health`
- Public/private question mapping
- Server-side answer evaluation
- Plateau + exponential score decay
- Combo multipliers and reset
- Arcade lives and game-over condition
- Training-mode exceptions
- Difficulty tiers
- XP and level calculations
- Player streak/progression service
- Random no-repeat question selection
- Session ownership and duplicate/stale challenge validation
- Mock repository and mock challenges
- Supabase row mappers and repository integration template
- Zod request validation
- Vitest unit tests

## Ownership boundaries

```text
src/server/       Radin: authoritative game behavior
src/app/api/      Radin: HTTP boundary into the engine
src/config/       Shared discussion; server owns gameplay defaults
src/shared/       Shared contract; coordinate changes with UI/database teammates
src/database/     Database teammate implements; Radin owns the interface it satisfies
tests/server/     Radin: engine and server tests
```

The UI may import from `src/shared`, but it must never import from `src/server`
or `src/database`.

## Local API example

Development authentication is deliberately explicit. With
`ALLOW_DEV_AUTH_HEADER=true` in `.env.local`:

```bash
curl -X POST http://localhost:3000/api/game/start \
  -H "content-type: application/json" \
  -H "x-user-id: 99999999-9999-4999-8999-999999999999" \
  -d '{"mode":"ARCADE","categories":["image","email","audio"]}'
```

Use the returned `sessionId` and challenge `id`:

```bash
curl -X POST http://localhost:3000/api/game/answer \
  -H "content-type: application/json" \
  -H "x-user-id: 99999999-9999-4999-8999-999999999999" \
  -d '{"sessionId":"RETURNED_SESSION_UUID","challengeId":"RETURNED_CHALLENGE_UUID","selectedAnswer":"AI"}'
```

Never enable the development authentication header in production. Replace
`src/server/auth/auth.service.ts` with server-side Supabase Auth verification.

## Important production replacements

1. Implement `SupabaseGameRepository`.
2. Select it in `src/server/bootstrap/container.ts`.
3. Replace the in-memory active-session store with durable storage.
4. Replace development authentication with Supabase Auth.
5. Apply the security changes in [docs/database-integration.md](docs/database-integration.md).

The in-memory store is intentionally useful for local development and tests. It
is not reliable on Vercel because separate serverless instances do not share
memory.

## Design rule

The database stores private truth, the server interprets truth, and the client
only presents the server's public result. `QuestionRecord.isAi` must therefore
never cross the public API boundary.
