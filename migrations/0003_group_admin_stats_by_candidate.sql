DROP FUNCTION IF EXISTS public.get_admin_trial_stats();

CREATE OR REPLACE FUNCTION public.get_admin_trial_stats()
RETURNS TABLE (
  stage_key TEXT,
  stage_title TEXT,
  item_id TEXT,
  item_title TEXT,
  candidate_id TEXT,
  total_ratings BIGINT,
  average_score NUMERIC,
  has_audio BOOLEAN
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  WITH grouped AS (
    SELECT
      stage_key,
      stage_title,
      item_id,
      item_title,
      MIN(item_position) AS item_position,
      candidate_id,
      COUNT(*) AS total_ratings,
      ROUND(AVG(score)::NUMERIC, 2) AS average_score,
      BOOL_OR(has_audio) AS has_audio
    FROM public.responses
    GROUP BY stage_key, stage_title, item_id, item_title, candidate_id
  )
  SELECT
    stage_key,
    stage_title,
    item_id,
    item_title,
    candidate_id,
    total_ratings,
    average_score,
    has_audio
  FROM grouped
  ORDER BY stage_key, item_position, candidate_id;
$$;
