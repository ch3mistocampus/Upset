-- Phase 2.2: Eliminate N+1 queries in feed functions
-- Use CTEs and lateral joins to aggregate data in single passes

-- Optimized get_posts_feed using CTEs
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
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  WITH
  -- Pre-fetch the posts we need (apply pagination first for efficiency)
  paginated_posts AS (
    SELECT p.*
    FROM public.posts p
    WHERE p.is_public = true
    ORDER BY p.engagement_score DESC, p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ),
  -- Pre-aggregate all images for selected posts in one query
  post_images_agg AS (
    SELECT
      pi.post_id,
      COALESCE(json_agg(json_build_object(
        'id', pi.id,
        'image_url', pi.image_url,
        'display_order', pi.display_order
      ) ORDER BY pi.display_order), '[]'::json) AS images
    FROM public.post_images pi
    WHERE pi.post_id IN (SELECT pp.id FROM paginated_posts pp)
    GROUP BY pi.post_id
  ),
  -- Pre-fetch user likes for all posts in one query (if user is logged in)
  user_likes AS (
    SELECT pl.post_id
    FROM public.post_likes pl
    WHERE pl.user_id = v_user_id
      AND pl.post_id IN (SELECT pp.id FROM paginated_posts pp)
  )
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
    pr.display_name AS author_display_name,
    pr.avatar_url AS author_avatar_url,
    e.name AS event_name,
    fa.name AS fighter_a_name,
    fb.name AS fighter_b_name,
    COALESCE(pia.images, '[]'::json) AS images,
    EXISTS (SELECT 1 FROM user_likes ul WHERE ul.post_id = p.id) AS user_has_liked
  FROM paginated_posts p
  LEFT JOIN public.profiles pr ON pr.user_id = p.user_id
  LEFT JOIN public.events e ON e.id = p.event_id
  LEFT JOIN public.bouts b ON b.id = p.bout_id
  LEFT JOIN public.fighters fa ON fa.id = b.fighter_a_id
  LEFT JOIN public.fighters fb ON fb.id = b.fighter_b_id
  LEFT JOIN post_images_agg pia ON pia.post_id = p.id
  ORDER BY p.engagement_score DESC, p.created_at DESC;
END;
$$;

-- Optimized get_post_with_comments using CTEs
CREATE OR REPLACE FUNCTION get_post_with_comments(
  p_post_id UUID,
  p_comment_limit INTEGER DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSON;
  v_user_id UUID := auth.uid();
BEGIN
  WITH
  -- Get post images in one query
  post_images_agg AS (
    SELECT
      COALESCE(json_agg(json_build_object(
        'id', pi.id,
        'image_url', pi.image_url,
        'display_order', pi.display_order
      ) ORDER BY pi.display_order), '[]'::json) AS images
    FROM public.post_images pi
    WHERE pi.post_id = p_post_id
  ),
  -- Get all comment IDs first
  comment_ids AS (
    SELECT c.id
    FROM public.post_comments c
    WHERE c.post_id = p_post_id
    ORDER BY c.created_at ASC
    LIMIT p_comment_limit
  ),
  -- Pre-fetch user likes for all comments in one query
  user_comment_likes AS (
    SELECT cl.comment_id
    FROM public.comment_likes cl
    WHERE cl.user_id = v_user_id
      AND cl.comment_id IN (SELECT ci.id FROM comment_ids ci)
  )
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
        'author_display_name', pr.display_name,
        'author_avatar_url', pr.avatar_url,
        'event_name', e.name,
        'fighter_a_name', fa.name,
        'fighter_b_name', fb.name,
        'images', (SELECT images FROM post_images_agg),
        'user_has_liked', EXISTS (
          SELECT 1 FROM public.post_likes pl
          WHERE pl.post_id = p.id AND pl.user_id = v_user_id
        )
      )
      FROM public.posts p
      LEFT JOIN public.profiles pr ON pr.user_id = p.user_id
      LEFT JOIN public.events e ON e.id = p.event_id
      LEFT JOIN public.bouts b ON b.id = p.bout_id
      LEFT JOIN public.fighters fa ON fa.id = b.fighter_a_id
      LEFT JOIN public.fighters fb ON fb.id = b.fighter_b_id
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
          'author_display_name', cp.display_name,
          'author_avatar_url', cp.avatar_url,
          'user_has_liked', EXISTS (
            SELECT 1 FROM user_comment_likes ucl WHERE ucl.comment_id = c.id
          )
        )
        ORDER BY c.created_at ASC
      ), '[]'::json)
      FROM public.post_comments c
      LEFT JOIN public.profiles cp ON cp.user_id = c.user_id
      WHERE c.id IN (SELECT ci.id FROM comment_ids ci)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Optimized get_user_posts using CTEs
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
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  WITH
  -- Pre-fetch the posts we need
  paginated_posts AS (
    SELECT p.*
    FROM public.posts p
    WHERE p.user_id = p_user_id AND p.is_public = true
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ),
  -- Pre-aggregate images
  post_images_agg AS (
    SELECT
      pi.post_id,
      COALESCE(json_agg(json_build_object(
        'id', pi.id,
        'image_url', pi.image_url,
        'display_order', pi.display_order
      ) ORDER BY pi.display_order), '[]'::json) AS images
    FROM public.post_images pi
    WHERE pi.post_id IN (SELECT pp.id FROM paginated_posts pp)
    GROUP BY pi.post_id
  ),
  -- Pre-fetch user likes
  user_likes AS (
    SELECT pl.post_id
    FROM public.post_likes pl
    WHERE pl.user_id = v_current_user_id
      AND pl.post_id IN (SELECT pp.id FROM paginated_posts pp)
  )
  SELECT
    p.id,
    p.user_id,
    p.post_type,
    p.title,
    p.body,
    p.like_count,
    p.comment_count,
    p.created_at,
    COALESCE(pia.images, '[]'::json) AS images,
    EXISTS (SELECT 1 FROM user_likes ul WHERE ul.post_id = p.id) AS user_has_liked
  FROM paginated_posts p
  LEFT JOIN post_images_agg pia ON pia.post_id = p.id
  ORDER BY p.created_at DESC;
END;
$$;

-- Optimized get_following_posts_feed_for_user using CTEs
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
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH
  -- Pre-fetch friend IDs for efficient filtering
  friend_ids AS (
    SELECT f.friend_id
    FROM public.friendships f
    WHERE f.user_id = p_user_id AND f.status = 'accepted'
  ),
  -- Pre-fetch the posts we need
  paginated_posts AS (
    SELECT p.*
    FROM public.posts p
    WHERE p.is_public = true
      AND (
        p.user_id IN (SELECT fi.friend_id FROM friend_ids fi)
        OR p.post_type = 'system'
      )
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ),
  -- Pre-aggregate images
  post_images_agg AS (
    SELECT
      pi.post_id,
      COALESCE(json_agg(json_build_object(
        'id', pi.id,
        'image_url', pi.image_url,
        'display_order', pi.display_order
      ) ORDER BY pi.display_order), '[]'::json) AS images
    FROM public.post_images pi
    WHERE pi.post_id IN (SELECT pp.id FROM paginated_posts pp)
    GROUP BY pi.post_id
  ),
  -- Pre-fetch user likes
  user_likes AS (
    SELECT pl.post_id
    FROM public.post_likes pl
    WHERE pl.user_id = p_user_id
      AND pl.post_id IN (SELECT pp.id FROM paginated_posts pp)
  )
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
    pr.display_name AS author_display_name,
    pr.avatar_url AS author_avatar_url,
    e.name AS event_name,
    b.red_name AS fighter_a_name,
    b.blue_name AS fighter_b_name,
    COALESCE(pia.images, '[]'::json) AS images,
    EXISTS (SELECT 1 FROM user_likes ul WHERE ul.post_id = p.id) AS user_has_liked
  FROM paginated_posts p
  LEFT JOIN public.profiles pr ON pr.user_id = p.user_id
  LEFT JOIN public.events e ON e.id = p.event_id
  LEFT JOIN public.bouts b ON b.id = p.bout_id
  LEFT JOIN post_images_agg pia ON pia.post_id = p.id
  ORDER BY p.created_at DESC;
END;
$$;
