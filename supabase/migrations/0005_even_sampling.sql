-- Bot Or Not — even per-category question sampling (Phase: post-launch tweak).
-- Distributes each fetched batch evenly across the selected categories
-- (quota = ceil(limit / #categories)) so a lopsided table (e.g. 40 emails vs 6 images)
-- doesn't skew the batch. If a small category has fewer than its quota, it simply
-- contributes fewer rows (running out is acceptable). SECURITY INVOKER; RLS still applies.
CREATE OR REPLACE FUNCTION sample_questions(
  p_categories TEXT[],
  p_limit      INTEGER,
  p_exclude    UUID[] DEFAULT '{}'
)
RETURNS SETOF questions
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH ranked AS (
    SELECT q.*,
           row_number() OVER (PARTITION BY q.category_id ORDER BY random()) AS rn
    FROM questions q
    WHERE q.is_active
      AND q.category_id = ANY (p_categories)
      AND NOT (q.id = ANY (p_exclude))
  ),
  quota AS (
    SELECT GREATEST(1, ceil(GREATEST(p_limit, 0)::numeric
             / GREATEST(array_length(p_categories, 1), 1))::int) AS per_cat
  )
  SELECT r.id, r.category_id, r.media_url, r.is_ai, r.difficulty_rating,
         r.explanation_text, r.is_active, r.metadata, r.created_at
  FROM ranked r, quota
  WHERE r.rn <= quota.per_cat
  ORDER BY r.rn, random()
  LIMIT GREATEST(p_limit, 0);
$$;
