-- Posts/Forum Feature: RPC Functions

-- Get posts feed with pagination and engagement ranking
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
    pr.display_name AS author_display_name,
    pr.avatar_url AS author_avatar_url,
    e.name AS event_name,
    fa.name AS fighter_a_name,
    fb.name AS fighter_b_name,
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
  LEFT JOIN public.profiles pr ON pr.id = p.user_id
  LEFT JOIN public.events e ON e.id = p.event_id
  LEFT JOIN public.bouts b ON b.id = p.bout_id
  LEFT JOIN public.fighters fa ON fa.id = b.fighter_a_id
  LEFT JOIN public.fighters fb ON fb.id = b.fighter_b_id
  WHERE p.is_public = true
  ORDER BY p.engagement_score DESC, p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_posts_feed(INTEGER, INTEGER) TO authenticated, anon;

-- Get single post with comments
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
        'author_display_name', pr.display_name,
        'author_avatar_url', pr.avatar_url,
        'event_name', e.name,
        'fighter_a_name', fa.name,
        'fighter_b_name', fb.name,
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
      LEFT JOIN public.profiles pr ON pr.id = p.user_id
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
            SELECT 1 FROM public.comment_likes cl
            WHERE cl.comment_id = c.id AND cl.user_id = auth.uid()
          )
        )
        ORDER BY c.created_at ASC
      ), '[]'::json)
      FROM public.post_comments c
      LEFT JOIN public.profiles cp ON cp.id = c.user_id
      WHERE c.post_id = p_post_id
      LIMIT p_comment_limit
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_post_with_comments(UUID, INTEGER) TO authenticated, anon;

-- Toggle post like (like if not liked, unlike if liked)
CREATE OR REPLACE FUNCTION toggle_post_like(p_post_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_existing_like_id UUID;
  v_new_like_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if already liked
  SELECT id INTO v_existing_like_id
  FROM public.post_likes
  WHERE post_id = p_post_id AND user_id = v_user_id;

  IF v_existing_like_id IS NOT NULL THEN
    -- Unlike
    DELETE FROM public.post_likes WHERE id = v_existing_like_id;
    SELECT like_count INTO v_new_like_count FROM public.posts WHERE id = p_post_id;
    RETURN json_build_object('liked', false, 'like_count', v_new_like_count);
  ELSE
    -- Like
    INSERT INTO public.post_likes (post_id, user_id) VALUES (p_post_id, v_user_id);
    SELECT like_count INTO v_new_like_count FROM public.posts WHERE id = p_post_id;
    RETURN json_build_object('liked', true, 'like_count', v_new_like_count);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION toggle_post_like(UUID) TO authenticated;

-- Toggle comment like
CREATE OR REPLACE FUNCTION toggle_comment_like(p_comment_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_existing_like_id UUID;
  v_new_like_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if already liked
  SELECT id INTO v_existing_like_id
  FROM public.comment_likes
  WHERE comment_id = p_comment_id AND user_id = v_user_id;

  IF v_existing_like_id IS NOT NULL THEN
    -- Unlike
    DELETE FROM public.comment_likes WHERE id = v_existing_like_id;
    SELECT like_count INTO v_new_like_count FROM public.post_comments WHERE id = p_comment_id;
    RETURN json_build_object('liked', false, 'like_count', v_new_like_count);
  ELSE
    -- Like
    INSERT INTO public.comment_likes (comment_id, user_id) VALUES (p_comment_id, v_user_id);
    SELECT like_count INTO v_new_like_count FROM public.post_comments WHERE id = p_comment_id;
    RETURN json_build_object('liked', true, 'like_count', v_new_like_count);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION toggle_comment_like(UUID) TO authenticated;

-- Create user post
CREATE OR REPLACE FUNCTION create_post(
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_image_urls TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_post_id UUID;
  v_image_url TEXT;
  v_order INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Create post
  INSERT INTO public.posts (user_id, post_type, title, body)
  VALUES (v_user_id, 'user', p_title, p_body)
  RETURNING id INTO v_post_id;

  -- Add images
  FOREACH v_image_url IN ARRAY p_image_urls
  LOOP
    INSERT INTO public.post_images (post_id, image_url, display_order)
    VALUES (v_post_id, v_image_url, v_order);
    v_order := v_order + 1;
  END LOOP;

  RETURN v_post_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_post(TEXT, TEXT, TEXT[]) TO authenticated;

-- Create comment or reply
CREATE OR REPLACE FUNCTION create_comment(
  p_post_id UUID,
  p_body TEXT,
  p_parent_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_comment_id UUID;
  v_parent_depth INTEGER;
  v_new_depth INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Verify post exists and is public
  IF NOT EXISTS (SELECT 1 FROM public.posts WHERE id = p_post_id AND is_public = true) THEN
    RAISE EXCEPTION 'Post not found or not accessible';
  END IF;

  -- Calculate depth
  IF p_parent_id IS NOT NULL THEN
    SELECT depth INTO v_parent_depth FROM public.post_comments WHERE id = p_parent_id;
    IF v_parent_depth IS NULL THEN
      RAISE EXCEPTION 'Parent comment not found';
    END IF;
    v_new_depth := LEAST(v_parent_depth + 1, 3); -- Max depth of 3
  ELSE
    v_new_depth := 0;
  END IF;

  -- Create comment
  INSERT INTO public.post_comments (post_id, user_id, parent_id, body, depth)
  VALUES (p_post_id, v_user_id, p_parent_id, p_body, v_new_depth)
  RETURNING id INTO v_comment_id;

  RETURN v_comment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_comment(UUID, TEXT, UUID) TO authenticated;

-- Create system post for fight discussion (admin only or service role)
CREATE OR REPLACE FUNCTION create_fight_discussion_post(
  p_event_id UUID,
  p_bout_id UUID,
  p_title TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_post_id UUID;
  v_fighter_a TEXT;
  v_fighter_b TEXT;
  v_event_name TEXT;
  v_final_title TEXT;
BEGIN
  -- Get fighter names and event name
  SELECT fa.name, fb.name, e.name
  INTO v_fighter_a, v_fighter_b, v_event_name
  FROM public.bouts b
  JOIN public.fighters fa ON fa.id = b.fighter_a_id
  JOIN public.fighters fb ON fb.id = b.fighter_b_id
  JOIN public.events e ON e.id = b.event_id
  WHERE b.id = p_bout_id;

  IF v_fighter_a IS NULL THEN
    RAISE EXCEPTION 'Bout not found';
  END IF;

  -- Generate title if not provided
  v_final_title := COALESCE(p_title, v_fighter_a || ' vs ' || v_fighter_b);

  -- Create system post
  INSERT INTO public.posts (
    user_id,
    post_type,
    event_id,
    bout_id,
    title,
    body
  )
  VALUES (
    NULL, -- system post
    'system',
    p_event_id,
    p_bout_id,
    v_final_title,
    'Discuss this fight! Share your predictions and analysis.'
  )
  RETURNING id INTO v_post_id;

  RETURN v_post_id;
END;
$$;

-- Only allow service role to create system posts
GRANT EXECUTE ON FUNCTION create_fight_discussion_post(UUID, UUID, TEXT) TO service_role;

-- Delete post (with cascading cleanup)
CREATE OR REPLACE FUNCTION delete_post(p_post_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Verify ownership
  IF NOT EXISTS (SELECT 1 FROM public.posts WHERE id = p_post_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Post not found or not owned by user';
  END IF;

  -- Delete post (cascades to images, comments, likes)
  DELETE FROM public.posts WHERE id = p_post_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_post(UUID) TO authenticated;

-- Delete comment
CREATE OR REPLACE FUNCTION delete_comment(p_comment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Verify ownership
  IF NOT EXISTS (SELECT 1 FROM public.post_comments WHERE id = p_comment_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Comment not found or not owned by user';
  END IF;

  -- Delete comment (cascades to replies and likes)
  DELETE FROM public.post_comments WHERE id = p_comment_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_comment(UUID) TO authenticated;

-- Get user's posts
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

GRANT EXECUTE ON FUNCTION get_user_posts(UUID, INTEGER, INTEGER) TO authenticated, anon;
