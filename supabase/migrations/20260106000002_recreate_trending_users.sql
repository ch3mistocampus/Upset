-- Recreate get_trending_users function (was dropped in migration 5 but not recreated)

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
    -- Get users with recent activity (last 30 days)
    SELECT
      p.user_id,
      p.username,
      p.avatar_url,
      COUNT(pk.id)::INTEGER AS total_picks,
      COUNT(pk.id) FILTER (WHERE pk.is_correct = true)::INTEGER AS correct_picks,
      CASE
        WHEN COUNT(pk.id) > 0 THEN
          ROUND((COUNT(pk.id) FILTER (WHERE pk.is_correct = true)::NUMERIC / COUNT(pk.id)) * 100, 1)
        ELSE 0
      END AS accuracy,
      COALESCE(us.current_streak, 0)::INTEGER AS current_streak,
      -- Score: recent activity + accuracy + streak bonus
      (
        COUNT(pk.id) * 10 +
        COUNT(pk.id) FILTER (WHERE pk.is_correct = true) * 20 +
        COALESCE(us.current_streak, 0) * 5
      )::NUMERIC AS recent_score
    FROM public.profiles p
    LEFT JOIN public.picks pk ON pk.user_id = p.user_id
      AND pk.created_at > NOW() - INTERVAL '30 days'
      AND pk.is_correct IS NOT NULL
    LEFT JOIN public.user_stats us ON us.user_id = p.user_id
    WHERE p.user_id != cur_user_id
      -- Exclude blocked users
      AND NOT EXISTS (
        SELECT 1 FROM public.blocks b
        WHERE (b.user_id = cur_user_id AND b.blocked_user_id = p.user_id)
           OR (b.blocked_user_id = cur_user_id AND b.user_id = p.user_id)
      )
      -- Exclude muted users
      AND NOT EXISTS (
        SELECT 1 FROM public.mutes m
        WHERE m.user_id = cur_user_id AND m.muted_user_id = p.user_id
      )
    GROUP BY p.user_id, p.username, p.avatar_url, us.current_streak
    HAVING COUNT(pk.id) >= 5  -- Minimum 5 picks to be trending
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
