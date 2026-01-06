-- Add bookmarks/saved posts functionality
-- Allows users to save posts for later viewing

-- Create bookmarks table
CREATE TABLE IF NOT EXISTS public.post_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each user can only bookmark a post once
  CONSTRAINT unique_post_bookmark UNIQUE (user_id, post_id)
);

-- Index for efficient user bookmark lookups
CREATE INDEX IF NOT EXISTS idx_post_bookmarks_user
  ON public.post_bookmarks(user_id, created_at DESC);

-- Index for checking if post is bookmarked
CREATE INDEX IF NOT EXISTS idx_post_bookmarks_post_user
  ON public.post_bookmarks(post_id, user_id);

-- Enable RLS
ALTER TABLE public.post_bookmarks ENABLE ROW LEVEL SECURITY;

-- Users can view their own bookmarks
CREATE POLICY "Users can view own bookmarks"
  ON public.post_bookmarks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own bookmarks
CREATE POLICY "Users can create own bookmarks"
  ON public.post_bookmarks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own bookmarks
CREATE POLICY "Users can delete own bookmarks"
  ON public.post_bookmarks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Toggle bookmark function
CREATE OR REPLACE FUNCTION public.toggle_post_bookmark(p_post_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_existing_id UUID;
  v_result JSON;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if bookmark exists
  SELECT id INTO v_existing_id
  FROM post_bookmarks
  WHERE user_id = v_user_id AND post_id = p_post_id;

  IF v_existing_id IS NOT NULL THEN
    -- Remove bookmark
    DELETE FROM post_bookmarks WHERE id = v_existing_id;
    v_result := json_build_object('bookmarked', false);
  ELSE
    -- Add bookmark
    INSERT INTO post_bookmarks (user_id, post_id)
    VALUES (v_user_id, p_post_id);
    v_result := json_build_object('bookmarked', true);
  END IF;

  RETURN v_result;
END;
$$;

-- Get user's bookmarked posts
CREATE OR REPLACE FUNCTION public.get_bookmarked_posts(
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS SETOF JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
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
    'fighter_a_name', b.red_name,
    'fighter_b_name', b.blue_name,
    'images', COALESCE(
      (SELECT json_agg(json_build_object(
        'id', pi.id,
        'image_url', pi.image_url,
        'display_order', pi.display_order
      ) ORDER BY pi.display_order)
      FROM post_images pi WHERE pi.post_id = p.id),
      '[]'::json
    ),
    'user_has_liked', EXISTS(
      SELECT 1 FROM post_likes pl
      WHERE pl.post_id = p.id AND pl.user_id = v_user_id
    ),
    'user_has_bookmarked', true,
    'bookmarked_at', pb.created_at
  )
  FROM post_bookmarks pb
  JOIN posts p ON p.id = pb.post_id
  LEFT JOIN profiles pr ON pr.user_id = p.user_id
  LEFT JOIN events e ON e.id = p.event_id
  LEFT JOIN bouts b ON b.id = p.bout_id
  WHERE pb.user_id = v_user_id
  ORDER BY pb.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.toggle_post_bookmark(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bookmarked_posts(INT, INT) TO authenticated;
