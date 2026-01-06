-- Fix feed functions to use correct blocks table column names
-- blocks table has: blocker_id, blocked_id (not user_id, blocked_user_id)

DROP FUNCTION IF EXISTS get_discover_feed(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_following_feed(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_trending_users(INTEGER);

-- Recreate get_discover_feed with correct blocks column names
CREATE OR REPLACE FUNCTION get_discover_feed(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  activity_type TEXT,
  title TEXT,
  description TEXT,
  metadata JSONB,
  engagement_score INTEGER,
  like_count INTEGER,
  is_liked BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cur_user_id UUID;
BEGIN
  cur_user_id := auth.uid();

  RETURN QUERY
  SELECT
    a.id,
    a.user_id,
    p.username,
    p.avatar_url,
    a.type AS activity_type,
    COALESCE(a.metadata->>'title', a.type) AS title,
    COALESCE(a.metadata->>'description', '') AS description,
    a.metadata,
    COALESCE(a.engagement_score, 0)::INTEGER AS engagement_score,
    COALESCE(a.like_count, 0)::INTEGER AS like_count,
    EXISTS (
      SELECT 1 FROM public.activity_likes al
      WHERE al.activity_id = a.id AND al.user_id = cur_user_id
    ) AS is_liked,
    a.created_at
  FROM public.activities a
  JOIN public.profiles p ON p.user_id = a.user_id
  WHERE 1=1
    -- Exclude blocked users (using correct column names)
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = cur_user_id AND b.blocked_id = a.user_id)
         OR (b.blocked_id = cur_user_id AND b.blocker_id = a.user_id)
    )
    -- Exclude muted users
    AND NOT EXISTS (
      SELECT 1 FROM public.mutes m
      WHERE m.user_id = cur_user_id AND m.muted_user_id = a.user_id
    )
  ORDER BY a.engagement_score DESC NULLS LAST, a.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_discover_feed(INTEGER, INTEGER) TO authenticated;

-- Recreate get_following_feed with correct blocks column names
CREATE OR REPLACE FUNCTION get_following_feed(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  activity_type TEXT,
  title TEXT,
  description TEXT,
  metadata JSONB,
  engagement_score INTEGER,
  like_count INTEGER,
  is_liked BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cur_user_id UUID;
BEGIN
  cur_user_id := auth.uid();

  IF cur_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.user_id,
    p.username,
    p.avatar_url,
    a.type AS activity_type,
    COALESCE(a.metadata->>'title', a.type) AS title,
    COALESCE(a.metadata->>'description', '') AS description,
    a.metadata,
    COALESCE(a.engagement_score, 0)::INTEGER AS engagement_score,
    COALESCE(a.like_count, 0)::INTEGER AS like_count,
    EXISTS (
      SELECT 1 FROM public.activity_likes al
      WHERE al.activity_id = a.id AND al.user_id = cur_user_id
    ) AS is_liked,
    a.created_at
  FROM public.activities a
  JOIN public.profiles p ON p.user_id = a.user_id
  WHERE a.user_id IN (
    SELECT friend_id FROM public.friendships
    WHERE user_id = cur_user_id AND status = 'accepted'
  )
  -- Exclude muted users (even if following)
  AND NOT EXISTS (
    SELECT 1 FROM public.mutes m
    WHERE m.user_id = cur_user_id AND m.muted_user_id = a.user_id
  )
  ORDER BY a.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_following_feed(INTEGER, INTEGER) TO authenticated;

-- Recreate get_trending_users with correct blocks column names
CREATE OR REPLACE FUNCTION get_trending_users(p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  total_picks INTEGER,
  correct_picks INTEGER,
  accuracy NUMERIC,
  current_streak INTEGER,
  recent_score NUMERIC,
  is_following BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cur_user_id UUID;
BEGIN
  cur_user_id := auth.uid();

  RETURN QUERY
  WITH recent_performance AS (
    SELECT
      p.user_id,
      p.username,
      p.avatar_url,
      COUNT(pk.id)::INTEGER AS total_picks,
      COUNT(pk.id) FILTER (WHERE pk.status = 'correct')::INTEGER AS correct_picks,
      CASE
        WHEN COUNT(pk.id) > 0 THEN
          ROUND((COUNT(pk.id) FILTER (WHERE pk.status = 'correct')::NUMERIC / COUNT(pk.id)) * 100, 1)
        ELSE 0
      END AS accuracy,
      COALESCE(us.current_streak, 0)::INTEGER AS current_streak,
      (
        COUNT(pk.id) * 10 +
        COUNT(pk.id) FILTER (WHERE pk.status = 'correct') * 20 +
        COALESCE(us.current_streak, 0) * 5
      )::NUMERIC AS recent_score
    FROM public.profiles p
    LEFT JOIN public.picks pk ON pk.user_id = p.user_id
      AND pk.created_at > NOW() - INTERVAL '30 days'
      AND pk.status IN ('correct', 'incorrect')
    LEFT JOIN public.user_stats us ON us.user_id = p.user_id
    WHERE p.user_id != cur_user_id
      -- Exclude blocked users (using correct column names)
      AND NOT EXISTS (
        SELECT 1 FROM public.blocks b
        WHERE (b.blocker_id = cur_user_id AND b.blocked_id = p.user_id)
           OR (b.blocked_id = cur_user_id AND b.blocker_id = p.user_id)
      )
      -- Exclude muted users
      AND NOT EXISTS (
        SELECT 1 FROM public.mutes m
        WHERE m.user_id = cur_user_id AND m.muted_user_id = p.user_id
      )
    GROUP BY p.user_id, p.username, p.avatar_url, us.current_streak
    HAVING COUNT(pk.id) >= 3
  )
  SELECT
    rp.user_id,
    rp.username,
    rp.avatar_url,
    rp.total_picks,
    rp.correct_picks,
    rp.accuracy,
    rp.current_streak,
    rp.recent_score,
    EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.user_id = cur_user_id
        AND f.friend_id = rp.user_id
        AND f.status = 'accepted'
    ) AS is_following
  FROM recent_performance rp
  ORDER BY rp.recent_score DESC, rp.accuracy DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_trending_users(INTEGER) TO authenticated;
