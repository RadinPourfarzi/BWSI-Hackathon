# Database integration notes

This implementation maps the supplied `database-schema.md` and
`data-formats.md` into server-owned TypeScript contracts. The changes below are
implemented by `supabase/migrations/202607240001_server_engine.sql`; the
database and server developers should review that migration together.

## 1. Keep `questions.is_ai` private

The architecture PDF requires the answer key to remain server-side. The current
database draft permits authenticated users to select active `questions`, which
also exposes `is_ai`.

Implemented change:

- Do not grant browser clients direct `SELECT` access to the `questions` table.
- Read questions inside Next.js route handlers using a protected server client.
- Return `PublicQuestion`, which omits `isAi` and `explanationText`.
- Never place a Supabase service-role key in a `NEXT_PUBLIC_*` variable.

If the UI needs direct database reads for unrelated reasons, expose a view or
RPC containing only public question fields. Do not include `is_ai`.

## 2. Do not accept client-declared correctness

The supplied `submit_run` draft accepts `is_correct` and `combo_at_answer` from
the browser. A modified client can claim every answer was correct, so
recomputing only the point formula does not protect XP or scores.

This starter instead accepts:

```json
{
  "sessionId": "...",
  "challengeId": "...",
  "selectedAnswer": "AI"
}
```

The server:

1. Verifies the authenticated user owns the session.
2. Verifies the challenge is current and unanswered.
3. Reads the private `is_ai` value.
4. Determines correctness.
5. Measures elapsed time from the server-recorded start.
6. Calculates points, combo, lives, and XP.
7. Persists the derived attempt and completed run.

The supplied browser-callable `submit_run` is replaced by the server-only
`persist_completed_game` function. Execute permission is granted only to the
service role.

## 3. Tighten write policies

Owner-only `FOR ALL` policies still permit owners to forge their own session and
attempt rows. Likewise, unrestricted profile updates can allow a client to
modify progression fields.

The migration enforces:

- Browser users may `SELECT` their own profiles, sessions, and attempts.
- Browser users must not directly write `final_score`, `xp_awarded`,
  `points_awarded`, `is_correct`, `total_xp`, or `current_level`.
- Authoritative writes occur through the protected server path.
- If users can edit a username, expose a narrow RPC or separate editable field
  policy instead of granting general profile updates.

## 4. Durable active-session storage

`game_sessions` currently describes completed runs. The live engine also needs
authoritative temporary state:

- current question
- shown question IDs
- challenge start time
- score
- lives
- combo
- attempt accumulator
- configuration version

`InMemoryActiveSessionStore` is used in mock mode. Supabase mode uses
`SupabaseActiveSessionStore` and the server-only `active_game_sessions` table.
Its `version` column provides optimistic compare-and-swap updates so two
simultaneous answer submissions cannot both succeed.

## 5. Database naming map

All snake_case conversion stays under `src/database/supabase/`.

| Database            | TypeScript         |
| ------------------- | ------------------ |
| `category_id`       | `categoryId`       |
| `media_url`         | `mediaUrl`         |
| `is_ai`             | `isAi`             |
| `difficulty_rating` | `difficultyRating` |
| `explanation_text`  | `explanationText`  |
| `total_xp`          | `totalXp`          |
| `current_level`     | `currentLevel`     |
| `daily_streak`      | `dailyStreak`      |
| `last_played_at`    | `lastPlayedAt`     |

The rest of the application should never receive raw database rows.

## 6. Shared decisions to settle

- The schema uses `media_url`, while one seed template calls the field
  `media_path`. Pick one database column name; the starter assumes `media_url`.
- Define whether manually leaving an Arcade run awards completion XP. The
  starter does not award the completion bonus for an abandoned run.
- Confirm combo semantics. The starter uses the combo that existed before the
  answer to select the multiplier, then increments the combo after a correct
  answer. Thus the first correct answer is `1x`.
- Decide whether Training attempts should persist. The starter persists them
  but awards no score or XP.
