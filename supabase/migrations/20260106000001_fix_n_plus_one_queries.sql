-- Fix N+1 Query Issues
-- Creates optimized RPC functions to batch database queries
--
-- Functions:
-- 1. get_admin_users_with_stats - Fetch users with pick/report stats in single query
-- 2. get_batch_community_pick_percentages - Fetch pick percentages for multiple fights

-- ============================================================================
-- ADMIN USERS WITH STATS
-- Replaces N+1 pattern in useAdminUserSearch hook
-- ============================================================================

CREATE OR REPLACE FUNCTION get_admin_users_with_stats(
  search_term TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  total_picks BIGINT,
  correct_picks BIGINT,
  is_banned BOOLEAN,
  report_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id AS id,
    p.username,
    p.avatar_url,
    p.created_at,
    COALESCE(pick_stats.total_picks, 0) AS total_picks,
    COALESCE(pick_stats.correct_picks, 0) AS correct_picks,
    COALESCE(p.bio LIKE '[BANNED:%', false) AS is_banned,
    COALESCE(report_stats.report_count, 0) AS report_count
  FROM public.profiles p
  LEFT JOIN (
    -- Aggregate pick stats per user
    SELECT
      pk.user_id,
      COUNT(*)::BIGINT AS total_picks,
      COUNT(*) FILTER (WHERE pk.is_correct = true)::BIGINT AS correct_picks
    FROM public.picks pk
    GROUP BY pk.user_id
  ) pick_stats ON pick_stats.user_id = p.user_id
  LEFT JOIN (
    -- Aggregate report counts per user
    SELECT
      r.reported_user_id,
      COUNT(*)::BIGINT AS report_count
    FROM public.reports r
    GROUP BY r.reported_user_id
  ) report_stats ON report_stats.reported_user_id = p.user_id
  WHERE
    -- Apply search filter if provided
    (search_term IS NULL OR search_term = '' OR p.username ILIKE '%' || search_term || '%')
  ORDER BY p.created_at DESC
  LIMIT limit_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_users_with_stats(TEXT, INTEGER) TO authenticated;

COMMENT ON FUNCTION get_admin_users_with_stats(TEXT, INTEGER) IS
  'Admin-only function to fetch users with aggregated pick and report stats in a single query';

-- ============================================================================
-- BATCH COMMUNITY PICK PERCENTAGES
-- Replaces N+1 pattern in useEventCommunityPercentages hook
-- ============================================================================

CREATE OR REPLACE FUNCTION get_batch_community_pick_percentages(fight_ids UUID[])
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
    f.id AS fight_id,
    COUNT(p.id)::BIGINT AS total_picks,
    COUNT(p.id) FILTER (WHERE p.selected_fighter_id = f.fighter_a_id)::BIGINT AS fighter_a_picks,
    COUNT(p.id) FILTER (WHERE p.selected_fighter_id = f.fighter_b_id)::BIGINT AS fighter_b_picks,
    CASE
      WHEN COUNT(p.id) = 0 THEN 0
      ELSE ROUND((COUNT(p.id) FILTER (WHERE p.selected_fighter_id = f.fighter_a_id)::NUMERIC / COUNT(p.id)::NUMERIC) * 100, 1)
    END AS fighter_a_percentage,
    CASE
      WHEN COUNT(p.id) = 0 THEN 0
      ELSE ROUND((COUNT(p.id) FILTER (WHERE p.selected_fighter_id = f.fighter_b_id)::NUMERIC / COUNT(p.id)::NUMERIC) * 100, 1)
    END AS fighter_b_percentage
  FROM unnest(fight_ids) AS input_fight_id
  JOIN public.fights f ON f.id = input_fight_id
  LEFT JOIN public.picks p ON p.fight_id = f.id
  LEFT JOIN public.privacy_settings ps ON ps.user_id = p.user_id AND ps.picks_visibility = 'public'
  WHERE
    -- Only count picks from users with public picks visibility
    (p.id IS NULL OR ps.user_id IS NOT NULL)
  GROUP BY f.id, f.fighter_a_id, f.fighter_b_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_batch_community_pick_percentages(UUID[]) TO authenticated;

COMMENT ON FUNCTION get_batch_community_pick_percentages(UUID[]) IS
  'Fetch community pick percentages for multiple fights in a single query';
