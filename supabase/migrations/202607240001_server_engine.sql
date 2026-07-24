-- Server/game-engine migration.
-- Apply the team's database-schema.md first, then this migration.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Completed game detail required by the authoritative engine.
-- ---------------------------------------------------------------------------

ALTER TABLE game_sessions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS correct_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS incorrect_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_response_time_ms INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

UPDATE game_sessions
SET started_at = COALESCE(started_at, created_at),
    ended_at = COALESCE(ended_at, created_at)
WHERE started_at IS NULL OR ended_at IS NULL;

ALTER TABLE game_sessions
  ALTER COLUMN started_at SET NOT NULL,
  ALTER COLUMN ended_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'game_sessions_status_check'
  ) THEN
    ALTER TABLE game_sessions
      ADD CONSTRAINT game_sessions_status_check
      CHECK (status IN ('completed', 'abandoned'));
  END IF;
END $$;

ALTER TABLE question_attempts
  ADD COLUMN IF NOT EXISTS selected_answer TEXT,
  ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ;

UPDATE question_attempts
SET answered_at = COALESCE(answered_at, created_at)
WHERE answered_at IS NULL;

ALTER TABLE question_attempts
  ALTER COLUMN answered_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'question_attempts_selected_answer_check'
  ) THEN
    ALTER TABLE question_attempts
      ADD CONSTRAINT question_attempts_selected_answer_check
      CHECK (selected_answer IS NULL OR selected_answer IN ('AI', 'REAL'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_attempts_session_question_index
  ON question_attempts (session_id, question_index);

-- ---------------------------------------------------------------------------
-- Durable, server-only live sessions. `state` contains private answer data.
-- The version column is used for compare-and-swap updates.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS active_game_sessions (
  id         UUID PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  version    INTEGER NOT NULL DEFAULT 0 CHECK (version >= 0),
  state      JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_user
  ON active_game_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_expiry
  ON active_game_sessions (expires_at);

ALTER TABLE active_game_sessions ENABLE ROW LEVEL SECURITY;

-- Intentionally create no browser policies. The service role bypasses RLS.
REVOKE ALL ON active_game_sessions FROM anon, authenticated;

CREATE OR REPLACE FUNCTION cleanup_expired_game_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM active_game_sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION cleanup_expired_game_sessions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_game_sessions() TO service_role;

-- ---------------------------------------------------------------------------
-- Browser access is read-only. All authoritative writes use the server's
-- service-role client.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS questions_read ON questions;
DROP POLICY IF EXISTS sessions_owner ON game_sessions;
DROP POLICY IF EXISTS attempts_owner ON question_attempts;
DROP POLICY IF EXISTS profiles_update_own ON profiles;
DROP POLICY IF EXISTS profiles_insert_own ON profiles;
DROP POLICY IF EXISTS profiles_select_own ON profiles;

CREATE POLICY profiles_select_own ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY sessions_select_own ON game_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY attempts_select_own ON question_attempts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Questions contain `is_ai`, so authenticated browser clients receive no
-- direct table policy. Public challenge data must pass through the game API.

-- ---------------------------------------------------------------------------
-- Read-only leaderboard used by the server.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW leaderboard
WITH (security_invoker = true)
AS
WITH personal_bests AS (
  SELECT
    gs.user_id,
    p.username,
    MAX(gs.final_score)::INTEGER AS score
  FROM game_sessions gs
  JOIN profiles p ON p.id = gs.user_id
  WHERE gs.mode = 'ARCADE' AND gs.status = 'completed'
  GROUP BY gs.user_id, p.username
)
SELECT
  user_id,
  username,
  score,
  DENSE_RANK() OVER (ORDER BY score DESC)::INTEGER AS rank
FROM personal_bests;

REVOKE ALL ON leaderboard FROM PUBLIC, anon, authenticated;
GRANT SELECT ON leaderboard TO service_role;

-- ---------------------------------------------------------------------------
-- Atomic and idempotent completion. The API has already calculated gameplay
-- results, but this function verifies selected-answer correctness against the
-- private question row and updates persistence/progression in one transaction.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION persist_completed_game(
  p_session  JSONB,
  p_attempts JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id       UUID := (p_session ->> 'id')::UUID;
  v_user_id          UUID := (p_session ->> 'user_id')::UUID;
  v_mode             TEXT := p_session ->> 'mode';
  v_xp               INTEGER := COALESCE((p_session ->> 'xp_awarded')::INTEGER, 0);
  v_previous_level   INTEGER;
  v_new_total_xp     INTEGER;
  v_new_level        INTEGER;
  v_last_played      TIMESTAMPTZ;
  v_streak           INTEGER;
  v_config           JSONB;
  v_profile          profiles%ROWTYPE;
  v_attempt          JSONB;
  v_question_is_ai   BOOLEAN;
  v_derived_correct  BOOLEAN;
  v_timer_ms         INTEGER;
BEGIN
  IF v_mode NOT IN ('ARCADE', 'TRAINING') THEN
    RAISE EXCEPTION 'Invalid game mode';
  END IF;

  -- Idempotent replay: never add XP twice for the same session UUID.
  IF EXISTS (SELECT 1 FROM game_sessions WHERE id = v_session_id) THEN
    SELECT * INTO v_profile FROM profiles WHERE id = v_user_id;
    RETURN jsonb_build_object(
      'profile', to_jsonb(v_profile),
      'previous_level', v_profile.current_level
    );
  END IF;

  SELECT * INTO v_profile
  FROM profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile does not exist for user %', v_user_id;
  END IF;

  v_previous_level := v_profile.current_level;
  IF v_mode = 'TRAINING' THEN
    v_xp := 0;
  END IF;

  v_config := get_active_config();
  IF v_config IS NULL THEN
    RAISE EXCEPTION 'No active game configuration exists';
  END IF;

  INSERT INTO game_sessions (
    id, user_id, mode, status, final_score, max_combo,
    questions_answered, correct_count, incorrect_count,
    average_response_time_ms, xp_awarded, categories_played,
    started_at, ended_at, created_at
  )
  VALUES (
    v_session_id,
    v_user_id,
    v_mode,
    p_session ->> 'status',
    (p_session ->> 'final_score')::INTEGER,
    (p_session ->> 'max_combo')::INTEGER,
    (p_session ->> 'questions_answered')::INTEGER,
    (p_session ->> 'correct_count')::INTEGER,
    (p_session ->> 'incorrect_count')::INTEGER,
    (p_session ->> 'average_response_time_ms')::INTEGER,
    v_xp,
    ARRAY(SELECT jsonb_array_elements_text(p_session -> 'categories_played')),
    (p_session ->> 'started_at')::TIMESTAMPTZ,
    (p_session ->> 'ended_at')::TIMESTAMPTZ,
    (p_session ->> 'ended_at')::TIMESTAMPTZ
  );

  FOR v_attempt IN SELECT * FROM jsonb_array_elements(p_attempts)
  LOOP
    SELECT is_ai INTO v_question_is_ai
    FROM questions
    WHERE id = (v_attempt ->> 'question_id')::UUID
      AND category_id = v_attempt ->> 'category_id';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Attempt references an invalid question/category pair';
    END IF;

    v_derived_correct :=
      (v_attempt ->> 'selected_answer' = 'AI' AND v_question_is_ai)
      OR
      (v_attempt ->> 'selected_answer' = 'REAL' AND NOT v_question_is_ai);

    IF v_mode = 'ARCADE' THEN
      SELECT (tier ->> 'timerMs')::INTEGER
      INTO v_timer_ms
      FROM jsonb_array_elements(v_config -> 'difficultyTiers') AS tier
      WHERE (tier ->> 'minQuestion')::INTEGER
        <= (v_attempt ->> 'question_index')::INTEGER
      ORDER BY (tier ->> 'minQuestion')::INTEGER DESC
      LIMIT 1;

      v_derived_correct := v_derived_correct
        AND (v_attempt ->> 'response_time_ms')::INTEGER <= v_timer_ms;
    END IF;

    IF v_derived_correct <> (v_attempt ->> 'is_correct')::BOOLEAN THEN
      RAISE EXCEPTION 'Attempt correctness does not match the private answer key';
    END IF;

    INSERT INTO question_attempts (
      session_id, user_id, question_id, category_id, question_index,
      selected_answer, is_correct, response_time_ms, points_awarded,
      combo_at_answer, answered_at, created_at
    )
    VALUES (
      v_session_id,
      v_user_id,
      (v_attempt ->> 'question_id')::UUID,
      v_attempt ->> 'category_id',
      (v_attempt ->> 'question_index')::INTEGER,
      v_attempt ->> 'selected_answer',
      v_derived_correct,
      (v_attempt ->> 'response_time_ms')::INTEGER,
      (v_attempt ->> 'points_awarded')::INTEGER,
      (v_attempt ->> 'combo_at_answer')::INTEGER,
      (v_attempt ->> 'answered_at')::TIMESTAMPTZ,
      (v_attempt ->> 'answered_at')::TIMESTAMPTZ
    );
  END LOOP;

  v_new_total_xp := v_profile.total_xp + v_xp;
  v_new_level := GREATEST(
    1,
    FLOOR(
      POWER(
        v_new_total_xp::NUMERIC / (v_config #>> '{xp,xpCurveBase}')::NUMERIC,
        1.0 / (v_config #>> '{xp,xpCurveExp}')::NUMERIC
      )
    )::INTEGER + 1
  );

  v_last_played := v_profile.last_played_at;
  v_streak := v_profile.daily_streak;
  IF v_last_played IS NULL OR v_last_played::DATE < CURRENT_DATE - 1 THEN
    v_streak := 1;
  ELSIF v_last_played::DATE = CURRENT_DATE - 1 THEN
    v_streak := v_streak + 1;
  END IF;

  UPDATE profiles
  SET total_xp = v_new_total_xp,
      current_level = v_new_level,
      daily_streak = v_streak,
      last_played_at = (p_session ->> 'ended_at')::TIMESTAMPTZ
  WHERE id = v_user_id
  RETURNING * INTO v_profile;

  RETURN jsonb_build_object(
    'profile', to_jsonb(v_profile),
    'previous_level', v_previous_level
  );
END;
$$;

REVOKE ALL ON FUNCTION persist_completed_game(JSONB, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION persist_completed_game(JSONB, JSONB)
  TO service_role;
