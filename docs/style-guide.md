# K&R and Node.js style

Prettier and ESLint are authoritative. The project applies K&R's practical
ideas to TypeScript rather than imitating C syntax mechanically.

## Braces and control flow

Opening braces stay on the statement line:

```typescript
if (session.status !== 'active') {
  throw new GameError('The session ended.', 'SESSION_ENDED', 409);
}
```

Use braces for multi-line control flow, keep nesting shallow with early
returns, and put one responsibility in each function.

## Node.js conventions

- Use ESM `import`/`export`.
- Use `node:` prefixes for built-ins.
- Prefer `async`/`await` over promise chains.
- Inject clocks, IDs, random sources, and I/O boundaries for tests.
- Throw typed domain errors; translate them once at the HTTP boundary.
- Keep route handlers thin and keep game rules independent of Next.js.
- Use `camelCase` in TypeScript and isolate database `snake_case` in mappers.
- Treat all request, environment, database JSON, and persisted-session JSON as
  untrusted until runtime validation.
- Never use non-null assertions merely to silence a design problem.

## Formatting

The repository uses:

- single quotes;
- semicolons;
- trailing commas;
- 88-character preferred width;
- two-space indentation.

Run:

```bash
npm run format
npm run format:check
```

Do not hand-format around Prettier. Consistency is more valuable than personal
whitespace preferences.

## Comments

Explain invariants and decisions, not obvious syntax. Security boundaries,
idempotency, time ownership, and unusual rule semantics deserve comments.
Avoid comments that merely repeat a function name.
