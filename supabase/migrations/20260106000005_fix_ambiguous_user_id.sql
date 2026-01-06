-- Fix ambiguous user_id reference in get_following_feed

DROP FUNCTION IF EXISTS get_following_feed(INTEGER, INTEGER);

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
    SELECT f.friend_id FROM public.friendships f
    WHERE f.user_id = cur_user_id AND f.status = 'accepted'
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
