-- Fix get_batch_community_pick_percentages - use bouts table not fights, and picked_corner instead of fighter_id

DROP FUNCTION IF EXISTS get_batch_community_pick_percentages(UUID[]);

CREATE OR REPLACE FUNCTION get_batch_community_pick_percentages(bout_ids UUID[])
RETURNS TABLE (
  fight_id UUID,
  total_picks BIGINT,
  fighter_a_picks BIGINT,
  fighter_b_picks BIGINT,
  fighter_a_percentage NUMERIC,
  fighter_b_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id AS fight_id,
    COUNT(p.id)::BIGINT AS total_picks,
    COUNT(p.id) FILTER (WHERE p.picked_corner = 'red')::BIGINT AS fighter_a_picks,
    COUNT(p.id) FILTER (WHERE p.picked_corner = 'blue')::BIGINT AS fighter_b_picks,
    CASE
      WHEN COUNT(p.id) = 0 THEN 0
      ELSE ROUND((COUNT(p.id) FILTER (WHERE p.picked_corner = 'red')::NUMERIC / COUNT(p.id)::NUMERIC) * 100, 1)
    END AS fighter_a_percentage,
    CASE
      WHEN COUNT(p.id) = 0 THEN 0
      ELSE ROUND((COUNT(p.id) FILTER (WHERE p.picked_corner = 'blue')::NUMERIC / COUNT(p.id)::NUMERIC) * 100, 1)
    END AS fighter_b_percentage
  FROM unnest(bout_ids) AS input_bout_id
  JOIN public.bouts b ON b.id = input_bout_id
  LEFT JOIN public.picks p ON p.bout_id = b.id
  GROUP BY b.id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_batch_community_pick_percentages(UUID[]) TO authenticated;

COMMENT ON FUNCTION get_batch_community_pick_percentages(UUID[]) IS
  'Fetch community pick percentages for multiple bouts in a single query';
