# Testing

## Commands

```bash
npm test
npm run test:watch
npm run test:coverage
npm run typecheck
npm run lint
npm run format:check
npm run build
```

`npm run check` combines formatting, linting, type checking, and Vitest.

## Covered behavior

The deterministic Node-only suite requires no browser, Supabase account, or
network. It covers:

- private answer evaluation and public mapping;
- scoring plateau, exponential decay, hard timeout, and network slack;
- combo indexing, clamping, increment, and reset;
- every difficulty boundary;
- lives, game-over, XP, levels, and abandoned-run behavior;
- Arcade and Training rule differences;
- server-measured time and reconnect without timer reset;
- ownership, invalid options, stale/duplicate answers, and pool exhaustion;
- durable completion recovery after a simulated persistence failure;
- mock analytics and progression through integration tests.

## Test design

Clock, IDs, randomness, repository, and session store are injected. Tests can
simulate a complete run without sleeping or making network calls. Favor
behavior assertions over private-method assertions.

When fixing a bug:

1. Add a failing regression test.
2. Apply the smallest behavior fix.
3. Run the focused test, then `npm run check`.

## Database tests

TypeScript tests do not execute PostgreSQL. With Docker running, use:

```bash
npx supabase start
npm run db:reset
npm run db:lint
```

Before production, add pgTAP tests for RLS denial and the completion RPC if the
team's CI runner supports Docker. Never test by mutating the shared production
project.
