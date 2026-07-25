-- Bot Or Not — analytics read RPCs (Phase 6).
-- All SECURITY INVOKER: RLS owner policies restrict every query to the caller's own rows.
-- Read-only + additive. Grants: authenticated only.

-- Overall summary metrics for the current user.
CREATE OR REPLACE FUNCTION get_user_stats()
RETURNS JSONB
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'totalAttempts', COALESCE(count(a.*), 0),
    'correct',       COALESCE(count(a.*) FILTER (WHERE a.is_correct), 0),
    'accuracyPct',   COALESCE(round(100.0 * count(a.*) FILTER (WHERE a.is_correct)
                       / NULLIF(count(a.*), 0), 1), 0),
    'avgResponseMs', COALESCE(round(avg(a.response_time_ms)), 0),
    'bestScore',     COALESCE((SELECT max(final_score) FROM game_sessions WHERE mode = 'ARCADE'), 0),
    'longestCombo',  COALESCE((SELECT max(max_combo) FROM game_sessions), 0),
    'gamesArcade',   (SELECT count(*) FROM game_sessions WHERE mode = 'ARCADE'),
    'gamesTraining', (SELECT count(*) FROM game_sessions WHERE mode = 'TRAINING')
  )
  FROM question_attempts a;
$$;

-- Per-category performance matrix for the current user.
CREATE OR REPLACE FUNCTION get_category_stats()
RETURNS TABLE (category_id TEXT, attempts BIGINT, accuracy_pct NUMERIC, avg_speed_ms NUMERIC)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT a.category_id,
         count(*) AS attempts,
         round(100.0 * count(*) FILTER (WHERE a.is_correct) / NULLIF(count(*), 0), 1) AS accuracy_pct,
         round(avg(a.response_time_ms)) AS avg_speed_ms
  FROM question_attempts a
  GROUP BY a.category_id
  ORDER BY a.category_id;
$$;

-- Daily accuracy + response-speed trends for the current user.
CREATE OR REPLACE FUNCTION get_daily_trends()
RETURNS TABLE (day DATE, accuracy_pct NUMERIC, avg_speed_ms NUMERIC)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT a.created_at::date AS day,
         round(100.0 * count(*) FILTER (WHERE a.is_correct) / NULLIF(count(*), 0), 1) AS accuracy_pct,
         round(avg(a.response_time_ms)) AS avg_speed_ms
  FROM question_attempts a
  GROUP BY a.created_at::date
  ORDER BY a.created_at::date;
$$;

REVOKE ALL ON FUNCTION get_user_stats()     FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION get_category_stats() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION get_daily_trends()   FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_user_stats()     TO authenticated;
GRANT EXECUTE ON FUNCTION get_category_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_trends()   TO authenticated;
