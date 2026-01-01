-- Fix Social Functions Schema Mismatches
-- This migration fixes column/table name mismatches in social RPC functions:
-- 1. correct_picks -> correct_winner (actual column name in user_stats)
-- 2. fights -> bouts (actual table name)
-- 3. selected_fighter_id -> picked_corner (actual column in picks)
-- 4. fighter_a_id/fighter_b_id -> red/blue corner logic

-- Drop and recreate all social functions with correct schema

-- 1. Get Friends (fixed: correct_picks -> correct_winner)
DROP FUNCTION IF EXISTS get_friends();
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
    COALESCE(us.correct_winner, 0) AS correct_picks,
    CASE
      WHEN COALESCE(us.total_picks, 0) = 0 THEN 0
      ELSE ROUND((COALESCE(us.correct_winner, 0)::NUMERIC / us.total_picks::NUMERIC) * 100, 1)
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

-- 2. Get Friend Requests (fixed: correct_picks -> correct_winner)
DROP FUNCTION IF EXISTS get_friend_requests();
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
    COALESCE(us.correct_winner, 0) AS correct_picks,
    CASE
      WHEN COALESCE(us.total_picks, 0) = 0 THEN 0
      ELSE ROUND((COALESCE(us.correct_winner, 0)::NUMERIC / us.total_picks::NUMERIC) * 100, 1)
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

-- 3. Get Community Pick Percentages (fixed: fights -> bouts, corner-based logic)
DROP FUNCTION IF EXISTS get_community_pick_percentages(UUID);
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
    COUNT(*) FILTER (WHERE p.picked_corner = 'red')::BIGINT AS fighter_a_picks,
    COUNT(*) FILTER (WHERE p.picked_corner = 'blue')::BIGINT AS fighter_b_picks,
    CASE
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((COUNT(*) FILTER (WHERE p.picked_corner = 'red')::NUMERIC / COUNT(*)::NUMERIC) * 100, 1)
    END AS fighter_a_percentage,
    CASE
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((COUNT(*) FILTER (WHERE p.picked_corner = 'blue')::NUMERIC / COUNT(*)::NUMERIC) * 100, 1)
    END AS fighter_b_percentage
  FROM public.picks p
  LEFT JOIN public.privacy_settings ps ON ps.user_id = p.user_id
  WHERE
    p.bout_id = fight_id_input
    AND (ps.picks_visibility = 'public' OR ps.picks_visibility IS NULL);
END;
$$;

-- 4. Get Global Leaderboard (fixed: correct_picks -> correct_winner)
DROP FUNCTION IF EXISTS get_global_leaderboard(INTEGER);
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
    us.correct_winner AS correct_picks,
    CASE
      WHEN us.total_picks = 0 THEN 0
      ELSE ROUND((us.correct_winner::NUMERIC / us.total_picks::NUMERIC) * 100, 1)
    END AS accuracy,
    ROW_NUMBER() OVER (
      ORDER BY
        CASE
          WHEN us.total_picks = 0 THEN 0
          ELSE us.correct_winner::NUMERIC / us.total_picks::NUMERIC
        END DESC,
        us.total_picks DESC
    ) AS rank
  FROM public.user_stats us
  JOIN public.profiles p ON p.user_id = us.user_id
  LEFT JOIN public.privacy_settings ps ON ps.user_id = us.user_id
  WHERE
    (ps.stats_visibility = 'public' OR ps.stats_visibility IS NULL)
    AND us.total_picks > 0
  ORDER BY
    CASE
      WHEN us.total_picks = 0 THEN 0
      ELSE us.correct_winner::NUMERIC / us.total_picks::NUMERIC
    END DESC,
    us.total_picks DESC
  LIMIT limit_count;
END;
$$;

-- 5. Get Friends Leaderboard (fixed: correct_picks -> correct_winner)
DROP FUNCTION IF EXISTS get_friends_leaderboard();
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
  ),
  combined AS (
    -- Friends
    SELECT
      us.user_id,
      p.username,
      us.total_picks,
      us.correct_winner AS correct_picks,
      CASE
        WHEN us.total_picks = 0 THEN 0
        ELSE ROUND((us.correct_winner::NUMERIC / us.total_picks::NUMERIC) * 100, 1)
      END AS accuracy
    FROM public.user_stats us
    JOIN public.profiles p ON p.user_id = us.user_id
    JOIN friend_ids fi ON fi.friend_user_id = us.user_id

    UNION ALL

    -- Include the authenticated user themselves
    SELECT
      us.user_id,
      p.username,
      us.total_picks,
      us.correct_winner AS correct_picks,
      CASE
        WHEN us.total_picks = 0 THEN 0
        ELSE ROUND((us.correct_winner::NUMERIC / us.total_picks::NUMERIC) * 100, 1)
      END AS accuracy
    FROM public.user_stats us
    JOIN public.profiles p ON p.user_id = us.user_id
    WHERE us.user_id = auth.uid()
  )
  SELECT
    c.user_id,
    c.username,
    c.total_picks,
    c.correct_picks,
    c.accuracy,
    ROW_NUMBER() OVER (
      ORDER BY
        CASE
          WHEN c.total_picks = 0 THEN 0
          ELSE c.correct_picks::NUMERIC / c.total_picks::NUMERIC
        END DESC,
        c.total_picks DESC
    ) AS rank
  FROM combined c
  ORDER BY rank;
END;
$$;

-- Re-grant execute permissions
GRANT EXECUTE ON FUNCTION get_friends() TO authenticated;
GRANT EXECUTE ON FUNCTION get_friend_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION get_community_pick_percentages(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_global_leaderboard(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_friends_leaderboard() TO authenticated;

-- Update comments
COMMENT ON FUNCTION get_friends() IS 'Get all accepted friends for the authenticated user with their stats (uses correct_winner column)';
COMMENT ON FUNCTION get_friend_requests() IS 'Get all pending friend requests received by the authenticated user (uses correct_winner column)';
COMMENT ON FUNCTION get_community_pick_percentages(UUID) IS 'Get pick distribution percentages for a specific bout using picked_corner (red/blue)';
COMMENT ON FUNCTION get_global_leaderboard(INTEGER) IS 'Get global leaderboard of users with public or null stats visibility, ordered by accuracy then total picks';
COMMENT ON FUNCTION get_friends_leaderboard() IS 'Get leaderboard of authenticated users friends plus themselves (uses correct_winner column)';
