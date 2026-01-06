-- Phase 4.1: Add comment pagination
-- Allows loading comments in batches with cursor-based pagination

-- Create paginated comments function
CREATE OR REPLACE FUNCTION get_post_comments_paginated(
  p_post_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_parent_id UUID DEFAULT NULL -- NULL for top-level, specific ID for replies
)
RETURNS TABLE (
  id UUID,
  post_id UUID,
  user_id UUID,
  parent_id UUID,
  body TEXT,
  like_count INTEGER,
  reply_count INTEGER,
  depth INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  author_username TEXT,
  author_display_name TEXT,
  author_avatar_url TEXT,
  user_has_liked BOOLEAN,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_total BIGINT;
BEGIN
  -- Get total count for pagination info
  SELECT COUNT(*)
  INTO v_total
  FROM public.post_comments c
  WHERE c.post_id = p_post_id
    AND (
      (p_parent_id IS NULL AND c.parent_id IS NULL)
      OR c.parent_id = p_parent_id
    );

  RETURN QUERY
  WITH
  -- Get the comments for this page
  paginated_comments AS (
    SELECT c.*
    FROM public.post_comments c
    WHERE c.post_id = p_post_id
      AND (
        (p_parent_id IS NULL AND c.parent_id IS NULL)
        OR c.parent_id = p_parent_id
      )
    ORDER BY c.created_at ASC
    LIMIT p_limit
    OFFSET p_offset
  ),
  -- Pre-fetch user likes
  user_likes AS (
    SELECT cl.comment_id
    FROM public.comment_likes cl
    WHERE cl.user_id = v_user_id
      AND cl.comment_id IN (SELECT pc.id FROM paginated_comments pc)
  )
  SELECT
    c.id,
    c.post_id,
    c.user_id,
    c.parent_id,
    c.body,
    c.like_count,
    c.reply_count,
    c.depth,
    c.created_at,
    c.updated_at,
    pr.username AS author_username,
    pr.display_name AS author_display_name,
    pr.avatar_url AS author_avatar_url,
    EXISTS (SELECT 1 FROM user_likes ul WHERE ul.comment_id = c.id) AS user_has_liked,
    v_total AS total_count
  FROM paginated_comments c
  LEFT JOIN public.profiles pr ON pr.user_id = c.user_id
  ORDER BY c.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_post_comments_paginated(UUID, INTEGER, INTEGER, UUID) TO authenticated, anon;

-- Create function to get replies for multiple comments at once
-- Useful for loading replies in batches
CREATE OR REPLACE FUNCTION get_comment_replies_batch(
  p_post_id UUID,
  p_parent_ids UUID[],
  p_limit_per_parent INTEGER DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  post_id UUID,
  user_id UUID,
  parent_id UUID,
  body TEXT,
  like_count INTEGER,
  reply_count INTEGER,
  depth INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  author_username TEXT,
  author_display_name TEXT,
  author_avatar_url TEXT,
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
  -- Get limited replies for each parent using window function
  ranked_replies AS (
    SELECT
      c.*,
      ROW_NUMBER() OVER (PARTITION BY c.parent_id ORDER BY c.created_at ASC) as rn
    FROM public.post_comments c
    WHERE c.post_id = p_post_id
      AND c.parent_id = ANY(p_parent_ids)
  ),
  limited_replies AS (
    SELECT * FROM ranked_replies WHERE rn <= p_limit_per_parent
  ),
  -- Pre-fetch user likes
  user_likes AS (
    SELECT cl.comment_id
    FROM public.comment_likes cl
    WHERE cl.user_id = v_user_id
      AND cl.comment_id IN (SELECT lr.id FROM limited_replies lr)
  )
  SELECT
    c.id,
    c.post_id,
    c.user_id,
    c.parent_id,
    c.body,
    c.like_count,
    c.reply_count,
    c.depth,
    c.created_at,
    c.updated_at,
    pr.username AS author_username,
    pr.display_name AS author_display_name,
    pr.avatar_url AS author_avatar_url,
    EXISTS (SELECT 1 FROM user_likes ul WHERE ul.comment_id = c.id) AS user_has_liked
  FROM limited_replies c
  LEFT JOIN public.profiles pr ON pr.user_id = c.user_id
  ORDER BY c.parent_id, c.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_comment_replies_batch(UUID, UUID[], INTEGER) TO authenticated, anon;

-- Update get_post_with_comments to return pagination info
CREATE OR REPLACE FUNCTION get_post_with_comments(
  p_post_id UUID,
  p_comment_limit INTEGER DEFAULT 20
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSON;
  v_user_id UUID := auth.uid();
  v_total_comments BIGINT;
BEGIN
  -- Get total comment count
  SELECT COUNT(*) INTO v_total_comments
  FROM public.post_comments
  WHERE post_id = p_post_id;

  WITH
  -- Get post images
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
  -- Get top-level comments only (for initial load)
  top_level_comments AS (
    SELECT c.*
    FROM public.post_comments c
    WHERE c.post_id = p_post_id AND c.parent_id IS NULL
    ORDER BY c.created_at ASC
    LIMIT p_comment_limit
  ),
  -- Get immediate replies for top-level comments (first 3 per comment)
  comment_replies AS (
    SELECT
      c.*,
      ROW_NUMBER() OVER (PARTITION BY c.parent_id ORDER BY c.created_at ASC) as rn
    FROM public.post_comments c
    WHERE c.post_id = p_post_id
      AND c.parent_id IN (SELECT tlc.id FROM top_level_comments tlc)
  ),
  limited_replies AS (
    SELECT * FROM comment_replies WHERE rn <= 3
  ),
  -- Combine all comments
  all_comments AS (
    SELECT * FROM top_level_comments
    UNION ALL
    SELECT id, post_id, user_id, parent_id, body, like_count, reply_count, depth, created_at, updated_at
    FROM limited_replies
  ),
  -- Pre-fetch user likes
  user_comment_likes AS (
    SELECT cl.comment_id
    FROM public.comment_likes cl
    WHERE cl.user_id = v_user_id
      AND cl.comment_id IN (SELECT ac.id FROM all_comments ac)
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
        ORDER BY c.depth, c.created_at ASC
      ), '[]'::json)
      FROM all_comments c
      LEFT JOIN public.profiles cp ON cp.user_id = c.user_id
    ),
    'pagination', json_build_object(
      'total_comments', v_total_comments,
      'loaded_comments', (SELECT COUNT(*) FROM all_comments),
      'has_more', v_total_comments > p_comment_limit
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
