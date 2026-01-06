-- Fix posts functions v2 - use username instead of display_name

-- Fix get_posts_feed
CREATE OR REPLACE FUNCTION get_posts_feed(
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
  WHERE p.is_public = true
  ORDER BY p.engagement_score DESC, p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Fix get_post_with_comments
CREATE OR REPLACE FUNCTION get_post_with_comments(
  p_post_id UUID,
  p_comment_limit INTEGER DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'post', (
      SELECT json_build_object(
        'id', p.id,
        'user_id', p.user_id,
        'post_type', p.post_type,
        'event_id', p.event_id,
        'bout_id', p.bout_id,
        'title', p.title,
        'body', p.body,
        'like_count', p.like_count,
        'comment_count', p.comment_count,
        'engagement_score', p.engagement_score,
        'is_public', p.is_public,
        'created_at', p.created_at,
        'updated_at', p.updated_at,
        'author_username', pr.username,
        'author_display_name', pr.username,
        'author_avatar_url', pr.avatar_url,
        'event_name', e.name,
        'fighter_a_name', b.red_name,
        'fighter_b_name', b.blue_name,
        'images', (
          SELECT COALESCE(json_agg(json_build_object(
            'id', pi.id,
            'image_url', pi.image_url,
            'display_order', pi.display_order
          ) ORDER BY pi.display_order), '[]'::json)
          FROM public.post_images pi
          WHERE pi.post_id = p.id
        ),
        'user_has_liked', EXISTS (
          SELECT 1 FROM public.post_likes pl
          WHERE pl.post_id = p.id AND pl.user_id = auth.uid()
        )
      )
      FROM public.posts p
      LEFT JOIN public.profiles pr ON pr.user_id = p.user_id
      LEFT JOIN public.events e ON e.id = p.event_id
      LEFT JOIN public.bouts b ON b.id = p.bout_id
      WHERE p.id = p_post_id
    ),
    'comments', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', c.id,
          'post_id', c.post_id,
          'user_id', c.user_id,
          'parent_id', c.parent_id,
          'body', c.body,
          'like_count', c.like_count,
          'reply_count', c.reply_count,
          'depth', c.depth,
          'created_at', c.created_at,
          'updated_at', c.updated_at,
          'author_username', cp.username,
          'author_display_name', cp.username,
          'author_avatar_url', cp.avatar_url,
          'user_has_liked', EXISTS (
            SELECT 1 FROM public.comment_likes cl
            WHERE cl.comment_id = c.id AND cl.user_id = auth.uid()
          )
        )
        ORDER BY c.created_at ASC
      ), '[]'::json)
      FROM public.post_comments c
      LEFT JOIN public.profiles cp ON cp.user_id = c.user_id
      WHERE c.post_id = p_post_id
      LIMIT p_comment_limit
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Fix get_user_posts
CREATE OR REPLACE FUNCTION get_user_posts(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  post_type TEXT,
  title TEXT,
  body TEXT,
  like_count INTEGER,
  comment_count INTEGER,
  created_at TIMESTAMPTZ,
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
    p.title,
    p.body,
    p.like_count,
    p.comment_count,
    p.created_at,
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
  WHERE p.user_id = p_user_id AND p.is_public = true
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
