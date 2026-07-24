-- AI Detection Game - complete Supabase schema.
-- The browser may read its own completed records, but only the service-role
-- game server can read answer keys or write authoritative gameplay values.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  username              TEXT UNIQUE NOT NULL,
  total_xp              INTEGER NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  current_level         INTEGER NOT NULL DEFAULT 1 CHECK (current_level >= 1),
  highest_score         INTEGER NOT NULL DEFAULT 0 CHECK (highest_score >= 0),
  longest_combo         INTEGER NOT NULL DEFAULT 0 CHECK (longest_combo >= 0),
  daily_streak          INTEGER NOT NULL DEFAULT 0 CHECK (daily_streak >= 0),
  longest_streak        INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  last_played_at        TIMESTAMPTZ,
  games_played          INTEGER NOT NULL DEFAULT 0 CHECK (games_played >= 0),
  arcade_games_played   INTEGER NOT NULL DEFAULT 0 CHECK (arcade_games_played >= 0),
  training_games_played INTEGER NOT NULL DEFAULT 0 CHECK (training_games_played >= 0),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
  id                  TEXT PRIMARY KEY
                        CHECK (id = lower(id) AND id ~ '^[a-z_]+$'),
  display_name        TEXT NOT NULL,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  grace_period_ms     INTEGER NOT NULL DEFAULT 1500 CHECK (grace_period_ms >= 0),
  sort_order          INTEGER NOT NULL DEFAULT 0,
  renderer_kind       TEXT NOT NULL CHECK (renderer_kind IN ('image', 'email', 'audio')),
  ai_option_id        TEXT NOT NULL,
  ai_option_label     TEXT NOT NULL,
  non_ai_option_id    TEXT NOT NULL,
  non_ai_option_label TEXT NOT NULL,
  CHECK (ai_option_id <> non_ai_option_id)
);

CREATE TABLE questions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id       TEXT NOT NULL REFERENCES categories (id),
  media_url         TEXT NOT NULL,
  is_ai             BOOLEAN NOT NULL,
  difficulty_rating TEXT NOT NULL DEFAULT 'MEDIUM'
                      CHECK (difficulty_rating IN ('EASY', 'MEDIUM', 'HARD', 'EXPERT')),
  explanation_text  TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  metadata          JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE game_config (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version    INTEGER UNIQUE NOT NULL CHECK (version >= 1),
  is_active  BOOLEAN NOT NULL DEFAULT FALSE,
  config     JSONB NOT NULL,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_game_config_single_active
  ON game_config (is_active)
  WHERE is_active;

CREATE TABLE game_sessions (
  id                       UUID PRIMARY KEY,
  user_id                  UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  mode                     TEXT NOT NULL CHECK (mode IN ('ARCADE', 'TRAINING')),
  status                   TEXT NOT NULL CHECK (status IN ('completed', 'abandoned')),
  end_reason               TEXT NOT NULL
                             CHECK (end_reason IN ('lives-depleted', 'pool-exhausted', 'abandoned')),
  config_version           INTEGER NOT NULL REFERENCES game_config (version),
  final_score              INTEGER NOT NULL DEFAULT 0 CHECK (final_score >= 0),
  xp_earned                INTEGER NOT NULL DEFAULT 0 CHECK (xp_earned >= 0),
  correct_count            INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  incorrect_count          INTEGER NOT NULL DEFAULT 0 CHECK (incorrect_count >= 0),
  highest_combo            INTEGER NOT NULL DEFAULT 0 CHECK (highest_combo >= 0),
  questions_answered       INTEGER NOT NULL DEFAULT 0 CHECK (questions_answered >= 0),
  average_response_time_ms INTEGER NOT NULL DEFAULT 0 CHECK (average_response_time_ms >= 0),
  categories_played        TEXT[] NOT NULL DEFAULT '{}',
  started_at               TIMESTAMPTZ NOT NULL,
  ended_at                 TIMESTAMPTZ NOT NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE question_attempts (
  id                  UUID PRIMARY KEY,
  session_id          UUID NOT NULL REFERENCES game_sessions (id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  question_id         UUID NOT NULL REFERENCES questions (id),
  category_id         TEXT NOT NULL REFERENCES categories (id),
  question_number     INTEGER NOT NULL CHECK (question_number >= 1),
  selected_option_id  TEXT NOT NULL,
  was_correct         BOOLEAN NOT NULL,
  timed_out           BOOLEAN NOT NULL DEFAULT FALSE,
  response_time_ms    INTEGER NOT NULL CHECK (response_time_ms >= 0),
  base_points         INTEGER NOT NULL DEFAULT 0 CHECK (base_points >= 0),
  combo_multiplier    NUMERIC NOT NULL DEFAULT 1 CHECK (combo_multiplier > 0),
  combo_before_answer INTEGER NOT NULL DEFAULT 0 CHECK (combo_before_answer >= 0),
  awarded_points      INTEGER NOT NULL DEFAULT 0 CHECK (awarded_points >= 0),
  answered_at         TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, question_number),
  UNIQUE (session_id, question_id)
);

CREATE TABLE active_game_sessions (
  id         UUID PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  version    INTEGER NOT NULL DEFAULT 0 CHECK (version >= 0),
  state      JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_questions_category_active
  ON questions (category_id)
  WHERE is_active;
CREATE INDEX idx_attempts_user ON question_attempts (user_id);
CREATE INDEX idx_attempts_user_category
  ON question_attempts (user_id, category_id);
CREATE INDEX idx_sessions_user_created
  ON game_sessions (user_id, created_at DESC);
CREATE INDEX idx_sessions_arcade_score
  ON game_sessions (final_score DESC)
  WHERE mode = 'ARCADE' AND status = 'completed';
CREATE INDEX idx_active_sessions_user ON active_game_sessions (user_id);
CREATE INDEX idx_active_sessions_expiry ON active_game_sessions (expires_at);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY categories_read ON categories
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY game_config_read ON game_config
  FOR SELECT TO authenticated
  USING (is_active);

CREATE POLICY sessions_select_own ON game_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY attempts_select_own ON question_attempts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- No browser policy exists for questions or active_game_sessions. Both contain
-- private answer/session state and are service-role only.
REVOKE ALL ON questions FROM anon, authenticated;
REVOKE ALL ON active_game_sessions FROM anon, authenticated;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_name TEXT;
BEGIN
  base_name := COALESCE(
    NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'username'), ''),
    NULLIF(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1), ''),
    'player'
  );

  INSERT INTO profiles (id, username)
  VALUES (
    NEW.id,
    LEFT(base_name, 48) || '-' || LEFT(NEW.id::TEXT, 8)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

INSERT INTO categories (
  id,
  display_name,
  grace_period_ms,
  sort_order,
  renderer_kind,
  ai_option_id,
  ai_option_label,
  non_ai_option_id,
  non_ai_option_label
)
VALUES
  ('image', 'AI Images', 1500, 1, 'image', 'ai', 'AI Generated', 'real', 'Real Photo'),
  ('email', 'Scam Emails', 2000, 2, 'email', 'scam', 'Scam', 'legit', 'Legitimate'),
  ('audio', 'Voice Audio', 5000, 3, 'audio', 'ai', 'AI Voice', 'human', 'Human Voice');

INSERT INTO game_config (version, is_active, note, config)
VALUES (
  1,
  TRUE,
  'Initial authoritative game balance',
  '{
    "modes": {
      "ARCADE": {
        "startingLives": 3,
        "scoringEnabled": true,
        "comboEnabled": true,
        "timeLimitEnabled": true,
        "gameOverWhenLivesReachZero": true,
        "detailedFeedbackEnabled": false
      },
      "TRAINING": {
        "startingLives": null,
        "scoringEnabled": false,
        "comboEnabled": false,
        "timeLimitEnabled": false,
        "gameOverWhenLivesReachZero": false,
        "detailedFeedbackEnabled": true
      }
    },
    "scoring": {
      "decayExponentBeta": 1.8,
      "comboMultipliers": [1, 1.5, 2, 2.5, 3, 4, 5],
      "timerSlackMs": 750
    },
    "difficultyTiers": [
      { "minQuestion": 1, "maxPoints": 100, "timerMs": 15000, "plateauMs": 1500, "alpha": 1.5 },
      { "minQuestion": 6, "maxPoints": 150, "timerMs": 10000, "plateauMs": 1000, "alpha": 2.5 },
      { "minQuestion": 16, "maxPoints": 200, "timerMs": 7000, "plateauMs": 500, "alpha": 4 },
      { "minQuestion": 31, "maxPoints": 300, "timerMs": 5000, "plateauMs": 200, "alpha": 6 }
    ],
    "xp": {
      "baseXpPerCorrect": 10,
      "comboBonusPerMaxCombo": 5,
      "runCompletionBonus": 50,
      "xpCurveBase": 100,
      "xpCurveExp": 1.5
    }
  }'::JSONB
);

CREATE OR REPLACE FUNCTION get_active_config()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    JSONB_BUILD_OBJECT('version', gc.version)
    || gc.config
    || JSONB_BUILD_OBJECT(
      'categories',
      COALESCE(
        (
          SELECT JSONB_OBJECT_AGG(
            c.id,
            JSONB_BUILD_OBJECT(
              'displayName', c.display_name,
              'gracePeriodMs', c.grace_period_ms,
              'isActive', c.is_active,
              'sortOrder', c.sort_order,
              'rendererKind', c.renderer_kind,
              'answerOptions', JSONB_BUILD_ARRAY(
                JSONB_BUILD_OBJECT('id', c.ai_option_id, 'label', c.ai_option_label),
                JSONB_BUILD_OBJECT('id', c.non_ai_option_id, 'label', c.non_ai_option_label)
              ),
              'aiOptionId', c.ai_option_id,
              'nonAiOptionId', c.non_ai_option_id
            )
          )
          FROM categories c
        ),
        '{}'::JSONB
      )
    )
  FROM game_config gc
  WHERE gc.is_active
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION get_active_config() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_active_config() TO service_role;

CREATE OR REPLACE FUNCTION cleanup_expired_game_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM active_game_sessions
  WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION cleanup_expired_game_sessions()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_game_sessions() TO service_role;

CREATE OR REPLACE FUNCTION calculate_attempt_score(
  p_config              JSONB,
  p_mode                TEXT,
  p_category_id         TEXT,
  p_question_number     INTEGER,
  p_response_time_ms    INTEGER,
  p_was_correct         BOOLEAN,
  p_combo_before_answer INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  mode_rules       JSONB := p_config -> 'modes' -> p_mode;
  tier             JSONB;
  timer_ms         INTEGER;
  timer_slack_ms   INTEGER;
  plateau_ms       INTEGER;
  max_points       INTEGER;
  alpha            NUMERIC;
  beta             NUMERIC;
  seconds_after    NUMERIC;
  base_points      INTEGER := 0;
  multiplier_index INTEGER;
  multiplier       NUMERIC := 1;
  awarded_points   INTEGER := 0;
  timed_out        BOOLEAN := FALSE;
BEGIN
  IF mode_rules IS NULL THEN
    RAISE EXCEPTION 'Missing mode configuration for %', p_mode;
  END IF;

  IF COALESCE((mode_rules ->> 'timeLimitEnabled')::BOOLEAN, FALSE) THEN
    SELECT value
    INTO tier
    FROM JSONB_ARRAY_ELEMENTS(p_config -> 'difficultyTiers')
    WHERE (value ->> 'minQuestion')::INTEGER <= p_question_number
    ORDER BY (value ->> 'minQuestion')::INTEGER DESC
    LIMIT 1;

    IF tier IS NULL THEN
      RAISE EXCEPTION 'No difficulty tier for question %', p_question_number;
    END IF;

    timer_ms := (tier ->> 'timerMs')::INTEGER;
    timer_slack_ms := (p_config #>> '{scoring,timerSlackMs}')::INTEGER;
    timed_out := p_response_time_ms > timer_ms + timer_slack_ms;

    IF p_was_correct AND NOT timed_out THEN
      max_points := (tier ->> 'maxPoints')::INTEGER;
      alpha := (tier ->> 'alpha')::NUMERIC;
      beta := (p_config #>> '{scoring,decayExponentBeta}')::NUMERIC;
      plateau_ms :=
        (tier ->> 'plateauMs')::INTEGER
        + (p_config -> 'categories' -> p_category_id ->> 'gracePeriodMs')::INTEGER;

      IF p_response_time_ms <= plateau_ms THEN
        base_points := max_points;
      ELSE
        seconds_after := (p_response_time_ms - plateau_ms) / 1000.0;
        base_points := GREATEST(
          0,
          ROUND(max_points - alpha * POWER(seconds_after, beta))::INTEGER
        );
      END IF;

      multiplier_index := LEAST(
        GREATEST(p_combo_before_answer, 0),
        JSONB_ARRAY_LENGTH(p_config #> '{scoring,comboMultipliers}') - 1
      );
      multiplier := (
        (p_config #> '{scoring,comboMultipliers}') ->> multiplier_index
      )::NUMERIC;
      awarded_points := ROUND(base_points * multiplier)::INTEGER;
    END IF;
  END IF;

  RETURN JSONB_BUILD_OBJECT(
    'timed_out', timed_out,
    'base_points', base_points,
    'combo_multiplier', multiplier,
    'awarded_points', awarded_points
  );
END;
$$;

REVOKE ALL ON FUNCTION calculate_attempt_score(
  JSONB, TEXT, TEXT, INTEGER, INTEGER, BOOLEAN, INTEGER
) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION persist_completed_game(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  state                  JSONB;
  config                 JSONB;
  completion             JSONB;
  attempt                JSONB;
  score_result           JSONB;
  stored_session         game_sessions%ROWTYPE;
  player                 profiles%ROWTYPE;
  user_id_value          UUID;
  mode_value             TEXT;
  status_value           TEXT;
  end_reason_value       TEXT;
  question_id_value      UUID;
  question_category      TEXT;
  selected_option        TEXT;
  ai_option              TEXT;
  non_ai_option          TEXT;
  question_is_ai         BOOLEAN;
  was_correct            BOOLEAN;
  timed_out              BOOLEAN;
  response_time_ms_value INTEGER;
  base_points_value      INTEGER;
  multiplier_value       NUMERIC;
  awarded_points_value   INTEGER;
  question_number_value  INTEGER;
  combo_value            INTEGER := 0;
  highest_combo_value    INTEGER := 0;
  score_value            INTEGER := 0;
  correct_value          INTEGER := 0;
  incorrect_value        INTEGER := 0;
  response_total         BIGINT := 0;
  attempts_value         INTEGER := 0;
  average_response_value INTEGER := 0;
  xp_value               INTEGER := 0;
  previous_level_value   INTEGER;
  previous_score_value   INTEGER;
  new_total_xp           INTEGER;
  new_level              INTEGER;
  new_streak             INTEGER;
  played_date            DATE;
  ordinal_value          BIGINT;
BEGIN
  SELECT ags.state
  INTO state
  FROM active_game_sessions ags
  WHERE ags.id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    SELECT *
    INTO stored_session
    FROM game_sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Game session % does not exist', p_session_id;
    END IF;

    SELECT *
    INTO player
    FROM profiles
    WHERE id = stored_session.user_id;

    RETURN JSONB_BUILD_OBJECT(
      'summary', JSONB_BUILD_OBJECT(
        'session_id', stored_session.id,
        'mode', stored_session.mode,
        'end_reason', stored_session.end_reason,
        'final_score', stored_session.final_score,
        'xp_earned', stored_session.xp_earned,
        'correct_count', stored_session.correct_count,
        'incorrect_count', stored_session.incorrect_count,
        'questions_answered', stored_session.questions_answered,
        'highest_combo', stored_session.highest_combo,
        'average_response_time_ms', stored_session.average_response_time_ms,
        'started_at', stored_session.started_at,
        'ended_at', stored_session.ended_at
      ),
      'profile', TO_JSONB(player),
      'previous_level', player.current_level,
      'previous_highest_score', player.highest_score
    );
  END IF;

  IF state ->> 'sessionId' <> p_session_id::TEXT THEN
    RAISE EXCEPTION 'Active-session identity mismatch';
  END IF;
  IF state ->> 'status' NOT IN ('completed', 'abandoned') THEN
    RAISE EXCEPTION 'Active session has not been finalized';
  END IF;

  user_id_value := (state ->> 'userId')::UUID;
  mode_value := state ->> 'mode';
  status_value := state ->> 'status';
  completion := state -> 'completion';
  config := state -> 'config';
  end_reason_value := completion ->> 'endReason';

  IF completion IS NULL THEN
    RAISE EXCEPTION 'Finalized session is missing completion data';
  END IF;
  IF mode_value NOT IN ('ARCADE', 'TRAINING') THEN
    RAISE EXCEPTION 'Invalid game mode';
  END IF;
  IF status_value = 'abandoned' AND end_reason_value <> 'abandoned' THEN
    RAISE EXCEPTION 'Abandoned state has an incompatible end reason';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM game_config
    WHERE version = (config ->> 'version')::INTEGER
  ) THEN
    RAISE EXCEPTION 'Session references an unknown configuration version';
  END IF;

  SELECT *
  INTO player
  FROM profiles
  WHERE id = user_id_value
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile does not exist for user %', user_id_value;
  END IF;

  previous_level_value := player.current_level;
  previous_score_value := player.highest_score;
  played_date := (completion ->> 'endedAt')::TIMESTAMPTZ::DATE;

  INSERT INTO game_sessions (
    id,
    user_id,
    mode,
    status,
    end_reason,
    config_version,
    categories_played,
    started_at,
    ended_at
  )
  VALUES (
    p_session_id,
    user_id_value,
    mode_value,
    status_value,
    end_reason_value,
    (config ->> 'version')::INTEGER,
    ARRAY(
      SELECT JSONB_ARRAY_ELEMENTS_TEXT(state -> 'enabledCategories')
    ),
    (completion ->> 'startedAt')::TIMESTAMPTZ,
    (completion ->> 'endedAt')::TIMESTAMPTZ
  );

  FOR attempt, ordinal_value IN
    SELECT value, ordinality
    FROM JSONB_ARRAY_ELEMENTS(state -> 'attempts') WITH ORDINALITY
  LOOP
    attempts_value := attempts_value + 1;
    question_number_value := (attempt ->> 'questionNumber')::INTEGER;
    IF question_number_value <> ordinal_value::INTEGER THEN
      RAISE EXCEPTION 'Attempt question numbers must be sequential';
    END IF;
    IF (attempt ->> 'comboBeforeAnswer')::INTEGER <> combo_value THEN
      RAISE EXCEPTION 'Attempt combo sequence is invalid';
    END IF;

    question_id_value := (attempt ->> 'questionId')::UUID;
    SELECT
      q.is_ai,
      q.category_id,
      c.ai_option_id,
      c.non_ai_option_id
    INTO
      question_is_ai,
      question_category,
      ai_option,
      non_ai_option
    FROM questions q
    JOIN categories c ON c.id = q.category_id
    WHERE q.id = question_id_value;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Attempt references an unknown question';
    END IF;
    IF question_category <> attempt ->> 'categoryId' THEN
      RAISE EXCEPTION 'Attempt category does not match its question';
    END IF;

    selected_option := attempt ->> 'selectedOptionId';
    IF selected_option NOT IN (ai_option, non_ai_option) THEN
      RAISE EXCEPTION 'Attempt contains an invalid option';
    END IF;
    was_correct := selected_option = CASE
      WHEN question_is_ai THEN ai_option
      ELSE non_ai_option
    END;
    response_time_ms_value := (attempt ->> 'responseTimeMs')::INTEGER;
    IF response_time_ms_value < 0 THEN
      RAISE EXCEPTION 'Response time cannot be negative';
    END IF;

    score_result := calculate_attempt_score(
      config,
      mode_value,
      question_category,
      question_number_value,
      response_time_ms_value,
      was_correct,
      combo_value
    );
    timed_out := (score_result ->> 'timed_out')::BOOLEAN;
    was_correct := was_correct AND NOT timed_out;
    base_points_value := (score_result ->> 'base_points')::INTEGER;
    multiplier_value := (score_result ->> 'combo_multiplier')::NUMERIC;
    awarded_points_value := (score_result ->> 'awarded_points')::INTEGER;

    IF was_correct <> (attempt ->> 'wasCorrect')::BOOLEAN
      OR timed_out <> (attempt ->> 'timedOut')::BOOLEAN
      OR base_points_value <> (attempt ->> 'basePoints')::INTEGER
      OR multiplier_value <> (attempt ->> 'comboMultiplier')::NUMERIC
      OR awarded_points_value <> (attempt ->> 'pointsAwarded')::INTEGER
    THEN
      RAISE EXCEPTION 'Attempt does not match authoritative rules';
    END IF;

    INSERT INTO question_attempts (
      id,
      session_id,
      user_id,
      question_id,
      category_id,
      question_number,
      selected_option_id,
      was_correct,
      timed_out,
      response_time_ms,
      base_points,
      combo_multiplier,
      combo_before_answer,
      awarded_points,
      answered_at
    )
    VALUES (
      (attempt ->> 'id')::UUID,
      p_session_id,
      user_id_value,
      question_id_value,
      question_category,
      question_number_value,
      selected_option,
      was_correct,
      timed_out,
      response_time_ms_value,
      base_points_value,
      multiplier_value,
      combo_value,
      awarded_points_value,
      (attempt ->> 'answeredAt')::TIMESTAMPTZ
    );

    score_value := score_value + awarded_points_value;
    response_total := response_total + response_time_ms_value;
    IF was_correct THEN
      correct_value := correct_value + 1;
      combo_value := combo_value + 1;
      highest_combo_value := GREATEST(highest_combo_value, combo_value);
    ELSE
      incorrect_value := incorrect_value + 1;
      combo_value := 0;
    END IF;
  END LOOP;

  average_response_value := CASE
    WHEN attempts_value = 0 THEN 0
    ELSE ROUND(response_total::NUMERIC / attempts_value)::INTEGER
  END;

  IF mode_value = 'ARCADE' THEN
    xp_value :=
      correct_value * (config #>> '{xp,baseXpPerCorrect}')::INTEGER
      + highest_combo_value * (config #>> '{xp,comboBonusPerMaxCombo}')::INTEGER
      + CASE
          WHEN end_reason_value <> 'abandoned'
            THEN (config #>> '{xp,runCompletionBonus}')::INTEGER
          ELSE 0
        END;
  END IF;

  IF score_value <> (completion ->> 'finalScore')::INTEGER
    OR xp_value <> (completion ->> 'xpEarned')::INTEGER
    OR correct_value <> (completion ->> 'correctCount')::INTEGER
    OR incorrect_value <> (completion ->> 'incorrectCount')::INTEGER
    OR attempts_value <> (completion ->> 'questionsAnswered')::INTEGER
    OR highest_combo_value <> (completion ->> 'highestCombo')::INTEGER
    OR average_response_value <> (completion ->> 'averageResponseTimeMs')::INTEGER
  THEN
    RAISE EXCEPTION 'Completion summary does not match authoritative attempts';
  END IF;

  UPDATE game_sessions
  SET
    final_score = score_value,
    xp_earned = xp_value,
    correct_count = correct_value,
    incorrect_count = incorrect_value,
    highest_combo = highest_combo_value,
    questions_answered = attempts_value,
    average_response_time_ms = average_response_value
  WHERE id = p_session_id
  RETURNING * INTO stored_session;

  new_total_xp := player.total_xp + xp_value;
  new_level := CASE
    WHEN new_total_xp <= 0 THEN 1
    ELSE GREATEST(
      1,
      FLOOR(
        POWER(
          new_total_xp::NUMERIC / (config #>> '{xp,xpCurveBase}')::NUMERIC,
          1.0 / (config #>> '{xp,xpCurveExp}')::NUMERIC
        )
      )::INTEGER + 1
    )
  END;

  IF player.last_played_at IS NULL
    OR player.last_played_at::DATE < played_date - 1
  THEN
    new_streak := 1;
  ELSIF player.last_played_at::DATE = played_date - 1 THEN
    new_streak := player.daily_streak + 1;
  ELSE
    new_streak := GREATEST(player.daily_streak, 1);
  END IF;

  UPDATE profiles
  SET
    total_xp = new_total_xp,
    current_level = new_level,
    highest_score = CASE
      WHEN mode_value = 'ARCADE' THEN GREATEST(highest_score, score_value)
      ELSE highest_score
    END,
    longest_combo = GREATEST(longest_combo, highest_combo_value),
    daily_streak = new_streak,
    longest_streak = GREATEST(longest_streak, new_streak),
    last_played_at = (completion ->> 'endedAt')::TIMESTAMPTZ,
    games_played = games_played + 1,
    arcade_games_played = arcade_games_played
      + CASE WHEN mode_value = 'ARCADE' THEN 1 ELSE 0 END,
    training_games_played = training_games_played
      + CASE WHEN mode_value = 'TRAINING' THEN 1 ELSE 0 END
  WHERE id = user_id_value
  RETURNING * INTO player;

  DELETE FROM active_game_sessions
  WHERE id = p_session_id;

  RETURN JSONB_BUILD_OBJECT(
    'summary', JSONB_BUILD_OBJECT(
      'session_id', stored_session.id,
      'mode', stored_session.mode,
      'end_reason', stored_session.end_reason,
      'final_score', stored_session.final_score,
      'xp_earned', stored_session.xp_earned,
      'correct_count', stored_session.correct_count,
      'incorrect_count', stored_session.incorrect_count,
      'questions_answered', stored_session.questions_answered,
      'highest_combo', stored_session.highest_combo,
      'average_response_time_ms', stored_session.average_response_time_ms,
      'started_at', stored_session.started_at,
      'ended_at', stored_session.ended_at
    ),
    'profile', TO_JSONB(player),
    'previous_level', previous_level_value,
    'previous_highest_score', previous_score_value
  );
END;
$$;

REVOKE ALL ON FUNCTION persist_completed_game(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION persist_completed_game(UUID) TO service_role;

CREATE OR REPLACE VIEW leaderboard
WITH (security_invoker = TRUE)
AS
SELECT
  p.id AS user_id,
  p.username AS display_name,
  p.highest_score,
  p.current_level,
  DENSE_RANK() OVER (ORDER BY p.highest_score DESC)::INTEGER AS rank
FROM profiles p
WHERE p.highest_score > 0;

REVOKE ALL ON leaderboard FROM PUBLIC, anon, authenticated;
GRANT SELECT ON leaderboard TO service_role;

INSERT INTO storage.buckets (id, name, public)
VALUES ('challenges', 'challenges', TRUE)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;
