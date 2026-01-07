-- Fix get_following_posts_feed_for_user to use friendships table instead of follows

CREATE OR REPLACE FUNCTION get_following_posts_feed_for_user(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  post_type TEXT,
  event_id UUID,
  bout_id UUID,
  title TEXT,
  body TEXT,
  like_count INTEGER,
  comment_count INTEGER,
  engagement_score NUMERIC,
  is_public BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  author_username TEXT,
  author_display_name TEXT,
  author_avatar_url TEXT,
  event_name TEXT,
  fighter_a_name TEXT,
  fighter_b_name TEXT,
  images JSON,
  user_has_liked BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.post_type,
    p.event_id,
    p.bout_id,
    p.title,
    p.body,
    p.like_count,
    p.comment_count,
    p.engagement_score,
    p.is_public,
    p.created_at,
    p.updated_at,
    pr.username AS author_username,
    pr.username AS author_display_name,
    pr.avatar_url AS author_avatar_url,
    e.name AS event_name,
    b.red_name AS fighter_a_name,
    b.blue_name AS fighter_b_name,
    (
      SELECT COALESCE(json_agg(json_build_object(
        'id', pi.id,
        'image_url', pi.image_url,
        'display_order', pi.display_order
      ) ORDER BY pi.display_order), '[]'::json)
      FROM public.post_images pi
      WHERE pi.post_id = p.id
    ) AS images,
    EXISTS (
      SELECT 1 FROM public.post_likes pl
      WHERE pl.post_id = p.id AND pl.user_id = auth.uid()
    ) AS user_has_liked
  FROM public.posts p
  LEFT JOIN public.profiles pr ON pr.user_id = p.user_id
  LEFT JOIN public.events e ON e.id = p.event_id
  LEFT JOIN public.bouts b ON b.id = p.bout_id
  WHERE p.user_id IN (
    -- Get friends where user is either user_id or friend_id with accepted status
    SELECT f.friend_id FROM public.friendships f
    WHERE f.user_id = p_user_id AND f.status = 'accepted'
    UNION
    SELECT f.user_id FROM public.friendships f
    WHERE f.friend_id = p_user_id AND f.status = 'accepted'
  )
  OR p.user_id = p_user_id
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_following_posts_feed_for_user(UUID, INTEGER, INTEGER) TO authenticated;
