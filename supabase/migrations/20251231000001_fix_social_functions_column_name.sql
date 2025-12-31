-- Fix Social Functions: correct_picks -> correct_winner
-- The user_stats table uses 'correct_winner' not 'correct_picks'

-- 1. Fix get_friends function
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

-- 2. Fix get_friend_requests function
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

-- 3. Fix get_global_leaderboard function
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
  JOIN public.privacy_settings ps ON ps.user_id = us.user_id
  WHERE
    ps.stats_visibility = 'public'
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

-- 4. Fix get_friends_leaderboard function
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
  JOIN friend_ids fi ON fi.friend_user_id = us.user_id
  WHERE us.total_picks > 0

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
    END AS accuracy,
    0 AS rank
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
