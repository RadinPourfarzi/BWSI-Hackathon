# Architecture requirements map

This maps section 2 of `AI Detection Game Architecture.pdf` to the
implementation.

| PDF responsibility                  | Implementation                                                                                             |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| A. Authentication and authorization | `src/server/auth/auth.service.ts`; route ownership checks                                                  |
| B. Game-session controller          | `src/server/game/game-session.service.ts`                                                                  |
| C. Question chooser                 | `src/server/game/question-selector.ts`                                                                     |
| D. Answer evaluator                 | `src/server/game/answer-evaluator.ts`                                                                      |
| E. Player session state             | `src/server/game/game-session.types.ts`                                                                    |
| F. Rule engine                      | `rule-engine.ts`, `scoring.ts`, `combo.ts`, `lives.ts`, `difficulty.ts`, `xp.ts`                           |
| G. Configuration                    | `src/config/game.config.ts`; `game_config` RPC and session snapshot                                        |
| H. Player-information handler       | Atomic progression logic in `persist_completed_game`; repository profile access                            |
| I. Analytics and leaderboard        | `analytics.service.ts`, `leaderboard.service.ts`, repository queries, `/api` routes                        |
| J. Validation and anti-cheat        | Zod schemas, private/public mapping, server timing, stale-answer and ownership checks, optimistic versions |
| K. Server events                    | `GameEvent` contract and semantic events returned by the rule/session service                              |

## HTTP boundary

| Endpoint                    | Server operation                                                          |
| --------------------------- | ------------------------------------------------------------------------- |
| `POST /api/game/start`      | Authenticate, validate, configure, create session, select first question  |
| `GET /api/game/session/:id` | Resume current authoritative session                                      |
| `POST /api/game/answer`     | Validate current question, evaluate, resolve rules, save, select next/end |
| `POST /api/game/end`        | Abandon and persist active session                                        |
| `GET /api/profile`          | Read permanent player progression                                         |
| `GET /api/analytics`        | Read aggregate player performance                                         |
| `GET /api/leaderboard`      | Read ranked personal-best Arcade scores                                   |
| `GET /api/health`           | Check configuration/database readiness                                    |

## Deliberate differences from the supplied database draft

The database draft exposed `questions.is_ai` and accepted client-provided
`is_correct`. Those two choices contradict the PDF's authoritative-server rule.
The implementation follows the PDF:

- the client never receives `isAi`,
- the client submits only `selectedAnswer`,
- response time is measured by the server,
- the database completion function rechecks the selected answer against the
  private question row,
- clients cannot write score, attempts, XP, or levels directly.

## External actions still required

Code cannot create or alter the team's real services without project access.
Before production:

1. The database teammate reviews and applies the baseline schema and included
   server migration.
2. You configure local/Azure Supabase environment variables.
3. The UI developer sends Supabase bearer tokens and uses the shared contracts.
4. The Azure subscription owner creates the deployment resources.

No source-code TODO remains for the MVP server loop. Optional post-hackathon
work includes distributed rate limiting, structured log aggregation, database
integration tests in CI, and administrator content-management routes.
