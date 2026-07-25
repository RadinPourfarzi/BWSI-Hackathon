-- Bot Or Not — random question sampling RPC (Phase 5).
-- PostgREST can't ORDER BY random(), so expose a sampling function. Runs as the caller
-- (SECURITY INVOKER); the questions_read RLS policy restricts to active rows.

CREATE OR REPLACE FUNCTION sample_questions(
  p_categories TEXT[],
  p_limit      INTEGER,
  p_exclude    UUID[] DEFAULT '{}'
)
RETURNS SETOF questions
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT *
  FROM questions
  WHERE is_active
    AND category_id = ANY (p_categories)
    AND NOT (id = ANY (p_exclude))
  ORDER BY random()
  LIMIT GREATEST(p_limit, 0);
$$;

REVOKE ALL ON FUNCTION sample_questions(TEXT[], INTEGER, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION sample_questions(TEXT[], INTEGER, UUID[]) TO authenticated;
