-- Bot Or Not — security/performance hardening follow-up (Phase 4)
-- Applied after advisor review. Idempotent.

-- Set immutable search_path on the two remaining functions (advisor: function_search_path_mutable).
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION score_attempt(
  p_config       JSONB,
  p_category_id  TEXT,
  p_grace_ms     INTEGER,
  p_question_idx INTEGER,
  p_response_ms  INTEGER,
  p_is_correct   BOOLEAN,
  p_combo        INTEGER
)
RETURNS INTEGER LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
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

  v_idx := LEAST(GREATEST(p_combo - 1, 0), jsonb_array_length(v_mults) - 1);
  RETURN GREATEST(0, round(v_s * (v_mults ->> v_idx)::numeric))::int;
END;
$$;

-- handle_new_user is a trigger-only function; it must not be a callable RPC
-- (advisor: anon/authenticated_security_definer_function_executable).
REVOKE ALL ON FUNCTION handle_new_user() FROM PUBLIC, anon, authenticated;

-- Sensitive RPCs: authenticated only (no guest mode). Explicitly revoke anon.
REVOKE ALL ON FUNCTION submit_run(TEXT, TEXT[], JSONB) FROM anon;
REVOKE ALL ON FUNCTION get_active_config() FROM anon;

-- Covering indexes for question_attempts foreign keys (advisor: unindexed_foreign_keys).
CREATE INDEX IF NOT EXISTS idx_attempts_question ON question_attempts (question_id);
CREATE INDEX IF NOT EXISTS idx_attempts_category ON question_attempts (category_id);
