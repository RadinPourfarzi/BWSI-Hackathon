# Copilot Instructions — AI Detection Game (BWSI Hackathon)

> Full product & technical specification lives in `docs/project-plan.md`. Read it before
> making non-trivial changes. This file is the condensed, directive-focused summary.
>
> Reference docs:
>
> - `docs/database-schema.md` — canonical Supabase Postgres schema (DDL, RLS, triggers,
>   `submit_run` RPC, analytics queries, seed data).
> - `docs/data-formats.md` — TS domain types, per-category `metadata` shapes, storage
>   layout, seed CSV/JSON templates, client↔server payloads, and `/config` file templates.
>
> **Status:** Early stage. As of writing, the repo contains only `README.md` and the
> spec — no application code yet. Follow the architecture below when scaffolding so the
> first implementation matches the plan.

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
  _correctness_ validation is the accepted MVP trade-off, isolated to the fetch/submit RPCs
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

- **Frontend:** React (Next.js App Router, or Vite + React).
- **Language:** TypeScript (strict mode).
- **Styling / animation:** Tailwind CSS + Framer Motion.
- **State:** React Context + Zustand (or a lightweight custom store) for game engine state.
- **Backend / Auth / DB / Storage:** Supabase (Auth, Postgres, Storage public bucket for
  media). Auth is email/password only — **no guest mode** for MVP (all progress must persist
  from session one).
- **Charts (analytics):** lightweight lib such as Recharts or Chart.js.

## Planned project structure

```
/src/categories
  ├── ImageCategory.tsx
  ├── EmailCategory.tsx
  ├── AudioCategory.tsx
  └── CategoryRegistry.ts
/config
  ├── game.ts          # Lives count, batch size, default mode toggles
  ├── scoring.ts       # Plateau durations, decay multipliers, base points, combo multipliers
  ├── difficulty.ts    # Escalation steps (time limits, decay acceleration)
  ├── xp.ts            # XP payout rates, level curves, streak bonuses
  ├── categories.ts    # Media type constants, grace periods
  └── ui.ts            # Animation durations, visual thresholds
```

Components stay small and single-purpose (e.g., `TimerBar.tsx`, `MediaContainer.tsx`,
`ComboBadge.tsx`).

## Core mechanics (implement from config; values here are examples)

- **Game modes:** _Arcade_ (3 lives, score decay, combo, ends at 0 lives, persists stats)
  and _Training_ (unlimited lives, no decay/penalties, shows correctness + explanation
  placeholder). Both share the same question-sampling engine.
- **Scoring — Plateau + Exponential Ease-In Decay.** Obtainable points:
  `S(t) = M` for `t ≤ t_p`, else `max(0, round(M − α·(t − t_p)^β))`.
  `M`=max points, `t_p`=plateau grace (per category/difficulty), `α`=decay severity,
  `β`=exponential factor.
- **Combo:** consecutive correct answers raise the multiplier; awarded points =
  `S(t) × combo`. A wrong answer resets combo to `1×`.
- **Difficulty progression:** MVP does NOT filter question content difficulty. Difficulty
  ramps purely via evolving _game constraints_ (max points, timer, plateau, decay) keyed on
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

_No toolchain exists yet._ Once the app is scaffolded, record the exact verified commands
here (install, dev, build, run all tests, run a single test, lint/typecheck).

## Repo notes

- Default branch: `main`. Active development branch: `advait/init`.
