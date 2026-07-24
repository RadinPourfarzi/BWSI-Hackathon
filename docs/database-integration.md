# Database integration

The single baseline migration is
`supabase/migrations/202607240001_initial_schema.sql`. It incorporates the
supplied database outline and the stricter server-authoritative requirements
from the architecture PDF.

## Important corrections to the supplied draft

The draft allowed authenticated users to select `questions.is_ai` and directly
write owner rows. That would expose answers and allow forged correctness,
scores, or XP.

The merged schema instead:

- gives browser users no policy or table grant for `questions`;
- gives browser users read-only access to their own profile, sessions, and
  attempts;
- keeps active state service-role only;
- accepts no browser-callable score-submission RPC;
- completes a run from locked server state in one transaction;
- rechecks each selected option against the private question answer;
- recomputes timer, base points, combo multiplier, total score, XP, and level;
- makes completion idempotent by session UUID.

## Main tables

| Table                  | Purpose                                         |
| ---------------------- | ----------------------------------------------- |
| `profiles`             | Permanent progression and player statistics     |
| `categories`           | Renderer, options, category grace, and ordering |
| `questions`            | Content metadata and private `is_ai` answer     |
| `game_config`          | Versioned authoritative balance                 |
| `active_game_sessions` | Private durable live state and CAS version      |
| `game_sessions`        | Final run summary                               |
| `question_attempts`    | Granular analytics and audit facts              |

## Naming boundary

Database rows use `snake_case`; application objects use `camelCase`. All
conversion belongs in `src/database/supabase/mappers.ts`.

Examples:

| Database             | TypeScript         |
| -------------------- | ------------------ |
| `category_id`        | `categoryId`       |
| `selected_option_id` | `selectedOptionId` |
| `highest_combo`      | `highestCombo`     |
| `daily_streak`       | `currentStreak`    |
| `last_played_at`     | `lastPlayedAt`     |

## Media

The migration creates a public `challenges` Storage bucket. Database
`questions.media_url` stores a bucket-relative path:

```text
image/<question-uuid>.webp
email/<question-uuid>.png
audio/<question-uuid>.mp3
```

Only media is public. The answer remains in the protected table. Uploading and
moderating real challenge data is an operational/database-team responsibility.

## Configuration updates

Never update the active config row in place while games are running. Insert a
new version, deactivate the prior version, and activate the new row in one
reviewed transaction. New games receive the new snapshot; existing games keep
their original snapshot.

Keep `DEFAULT_GAME_CONFIG` synchronized with migration version 1 for mock mode.
Future database versions do not require changing the fallback unless the team
wants mock behavior to match production.

## Generated types

After starting local Supabase:

```bash
npm run db:types
```

This writes `src/database/supabase/generated.types.ts`. Review and commit type
changes with the migration that caused them. The small handwritten row types
remain an explicit mapper boundary until the team chooses to replace them.
