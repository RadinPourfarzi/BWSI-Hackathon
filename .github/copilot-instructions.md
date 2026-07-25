# Copilot Instructions — AI Detection Game (BWSI Hackathon)

> Full product & technical specification lives in `docs/project-plan.md`. Read it before
> making non-trivial changes. This file is the condensed, directive-focused summary.
>
> Reference docs:
> - `docs/database-schema.md` — canonical Supabase Postgres schema (DDL, RLS, triggers,
>   `submit_run` RPC, analytics queries, seed data).
> - `docs/data-formats.md` — TS domain types, per-category `metadata` shapes, storage
>   layout, seed CSV/JSON templates, client↔server payloads, and `/config` file templates.
>
> **Status:** Scaffolded (Phase 0 complete). Next.js 16 App Router app initialized with
> the toolchain below. Implementation follows the phased plan; the game engine, categories,
> and Supabase wiring are built in subsequent phases.

## What we're building

"The GeoGuessr of AI detection" — a fast, arcade-style web game that trains players to
instinctively spot AI-generated images, scam/phishing emails, and synthetic voice audio.
Players click **AI** or **REAL** under time pressure. Education is the outcome; **arcade
engagement is the primary design goal**. Target build window is a 6–8 hour hackathon MVP.

## Non-negotiable directives

- **Configuration-driven, no magic numbers.** Gameplay balance (timers, plateau/grace
  periods, decay, difficulty tiers, base points, combo multipliers, XP rates, level curves)
  is **server-authoritative and DB-configurable** via the `game_config` table, reaching the
  client through the `get_active_config()` RPC. The `/config/*.ts` files are the TS shape
  contract + default seed values; client-only constants (animations, colors, media box)
  live in `/config/ui.ts`. Never hardcode gameplay values in components or engine code.
- **0ms latency gameplay.** The client fetches config + a question batch (incl. the answer
  key) at run start, then runs timers/decay and validates answers **locally** against
  in-memory state — no server round-trip during a question.
- **Server-authoritative progression.** Score, XP, level, and streak are recomputed and
  persisted by the `submit_run()` RPC from raw per-attempt facts (response time, question
  index, correctness, combo). The client never sends trusted score/XP values. Client-side
  *correctness* validation is the accepted MVP trade-off, isolated to the fetch/submit RPCs
  so anti-cheat can be tightened later without touching gameplay code.
- **Decouple engine from UI.** Game business logic (timers, scoring, life deduction, combo)
  lives in custom hooks (`useGameEngine`, `useScoringTimer`), never inside render components.
- **Strict TypeScript.** Strict mode on. No implicit `any`. Strongly typed interfaces for
  all game states, DB models, and config files.
- **Category extensibility.** All content is a generic **"Challenge"** abstracted by
  category so new categories are added without touching core gameplay code. Render logic is
  isolated per category and wired through a `CategoryRegistry`.
- **No overengineering.** Keep client-server interaction minimal for the MVP while keeping
  clean separation of concerns.

## Tech stack

- **Framework:** Next.js **16** (App Router) — ⚠️ Next 16 / React 19 / Tailwind **v4**
  have breaking changes vs. older versions. Read `node_modules/next/dist/docs/` before
  writing Next-specific code (per `AGENTS.md`). Do not assume pre-16 APIs/conventions.
- **Language:** TypeScript, strict mode. No implicit `any`.
- **React:** 19. **Styling / animation:** Tailwind CSS v4 + Framer Motion.
- **State:** Zustand for game-engine state.
- **Backend / Auth / DB / Storage:** Supabase (Auth, Postgres, Storage public bucket for
  media). Auth is email/password only — **no guest mode** for MVP (all progress must persist
  from session one).
- **Charts (analytics):** Recharts.
- **Testing:** Vitest **3** + React Testing Library + jsdom. (Note: Vitest 4 pulls in
  `rolldown` whose native binding fails to install on Windows via npm; `@vitejs/plugin-react`
  is pinned to v4 and `jsdom` to v25 for ESM/CJS compatibility with Vitest 3.)

## Project structure

Source lives under `src/` with the `@/*` import alias → `src/*`.

```
src/
  app/          # Next.js App Router routes
  categories/   # ImageCategory.tsx, EmailCategory.tsx, AudioCategory.tsx, CategoryRegistry.ts
  components/    # Small single-purpose UI (TimerBar, MediaContainer, ComboBadge, ...)
  config/        # game.ts, scoring.ts, difficulty.ts, xp.ts, categories.ts, ui.ts
  hooks/         # useGameEngine, useScoringTimer
  lib/           # scoring/difficulty pure fns, supabaseClient, mappers, dummy data
  store/         # Zustand game store
  types/         # models.ts (domain + DB types)
```

Config file responsibilities:
`game.ts` (lives, batch size, prefetch threshold) · `scoring.ts` (decay β, combo
multipliers) · `difficulty.ts` (escalation tiers) · `xp.ts` (XP/level curve) ·
`categories.ts` (grace periods) · `ui.ts` (animation/visual, client-only).

## Core mechanics (implement from config; values here are examples)

- **Game modes:** *Arcade* (3 lives, score decay, combo, ends at 0 lives, persists stats)
  and *Training* (unlimited lives, no decay/penalties, shows correctness + explanation
  placeholder). Both share the same question-sampling engine.
- **Scoring — Plateau + Exponential Ease-In Decay.** Obtainable points:
  `S(t) = M` for `t ≤ t_p`, else `max(0, round(M − α·(t − t_p)^β))`.
  `M`=max points, `t_p`=plateau grace (per category/difficulty), `α`=decay severity,
  `β`=exponential factor.
- **Combo:** consecutive correct answers raise the multiplier; awarded points =
  `S(t) × combo`. A wrong answer resets combo to `1×`.
- **Difficulty progression:** MVP does NOT filter question content difficulty. Difficulty
  ramps purely via evolving *game constraints* (max points, timer, plateau, decay) keyed on
  question-count thresholds in `/config/difficulty.ts`. Questions still carry a
  `difficulty_rating` column for future content-based filtering.
- **Category grace periods:** consumption-heavy media (audio) pauses timer/decay for a
  category-defined window (e.g., audio 5s) before decay begins.
- **XP:** `Total XP = (Correct × BaseXP) + (MaxCombo × ComboBonus) + RunCompletionBonus`.
  Level curve: `XP for level N = 100 × N^1.5`.
- **Daily streak:** one completed Arcade/Training game per calendar day increments the
  streak; a missed day resets it to 0.

## Content delivery (speed vs. anti-cheat trade-off)

1. On run start, call `get_active_config()` for the authoritative gameplay ruleset, then
   fetch a randomized batch of ~15 questions from Supabase.
2. Client store holds config, media URLs, metadata, **and the true answer key** in memory.
3. Validation, timers, and score decay run instantly against local state / config.
4. When unused questions in the store drop below 5, background-fetch another batch of 15.
5. On Game Over, submit only raw per-attempt facts via `submit_run()`; the server
   recomputes score/XP/level/streak and writes everything atomically.

## Database schema (Supabase Postgres)

Tables: `profiles`, `categories`, `questions` (`is_ai BOOLEAN`, `difficulty_rating`,
`explanation_text`, JSONB `metadata`), `game_sessions` (`mode` = `ARCADE`|`TRAINING`),
`question_attempts` (granular per-question analytics, `question_index`), `game_config`
(versioned, DB-configurable balance). Full runnable DDL with RLS, triggers, and the
`get_active_config` / `score_attempt` / `submit_run` RPCs is in `docs/database-schema.md`.

## UI/UX guardrails

- Dark/light modern arcade aesthetic, high contrast, minimal clutter.
- **Avoid:** glassmorphism overuse, muddy gradients everywhere, generic "AI startup"
  graphics, slow heavy transitions.
- Snappy micro-interactions; emerald flash on correct, vibrant red on incorrect.
- Gameplay media sits in a **fixed-dimension bounding box** (e.g., height 420px, width
  100%) with CSS `object-fit: contain` so switching media types never shifts the AI/REAL
  buttons under the cursor.
- Keyboard shortcuts: `Left Arrow` / `A` = AI, `Right Arrow` / `D` = REAL.
- Desktop-first responsive; tablet/mobile touch is secondary for the MVP.

## Build / test / lint

All verified working (npm, Node 20):

- Install: `npm install`
- Dev server: `npm run dev`
- Production build: `npm run build`
- Typecheck: `npm run typecheck` (`tsc --noEmit`)
- Lint: `npm run lint` (`eslint`)
- Format: `npm run format` / `npm run format:check` (Prettier)
- All tests: `npm run test` (`vitest run`); watch: `npm run test:watch`
- **Single test file:** `npm run test -- src/lib/scoring.test.ts`
- **Single test by name:** `npm run test -- -t "plateau"`

## Repo notes

- Default branch: `main`. Active development branch: `advait/init`.
