-- Add Social Functions
-- Sprint 2: Social Features (No Leagues)
--
-- This migration creates RPC functions for social features:
-- 1. get_friends() - Get all accepted friends
-- 2. get_friend_requests() - Get pending requests (received)
-- 3. get_community_pick_percentages() - Get pick distribution for a fight
-- 4. get_global_leaderboard() - Get top users globally
-- 5. get_friends_leaderboard() - Get friends leaderboard

-- 1. Get Friends
-- Returns all accepted friendships for the authenticated user with profile info
CREATE OR REPLACE FUNCTION get_friends()
RETURNS TABLE (
  friend_user_id UUID,
  username TEXT,
  total_picks INTEGER,
  correct_picks INTEGER,
  accuracy NUMERIC,
  became_friends_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN f.user_id = auth.uid() THEN f.friend_id
      ELSE f.user_id
    END AS friend_user_id,
    p.username,
    COALESCE(us.total_picks, 0) AS total_picks,
    COALESCE(us.correct_picks, 0) AS correct_picks,
    CASE
      WHEN COALESCE(us.total_picks, 0) = 0 THEN 0
      ELSE ROUND((COALESCE(us.correct_picks, 0)::NUMERIC / us.total_picks::NUMERIC) * 100, 1)
    END AS accuracy,
    f.updated_at AS became_friends_at
  FROM public.friendships f
  JOIN public.profiles p ON p.user_id = CASE
    WHEN f.user_id = auth.uid() THEN f.friend_id
    ELSE f.user_id
  END
  LEFT JOIN public.user_stats us ON us.user_id = p.user_id
  WHERE
    (f.user_id = auth.uid() OR f.friend_id = auth.uid())
    AND f.status = 'accepted'
  ORDER BY f.updated_at DESC;
END;
$$;

-- 2. Get Friend Requests
-- Returns pending friend requests received by the authenticated user
CREATE OR REPLACE FUNCTION get_friend_requests()
RETURNS TABLE (
  request_id UUID,
  from_user_id UUID,
  username TEXT,
  total_picks INTEGER,
  correct_picks INTEGER,
  accuracy NUMERIC,
  requested_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id AS request_id,
    f.user_id AS from_user_id,
    p.username,
    COALESCE(us.total_picks, 0) AS total_picks,
    COALESCE(us.correct_picks, 0) AS correct_picks,
    CASE
      WHEN COALESCE(us.total_picks, 0) = 0 THEN 0
      ELSE ROUND((COALESCE(us.correct_picks, 0)::NUMERIC / us.total_picks::NUMERIC) * 100, 1)
    END AS accuracy,
    f.created_at AS requested_at
  FROM public.friendships f
  JOIN public.profiles p ON p.user_id = f.user_id
  LEFT JOIN public.user_stats us ON us.user_id = f.user_id
  WHERE
    f.friend_id = auth.uid()
    AND f.status = 'pending'
  ORDER BY f.created_at DESC;
END;
$$;

-- 3. Get Community Pick Percentages
-- Returns pick distribution for a specific fight
CREATE OR REPLACE FUNCTION get_community_pick_percentages(fight_id_input UUID)
RETURNS TABLE (
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
    COUNT(*)::BIGINT AS total_picks,
    COUNT(*) FILTER (WHERE p.selected_fighter_id = f.fighter_a_id)::BIGINT AS fighter_a_picks,
    COUNT(*) FILTER (WHERE p.selected_fighter_id = f.fighter_b_id)::BIGINT AS fighter_b_picks,
    CASE
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((COUNT(*) FILTER (WHERE p.selected_fighter_id = f.fighter_a_id)::NUMERIC / COUNT(*)::NUMERIC) * 100, 1)
    END AS fighter_a_percentage,
    CASE
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((COUNT(*) FILTER (WHERE p.selected_fighter_id = f.fighter_b_id)::NUMERIC / COUNT(*)::NUMERIC) * 100, 1)
    END AS fighter_b_percentage
  FROM public.picks p
  JOIN public.fights f ON f.id = p.fight_id
  JOIN public.privacy_settings ps ON ps.user_id = p.user_id
  WHERE
    p.fight_id = fight_id_input
    AND ps.picks_visibility = 'public'
  GROUP BY f.fighter_a_id, f.fighter_b_id;
END;
$$;

-- 4. Get Global Leaderboard
-- Returns top users globally (only public stats)
CREATE OR REPLACE FUNCTION get_global_leaderboard(limit_count INTEGER DEFAULT 100)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  total_picks INTEGER,
  correct_picks INTEGER,
  accuracy NUMERIC,
  rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    us.user_id,
    p.username,
    us.total_picks,
    us.correct_picks,
    CASE
      WHEN us.total_picks = 0 THEN 0
      ELSE ROUND((us.correct_picks::NUMERIC / us.total_picks::NUMERIC) * 100, 1)
    END AS accuracy,
    ROW_NUMBER() OVER (
      ORDER BY
        CASE
          WHEN us.total_picks = 0 THEN 0
          ELSE us.correct_picks::NUMERIC / us.total_picks::NUMERIC
        END DESC,
        us.total_picks DESC
    ) AS rank
  FROM public.user_stats us
  JOIN public.profiles p ON p.user_id = us.user_id
  JOIN public.privacy_settings ps ON ps.user_id = us.user_id
  WHERE
    ps.stats_visibility = 'public'
    AND us.total_picks > 0
  ORDER BY
    CASE
      WHEN us.total_picks = 0 THEN 0
      ELSE us.correct_picks::NUMERIC / us.total_picks::NUMERIC
    END DESC,
    us.total_picks DESC
  LIMIT limit_count;
END;
$$;

-- 5. Get Friends Leaderboard
-- Returns leaderboard of authenticated user's friends
CREATE OR REPLACE FUNCTION get_friends_leaderboard()
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  total_picks INTEGER,
  correct_picks INTEGER,
  accuracy NUMERIC,
  rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH friend_ids AS (
    SELECT
      CASE
        WHEN f.user_id = auth.uid() THEN f.friend_id
        ELSE f.user_id
      END AS friend_user_id
    FROM public.friendships f
    WHERE
      (f.user_id = auth.uid() OR f.friend_id = auth.uid())
      AND f.status = 'accepted'
  )
  SELECT
    us.user_id,
    p.username,
    us.total_picks,
    us.correct_picks,
    CASE
      WHEN us.total_picks = 0 THEN 0
      ELSE ROUND((us.correct_picks::NUMERIC / us.total_picks::NUMERIC) * 100, 1)
    END AS accuracy,
    ROW_NUMBER() OVER (
      ORDER BY
        CASE
          WHEN us.total_picks = 0 THEN 0
          ELSE us.correct_picks::NUMERIC / us.total_picks::NUMERIC
        END DESC,
        us.total_picks DESC
    ) AS rank
  FROM public.user_stats us
  JOIN public.profiles p ON p.user_id = us.user_id
  JOIN friend_ids fi ON fi.friend_user_id = us.user_id
  WHERE us.total_picks > 0

  UNION ALL

  -- Include the authenticated user themselves
  SELECT
    us.user_id,
    p.username,
    us.total_picks,
    us.correct_picks,
    CASE
      WHEN us.total_picks = 0 THEN 0
      ELSE ROUND((us.correct_picks::NUMERIC / us.total_picks::NUMERIC) * 100, 1)
    END AS accuracy,
    0 AS rank  -- Will be recalculated in outer query
  FROM public.user_stats us
  JOIN public.profiles p ON p.user_id = us.user_id
  WHERE us.user_id = auth.uid()

  ORDER BY
    CASE
      WHEN total_picks = 0 THEN 0
      ELSE correct_picks::NUMERIC / total_picks::NUMERIC
    END DESC,
    total_picks DESC;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_friends() TO authenticated;
GRANT EXECUTE ON FUNCTION get_friend_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION get_community_pick_percentages(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_global_leaderboard(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_friends_leaderboard() TO authenticated;

-- Comments
COMMENT ON FUNCTION get_friends() IS 'Get all accepted friends for the authenticated user with their stats';
COMMENT ON FUNCTION get_friend_requests() IS 'Get all pending friend requests received by the authenticated user';
COMMENT ON FUNCTION get_community_pick_percentages(UUID) IS 'Get pick distribution percentages for a specific fight (public picks only)';
COMMENT ON FUNCTION get_global_leaderboard(INTEGER) IS 'Get global leaderboard of users with public stats, ordered by accuracy then total picks';
COMMENT ON FUNCTION get_friends_leaderboard() IS 'Get leaderboard of authenticated users friends plus themselves';
