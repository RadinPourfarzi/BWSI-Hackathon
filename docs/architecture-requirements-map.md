# Architecture requirements map

| PDF responsibility           | Implementation                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------ |
| Authentication/authorization | `server/auth`, bearer verification, ownership checks                           |
| Game-session controller      | `server/game/game-session.service.ts`                                          |
| Question chooser             | `server/game/question-selector.ts`                                             |
| Answer evaluator             | `server/game/answer-evaluator.ts`                                              |
| Authoritative session state  | `server/game/game-session.types.ts`, `server/sessions`, Supabase active store  |
| Rule engine                  | scoring, combo, lives, difficulty, XP, and `rule-engine.ts`                    |
| Configuration                | validated fallback, versioned DB config, immutable session snapshot            |
| Permanent progression        | atomic `persist_completed_game` and repository mapping                         |
| Analytics/leaderboard        | read services, repository aggregation, API routes                              |
| Validation/anti-cheat        | Zod, private mapper, server time, option/current/owner checks, CAS, DB recheck |
| Semantic events              | `GameEvent` union and rule/session events                                      |

## Data-flow coverage

- Start authenticates, loads config, chooses a private question, stores active
  state, and returns only its public shape.
- Answer validates ownership/current option, measures server time, resolves
  rules, saves by expected version, and chooses the next question or finalizes.
- End calculates summary, persists attempts/session/progression atomically, and
  supports retry after a lost response.

## Deliberate security correction

The supplied database draft exposed `questions.is_ai` and accepted
client-declared `is_correct`. Those choices conflict with the PDF. This project
keeps the answer service-only and accepts only `selectedOptionId`.

## Team handoff still required

1. UI developers consume types from `src/shared`, send bearer tokens, and render
   semantic events.
2. The database owner reviews the migration and deploys it through the
   protected workflow.
3. The deployment owner hosts the Next.js application and sets server secrets.
4. Content owners replace mock/seed media with curated reviewed challenges.
