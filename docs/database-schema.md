# Database Schema — AI Detection Game (Supabase Postgres)

> Canonical, ready-to-run schema for the MVP. Expands the schema sketch in
> `project-plan.md` §10 with enums, constraints, indexes, Row Level Security (RLS)
> policies, and helper triggers. Run the sections in order in the Supabase SQL editor
> (or as a migration). Anything beyond the base spec is marked **[extension]** and is
> safe/optional for the MVP but recommended.

---

## 0. Conventions

- All primary keys are `UUID` except `categories.id`, which is a short human-readable
  `TEXT` slug (`'image'`, `'email'`, `'audio'`).
- All timestamps are `TIMESTAMPTZ` and default to `NOW()`.
- Enum-like fields use Postgres `CHECK` constraints (simpler than native enums for a
  hackathon; easy to widen later).
- Money/score/points are plain `INTEGER`.
- Every table that stores per-user data has RLS enabled with owner-only policies.

---

## 1. Enums & constraint vocabularies

Values are enforced via `CHECK` constraints on the relevant columns (defined inline
below). Reference list:

| Concept              | Column                          | Allowed values                              |
| -------------------- | ------------------------------- | ------------------------------------------- |
| Category id          | `categories.id`, `questions.category_id` | `image`, `email`, `audio` (+ future)  |
| Difficulty rating    | `questions.difficulty_rating`   | `EASY`, `MEDIUM`, `HARD`, `EXPERT`          |
| Game mode            | `game_sessions.mode`            | `ARCADE`, `TRAINING`                        |

---

## 2. Extensions

```sql
-- Needed for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

---

## 3. Tables

### 3.1 `profiles` — user progression (1:1 with `auth.users`)

```sql
CREATE TABLE profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  username       TEXT UNIQUE NOT NULL,
  total_xp       INTEGER NOT NULL DEFAULT 0     CHECK (total_xp >= 0),
  current_level  INTEGER NOT NULL DEFAULT 1     CHECK (current_level >= 1),
  daily_streak   INTEGER NOT NULL DEFAULT 0     CHECK (daily_streak >= 0),
  last_played_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()   -- [extension]
);
```

On signup a `profiles` row must be created initialized to Level 1 / 0 XP / 0 streak
(see §6 trigger).

### 3.2 `categories` — content type registry

```sql
CREATE TABLE categories (
  id              TEXT PRIMARY KEY
                    CHECK (id = lower(id) AND id ~ '^[a-z_]+$'),
  display_name    TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  grace_period_ms INTEGER NOT NULL DEFAULT 1500 CHECK (grace_period_ms >= 0),
  sort_order      INTEGER NOT NULL DEFAULT 0   -- [extension] controls UI ordering
);
```

### 3.3 `questions` — challenges

```sql
CREATE TABLE questions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id       TEXT NOT NULL REFERENCES categories (id),
  media_url         TEXT NOT NULL,          -- Supabase Storage path or public URL
  is_ai             BOOLEAN NOT NULL,       -- TRUE = AI/Scam/Synthetic, FALSE = Real
  difficulty_rating TEXT NOT NULL DEFAULT 'MEDIUM'
                      CHECK (difficulty_rating IN ('EASY','MEDIUM','HARD','EXPERT')),
  explanation_text  TEXT,                   -- shown in Training mode / future
  is_active         BOOLEAN NOT NULL DEFAULT TRUE, -- [extension] soft-disable bad items
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb, -- [extension] per-category extras
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

`metadata` holds category-specific fields that must not bloat the core schema
(e.g., email subject/sender, audio duration, image alt text). See
`data-formats.md` for the standardized shapes.

### 3.4 `game_sessions` — one row per completed run

```sql
CREATE TABLE game_sessions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  mode               TEXT NOT NULL CHECK (mode IN ('ARCADE','TRAINING')),
  final_score        INTEGER NOT NULL DEFAULT 0 CHECK (final_score >= 0),
  max_combo          INTEGER NOT NULL DEFAULT 0 CHECK (max_combo >= 0),
  questions_answered INTEGER NOT NULL DEFAULT 0 CHECK (questions_answered >= 0),
  xp_awarded         INTEGER NOT NULL DEFAULT 0 CHECK (xp_awarded >= 0), -- [extension]
  categories_played  TEXT[] NOT NULL DEFAULT '{}',  -- [extension] filter used for run
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.5 `question_attempts` — granular per-question analytics

```sql
CREATE TABLE question_attempts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID NOT NULL REFERENCES game_sessions (id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  question_id      UUID NOT NULL REFERENCES questions (id),
  category_id      TEXT NOT NULL REFERENCES categories (id), -- [extension] denormalized for fast category analytics
  question_index   INTEGER NOT NULL DEFAULT 1 CHECK (question_index >= 1), -- [extension] position in the run; selects the difficulty tier server-side
  is_correct       BOOLEAN NOT NULL,
  response_time_ms INTEGER NOT NULL CHECK (response_time_ms >= 0),
  points_awarded   INTEGER NOT NULL DEFAULT 0 CHECK (points_awarded >= 0), -- server-recomputed, authoritative
  combo_at_answer  INTEGER NOT NULL DEFAULT 0 CHECK (combo_at_answer >= 0), -- [extension]
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.6 `game_config` — server-authoritative, versioned gameplay config — [extension]

Timers, grace/plateau periods, decay curve, difficulty tiers, XP payouts, and level
curve are stored here as JSONB so balance is tunable **without a client redeploy**. The
client fetches the active config at run start (see `get_active_config`, §6.3) and runs
its timers locally for 0ms feel; the server re-derives scoring/XP from this same config
on submission (§6.5). The `/config/*.ts` files in the client repo are the **default seed
values** for this table and the TypeScript shape contract — the DB row is the runtime
source of truth. Per-category grace periods remain in `categories.grace_period_ms`; the
config delivery RPC merges the two.

```sql
CREATE TABLE game_config (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version    INTEGER NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT FALSE,
  config     JSONB NOT NULL,   -- shape mirrors /config templates; see data-formats.md §6
  note       TEXT,             -- human description of this revision
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exactly one active config at a time.
CREATE UNIQUE INDEX idx_game_config_single_active
  ON game_config (is_active) WHERE is_active;
CREATE UNIQUE INDEX idx_game_config_version ON game_config (version);
```

The `config` JSONB shape (mirrors `data-formats.md` §6):

```json
{
  "game":    { "arcadeLives": 3, "batchSize": 15, "prefetchThreshold": 5 },
  "scoring": { "decayExponentBeta": 1.8, "comboMultipliers": [1, 1.5, 2, 2.5, 3, 4, 5] },
  "difficultyTiers": [
    { "minQuestion": 1,  "maxPoints": 100, "timerMs": 15000, "plateauMs": 1500, "alpha": 1.5 },
    { "minQuestion": 6,  "maxPoints": 150, "timerMs": 10000, "plateauMs": 1000, "alpha": 2.5 },
    { "minQuestion": 16, "maxPoints": 200, "timerMs":  7000, "plateauMs":  500, "alpha": 4.0 },
    { "minQuestion": 31, "maxPoints": 300, "timerMs":  5000, "plateauMs":  200, "alpha": 6.0 }
  ],
  "xp": { "baseXpPerCorrect": 10, "comboBonusPerMaxCombo": 5, "runCompletionBonus": 50,
          "xpCurveBase": 100, "xpCurveExp": 1.5 }
}
```

> **Effective plateau rule:** the plateau (full-points grace) for an attempt is
> `tier.plateauMs + category.grace_period_ms`. Tier plateau is the base reflex window;
> the per-category grace is additive listening/reading time (e.g. audio +5000ms), which
> is why consumption-heavy media gets more time before decay begins.

---

## 4. Indexes

```sql
-- Question sampling: fetch active questions filtered by enabled categories.
CREATE INDEX idx_questions_category_active
  ON questions (category_id) WHERE is_active;

-- Analytics roll-ups per user.
CREATE INDEX idx_attempts_user            ON question_attempts (user_id);
CREATE INDEX idx_attempts_user_category   ON question_attempts (user_id, category_id);
CREATE INDEX idx_attempts_session         ON question_attempts (session_id);

-- Session history / personal bests.
CREATE INDEX idx_sessions_user_created    ON game_sessions (user_id, created_at DESC);
CREATE INDEX idx_sessions_user_mode_score ON game_sessions (user_id, mode, final_score DESC);
```

---

## 5. Row Level Security (RLS)

```sql
-- Enable RLS everywhere.
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_config       ENABLE ROW LEVEL SECURITY;

-- profiles: a user can read/update only their own row.
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_insert_own ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- categories & questions: readable by any authenticated user; writes are admin-only
-- (service role bypasses RLS, so no write policy is granted to normal users).
CREATE POLICY categories_read ON categories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY questions_read ON questions
  FOR SELECT TO authenticated USING (is_active);

-- game_config: the active config is readable by any authenticated user (client needs it
-- to run timers locally); writes are admin-only via service role.
CREATE POLICY game_config_read ON game_config
  FOR SELECT TO authenticated USING (is_active);

-- game_sessions: owner-only for all operations.
CREATE POLICY sessions_owner ON game_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- question_attempts: owner-only for all operations.
CREATE POLICY attempts_owner ON question_attempts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

> **Anti-cheat note:** `questions.is_ai` is the answer key. Because the client needs it
> for 0ms validation, it is exposed to authenticated users by design (accepted trade-off
> per spec §10). Correctness can be faked, but **scores cannot**: `submit_run` recomputes
> `points_awarded` and XP server-side from the authoritative `game_config` using each
> attempt's `response_time_ms`, so client-sent point values are validated/overwritten.

---

## 6. Triggers & helper functions

### 6.1 Auto-create a profile on signup

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 6.2 `updated_at` maintenance (profiles) — [extension]

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 6.3 Active config delivery RPC (`get_active_config`) — [extension]

The client calls this once at run start to get the authoritative gameplay config
(difficulty tiers, timers, decay, XP curve) merged with per-category grace periods. The
client then runs its countdown/decay locally for 0ms feel using these values.

```sql
CREATE OR REPLACE FUNCTION get_active_config()
RETURNS JSONB LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT jsonb_set(
    gc.config,
    '{categories}',
    COALESCE((
      SELECT jsonb_object_agg(c.id, jsonb_build_object(
               'displayName',   c.display_name,
               'gracePeriodMs', c.grace_period_ms,
               'isActive',      c.is_active,
               'sortOrder',     c.sort_order))
      FROM categories c WHERE c.is_active
    ), '{}'::jsonb)
  )
  FROM game_config gc
  WHERE gc.is_active
  LIMIT 1;
$$;
```

### 6.4 Server-side scoring (`score_attempt`) — [extension]

Authoritative recompute of a single attempt's points from the active config. This is the
server-side twin of the client's `useScoringTimer`; both read the **same** config so the
displayed and recorded scores agree. Implements the Plateau + Exponential Ease-In model
(`project-plan.md` §7) with the effective-plateau rule (tier plateau + category grace).

```sql
CREATE OR REPLACE FUNCTION score_attempt(
  p_config       JSONB,
  p_category_id  TEXT,
  p_grace_ms     INTEGER,
  p_question_idx INTEGER,
  p_response_ms  INTEGER,
  p_is_correct   BOOLEAN,
  p_combo        INTEGER    -- 0-based index into scoring.comboMultipliers
)
RETURNS INTEGER LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_tier    JSONB;
  v_beta    NUMERIC := (p_config #>> '{scoring,decayExponentBeta}')::numeric;
  v_mults   JSONB   := p_config #> '{scoring,comboMultipliers}';
  v_m       NUMERIC;
  v_alpha   NUMERIC;
  v_timer   INTEGER;
  v_plateau NUMERIC;  -- ms
  v_s       NUMERIC;  -- obtainable points
  v_idx     INTEGER;
BEGIN
  IF NOT p_is_correct THEN
    RETURN 0;   -- wrong answers score nothing
  END IF;

  -- Highest difficulty tier whose minQuestion <= this question's position in the run.
  SELECT t INTO v_tier
  FROM jsonb_array_elements(p_config -> 'difficultyTiers') AS t
  WHERE (t ->> 'minQuestion')::int <= p_question_idx
  ORDER BY (t ->> 'minQuestion')::int DESC
  LIMIT 1;

  v_m       := (v_tier ->> 'maxPoints')::numeric;
  v_alpha   := (v_tier ->> 'alpha')::numeric;
  v_timer   := (v_tier ->> 'timerMs')::int;
  v_plateau := (v_tier ->> 'plateauMs')::numeric + COALESCE(p_grace_ms, 0);

  IF p_response_ms > v_timer THEN
    RETURN 0;   -- answered after the hard timer cap => timed out
  END IF;

  IF p_response_ms <= v_plateau THEN
    v_s := v_m;
  ELSE
    v_s := GREATEST(0, round(v_m - v_alpha * power((p_response_ms - v_plateau) / 1000.0, v_beta)));
  END IF;

  v_idx  := LEAST(GREATEST(p_combo, 0), jsonb_array_length(v_mults) - 1);
  RETURN GREATEST(0, round(v_s * (v_mults ->> v_idx)::numeric))::int;
END;
$$;
```

### 6.5 Run submission RPC (`submit_run`) — [extension, recommended]

Server-authoritative and atomic. The client sends only the raw per-attempt facts
(`response_time_ms`, `question_index`, `is_correct`, `combo_at_answer`) — **not** points
or XP. This function recomputes every attempt's points via `score_attempt`, derives the
final score, XP, level, and streak from the active config, writes the session + attempts,
and updates the profile in one transaction. Client-sent scores are never trusted.

```sql
CREATE OR REPLACE FUNCTION submit_run(
  p_mode       TEXT,
  p_categories TEXT[],
  p_attempts   JSONB   -- array; each item: see data-formats.md §5.3 (AttemptRecord)
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid        UUID := auth.uid();
  v_cfg        JSONB;
  v_session_id UUID;
  v_score      INTEGER := 0;
  v_correct    INTEGER := 0;
  v_answered   INTEGER := 0;
  v_max_combo  INTEGER := 0;
  v_xp         INTEGER := 0;
  v_new_xp     INTEGER;
  v_new_level  INTEGER;
  v_last       TIMESTAMPTZ;
  v_streak     INTEGER;
  a            JSONB;
  v_pts        INTEGER;
  v_grace      INTEGER;
  v_combo      INTEGER;
  v_idx        INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_mode NOT IN ('ARCADE','TRAINING') THEN
    RAISE EXCEPTION 'Invalid mode %', p_mode;
  END IF;

  v_cfg := get_active_config();
  IF v_cfg IS NULL THEN
    RAISE EXCEPTION 'No active game_config';
  END IF;

  INSERT INTO game_sessions (user_id, mode, categories_played)
  VALUES (v_uid, p_mode, p_categories)
  RETURNING id INTO v_session_id;

  FOR a IN SELECT * FROM jsonb_array_elements(p_attempts)
  LOOP
    v_answered  := v_answered + 1;
    v_idx       := COALESCE((a ->> 'question_index')::int, v_answered);
    v_combo     := COALESCE((a ->> 'combo_at_answer')::int, 0);
    v_max_combo := GREATEST(v_max_combo, v_combo);

    SELECT grace_period_ms INTO v_grace FROM categories WHERE id = a ->> 'category_id';

    v_pts := score_attempt(
      v_cfg, a ->> 'category_id', COALESCE(v_grace, 0), v_idx,
      (a ->> 'response_time_ms')::int, (a ->> 'is_correct')::boolean, v_combo
    );

    IF (a ->> 'is_correct')::boolean THEN
      v_correct := v_correct + 1;
      v_score   := v_score + v_pts;
    END IF;

    INSERT INTO question_attempts (session_id, user_id, question_id, category_id,
                 question_index, is_correct, response_time_ms, points_awarded, combo_at_answer)
    VALUES (v_session_id, v_uid, (a ->> 'question_id')::uuid, a ->> 'category_id',
            v_idx, (a ->> 'is_correct')::boolean, (a ->> 'response_time_ms')::int,
            v_pts, v_combo);
  END LOOP;

  -- XP is awarded for Arcade runs only (spec §9). Training records the session + streak.
  IF p_mode = 'ARCADE' THEN
    v_xp := v_correct   * (v_cfg #>> '{xp,baseXpPerCorrect}')::int
          + v_max_combo * (v_cfg #>> '{xp,comboBonusPerMaxCombo}')::int
          + (v_cfg #>> '{xp,runCompletionBonus}')::int;
  END IF;

  UPDATE game_sessions
     SET final_score = v_score, max_combo = v_max_combo,
         questions_answered = v_answered, xp_awarded = v_xp
   WHERE id = v_session_id;

  -- Progression update (config-driven level curve).
  SELECT total_xp, last_played_at, daily_streak
    INTO v_new_xp, v_last, v_streak
    FROM profiles WHERE id = v_uid FOR UPDATE;

  v_new_xp := v_new_xp + v_xp;
  -- Inverse of: XP for level N = xpCurveBase * N^xpCurveExp
  v_new_level := GREATEST(1, floor(power(
      v_new_xp::numeric / (v_cfg #>> '{xp,xpCurveBase}')::numeric,
      1.0 / (v_cfg #>> '{xp,xpCurveExp}')::numeric))::int + 1);

  -- Daily streak: +1 if last play was yesterday, keep if today, else reset to 1.
  IF v_last IS NULL OR v_last::date < (CURRENT_DATE - 1) THEN
    v_streak := 1;
  ELSIF v_last::date = (CURRENT_DATE - 1) THEN
    v_streak := v_streak + 1;
  END IF; -- same day: unchanged

  UPDATE profiles
     SET total_xp       = v_new_xp,
         current_level  = v_new_level,
         daily_streak   = v_streak,
         last_played_at = NOW()
   WHERE id = v_uid;

  RETURN jsonb_build_object(
    'session_id',         v_session_id,
    'final_score',        v_score,
    'max_combo',          v_max_combo,
    'questions_answered', v_answered,
    'xp_awarded',         v_xp,
    'total_xp',           v_new_xp,
    'level',              v_new_level,
    'daily_streak',       v_streak
  );
END;
$$;
```

---

## 7. Analytics query recipes

These back the Analytics dashboard (`project-plan.md` §9).

```sql
-- Overall accuracy for the current user.
SELECT
  count(*)                                         AS total_attempts,
  count(*) FILTER (WHERE is_correct)               AS correct,
  round(100.0 * count(*) FILTER (WHERE is_correct) / NULLIF(count(*),0), 1) AS accuracy_pct,
  round(avg(response_time_ms) / 1000.0, 2)         AS avg_speed_s
FROM question_attempts
WHERE user_id = auth.uid();

-- Per-category performance matrix.
SELECT
  category_id,
  count(*)                             AS attempts,
  round(100.0 * count(*) FILTER (WHERE is_correct) / NULLIF(count(*),0), 1) AS accuracy_pct,
  round(avg(response_time_ms)/1000.0, 2) AS avg_speed_s
FROM question_attempts
WHERE user_id = auth.uid()
GROUP BY category_id;

-- Personal bests.
SELECT max(final_score) AS best_score, max(max_combo) AS longest_combo
FROM game_sessions
WHERE user_id = auth.uid() AND mode = 'ARCADE';

-- Accuracy trend by day (for the trend line chart).
SELECT created_at::date AS day,
       round(100.0 * count(*) FILTER (WHERE is_correct) / NULLIF(count(*),0), 1) AS accuracy_pct
FROM question_attempts
WHERE user_id = auth.uid()
GROUP BY day ORDER BY day;
```

---

## 8. Seed data

Minimum categories required before any question can be inserted:

```sql
INSERT INTO categories (id, display_name, grace_period_ms, sort_order) VALUES
  ('image', 'AI Images',   1500, 1),
  ('email', 'Scam Emails', 2000, 2),
  ('audio', 'Voice Audio', 5000, 3)
ON CONFLICT (id) DO NOTHING;
```

Seed the initial active gameplay config (mirrors the `/config` templates in
`data-formats.md` §6; edit this row later to rebalance without a client redeploy):

```sql
INSERT INTO game_config (version, is_active, note, config) VALUES (
  1, TRUE, 'Initial MVP balance',
  '{
    "game":    { "arcadeLives": 3, "batchSize": 15, "prefetchThreshold": 5 },
    "scoring": { "decayExponentBeta": 1.8, "comboMultipliers": [1, 1.5, 2, 2.5, 3, 4, 5] },
    "difficultyTiers": [
      { "minQuestion": 1,  "maxPoints": 100, "timerMs": 15000, "plateauMs": 1500, "alpha": 1.5 },
      { "minQuestion": 6,  "maxPoints": 150, "timerMs": 10000, "plateauMs": 1000, "alpha": 2.5 },
      { "minQuestion": 16, "maxPoints": 200, "timerMs":  7000, "plateauMs":  500, "alpha": 4.0 },
      { "minQuestion": 31, "maxPoints": 300, "timerMs":  5000, "plateauMs":  200, "alpha": 6.0 }
    ],
    "xp": { "baseXpPerCorrect": 10, "comboBonusPerMaxCombo": 5, "runCompletionBonus": 50,
            "xpCurveBase": 100, "xpCurveExp": 1.5 }
  }'::jsonb
);
```

To rebalance later: insert a new row with the next `version`, then flip `is_active`
(the partial unique index guarantees exactly one active config).

See `data-formats.md` §Seed templates for question seed CSV/JSON.
