-- Bot Or Not — initial schema (Phase 4)
-- Hardened per Supabase security checklist. Idempotent: safe to re-run.
-- Canonical reference: docs/database-schema.md. Data shapes: docs/data-formats.md.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  username       TEXT UNIQUE NOT NULL,
  total_xp       INTEGER NOT NULL DEFAULT 0     CHECK (total_xp >= 0),
  current_level  INTEGER NOT NULL DEFAULT 1     CHECK (current_level >= 1),
  daily_streak   INTEGER NOT NULL DEFAULT 0     CHECK (daily_streak >= 0),
  last_played_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id              TEXT PRIMARY KEY CHECK (id = lower(id) AND id ~ '^[a-z_]+$'),
  display_name    TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  grace_period_ms INTEGER NOT NULL DEFAULT 1500 CHECK (grace_period_ms >= 0),
  sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS questions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id       TEXT NOT NULL REFERENCES categories (id),
  media_url         TEXT NOT NULL,
  is_ai             BOOLEAN NOT NULL,
  difficulty_rating TEXT NOT NULL DEFAULT 'MEDIUM'
                      CHECK (difficulty_rating IN ('EASY','MEDIUM','HARD','EXPERT')),
  explanation_text  TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_sessions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  mode               TEXT NOT NULL CHECK (mode IN ('ARCADE','TRAINING')),
  final_score        INTEGER NOT NULL DEFAULT 0 CHECK (final_score >= 0),
  max_combo          INTEGER NOT NULL DEFAULT 0 CHECK (max_combo >= 0),
  questions_answered INTEGER NOT NULL DEFAULT 0 CHECK (questions_answered >= 0),
  xp_awarded         INTEGER NOT NULL DEFAULT 0 CHECK (xp_awarded >= 0),
  categories_played  TEXT[] NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS question_attempts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID NOT NULL REFERENCES game_sessions (id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  question_id      UUID NOT NULL REFERENCES questions (id),
  category_id      TEXT NOT NULL REFERENCES categories (id),
  question_index   INTEGER NOT NULL DEFAULT 1 CHECK (question_index >= 1),
  is_correct       BOOLEAN NOT NULL,
  response_time_ms INTEGER NOT NULL CHECK (response_time_ms >= 0),
  points_awarded   INTEGER NOT NULL DEFAULT 0 CHECK (points_awarded >= 0),
  combo_at_answer  INTEGER NOT NULL DEFAULT 0 CHECK (combo_at_answer >= 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_config (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version    INTEGER NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT FALSE,
  config     JSONB NOT NULL,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_questions_category_active
  ON questions (category_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_attempts_user          ON question_attempts (user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user_category ON question_attempts (user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_attempts_session       ON question_attempts (session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_created  ON game_sessions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_mode_score
  ON game_sessions (user_id, mode, final_score DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_config_single_active
  ON game_config (is_active) WHERE is_active;
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_config_version ON game_config (version);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_config       ENABLE ROW LEVEL SECURITY;

-- profiles: owner-only read/update/insert.
DROP POLICY IF EXISTS profiles_select_own ON profiles;
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id);
DROP POLICY IF EXISTS profiles_update_own ON profiles;
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);
DROP POLICY IF EXISTS profiles_insert_own ON profiles;
CREATE POLICY profiles_insert_own ON profiles
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = id);

-- categories & questions: read-only for authenticated users; writes via service role only.
DROP POLICY IF EXISTS categories_read ON categories;
CREATE POLICY categories_read ON categories
  FOR SELECT TO authenticated USING (is_active);
DROP POLICY IF EXISTS questions_read ON questions;
CREATE POLICY questions_read ON questions
  FOR SELECT TO authenticated USING (is_active);

-- game_config: authenticated users read the active row only.
DROP POLICY IF EXISTS game_config_read ON game_config;
CREATE POLICY game_config_read ON game_config
  FOR SELECT TO authenticated USING (is_active);

-- game_sessions & question_attempts: owner-only for all operations.
DROP POLICY IF EXISTS sessions_owner ON game_sessions;
CREATE POLICY sessions_owner ON game_sessions
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS attempts_owner ON question_attempts;
CREATE POLICY attempts_owner ON question_attempts
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Data API grants (RLS still restricts rows). Only authenticated (no guest mode).
-- ---------------------------------------------------------------------------
GRANT SELECT ON categories, questions, game_config TO authenticated;
GRANT SELECT, UPDATE ON profiles TO authenticated;
GRANT SELECT ON game_sessions, question_attempts TO authenticated;

-- ---------------------------------------------------------------------------
-- Functions & triggers
-- ---------------------------------------------------------------------------

-- Auto-create a profile on signup.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Maintain profiles.updated_at.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Active config delivery: read-only, runs as caller (SECURITY INVOKER). Authenticated
-- users can read the active game_config + active categories via their RLS read policies.
CREATE OR REPLACE FUNCTION get_active_config()
RETURNS JSONB LANGUAGE sql SECURITY INVOKER STABLE SET search_path = public AS $$
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

-- Authoritative per-attempt scoring (pure). Plateau + exponential ease-in decay.
CREATE OR REPLACE FUNCTION score_attempt(
  p_config       JSONB,
  p_category_id  TEXT,
  p_grace_ms     INTEGER,
  p_question_idx INTEGER,
  p_response_ms  INTEGER,
  p_is_correct   BOOLEAN,
  p_combo        INTEGER    -- 1-based consecutive-correct streak; 0 if wrong
)
RETURNS INTEGER LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_tier    JSONB;
  v_beta    NUMERIC := (p_config #>> '{scoring,decayExponentBeta}')::numeric;
  v_mults   JSONB   := p_config #> '{scoring,comboMultipliers}';
  v_m       NUMERIC;
  v_alpha   NUMERIC;
  v_timer   INTEGER;
  v_plateau NUMERIC;
  v_s       NUMERIC;
  v_idx     INTEGER;
BEGIN
  IF NOT p_is_correct THEN
    RETURN 0;
  END IF;

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
    RETURN 0;
  END IF;

  IF p_response_ms <= v_plateau THEN
    v_s := v_m;
  ELSE
    v_s := GREATEST(0, round(v_m - v_alpha * power((p_response_ms - v_plateau) / 1000.0, v_beta)));
  END IF;

  -- combo_at_answer is a 1-based streak; the multiplier array is 0-based.
  v_idx := LEAST(GREATEST(p_combo - 1, 0), jsonb_array_length(v_mults) - 1);
  RETURN GREATEST(0, round(v_s * (v_mults ->> v_idx)::numeric))::int;
END;
$$;

-- Server-authoritative, atomic run submission. Recomputes score/XP/level/streak from the
-- active config. Client-sent scores are never trusted.
CREATE OR REPLACE FUNCTION submit_run(
  p_mode       TEXT,
  p_categories TEXT[],
  p_attempts   JSONB
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  IF p_mode = 'ARCADE' THEN
    v_xp := v_correct   * (v_cfg #>> '{xp,baseXpPerCorrect}')::int
          + v_max_combo * (v_cfg #>> '{xp,comboBonusPerMaxCombo}')::int
          + (v_cfg #>> '{xp,runCompletionBonus}')::int;
  END IF;

  UPDATE game_sessions
     SET final_score = v_score, max_combo = v_max_combo,
         questions_answered = v_answered, xp_awarded = v_xp
   WHERE id = v_session_id;

  SELECT total_xp, last_played_at, daily_streak
    INTO v_new_xp, v_last, v_streak
    FROM profiles WHERE id = v_uid FOR UPDATE;

  v_new_xp := v_new_xp + v_xp;
  v_new_level := GREATEST(1, floor(power(
      v_new_xp::numeric / (v_cfg #>> '{xp,xpCurveBase}')::numeric,
      1.0 / (v_cfg #>> '{xp,xpCurveExp}')::numeric))::int + 1);

  IF v_last IS NULL OR v_last::date < (CURRENT_DATE - 1) THEN
    v_streak := 1;
  ELSIF v_last::date = (CURRENT_DATE - 1) THEN
    v_streak := v_streak + 1;
  END IF;

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

-- Restrict the sensitive RPCs to authenticated users (no guest mode).
REVOKE ALL ON FUNCTION submit_run(TEXT, TEXT[], JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION submit_run(TEXT, TEXT[], JSONB) TO authenticated;
REVOKE ALL ON FUNCTION get_active_config() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_active_config() TO authenticated;

-- ---------------------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------------------
INSERT INTO categories (id, display_name, grace_period_ms, sort_order) VALUES
  ('image', 'AI Images',   1500, 1),
  ('email', 'Scam Emails', 2000, 2),
  ('audio', 'Voice Audio', 5000, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO game_config (version, is_active, note, config)
SELECT 1, TRUE, 'Initial MVP balance', '{
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
WHERE NOT EXISTS (SELECT 1 FROM game_config WHERE version = 1);
