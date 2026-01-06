-- Add edit functionality for posts and comments
-- Tracks edit history for transparency

-- Add edited flag and edit timestamp to posts
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- Add edited flag and edit timestamp to comments
ALTER TABLE public.post_comments
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- Edit history table for posts (optional - for audit trail)
CREATE TABLE IF NOT EXISTS public.post_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  previous_title TEXT NOT NULL,
  previous_body TEXT,
  edited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Edit history table for comments
CREATE TABLE IF NOT EXISTS public.comment_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  previous_body TEXT NOT NULL,
  edited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_post_edit_history_post
  ON public.post_edit_history(post_id, edited_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_edit_history_comment
  ON public.comment_edit_history(comment_id, edited_at DESC);

-- Enable RLS
ALTER TABLE public.post_edit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_edit_history ENABLE ROW LEVEL SECURITY;

-- Edit history is viewable by anyone who can view the post/comment
CREATE POLICY "Anyone can view post edit history"
  ON public.post_edit_history
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can view comment edit history"
  ON public.comment_edit_history
  FOR SELECT
  TO authenticated
  USING (true);

-- Update post function
CREATE OR REPLACE FUNCTION public.update_post(
  p_post_id UUID,
  p_title TEXT,
  p_body TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_post_user_id UUID;
  v_old_title TEXT;
  v_old_body TEXT;
  v_post_type TEXT;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get post info
  SELECT user_id, title, body, post_type
  INTO v_post_user_id, v_old_title, v_old_body, v_post_type
  FROM posts WHERE id = p_post_id;

  IF v_post_user_id IS NULL THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  -- Only post owner can edit (system posts cannot be edited)
  IF v_post_user_id != v_user_id THEN
    RAISE EXCEPTION 'You can only edit your own posts';
  END IF;

  IF v_post_type = 'system' THEN
    RAISE EXCEPTION 'System posts cannot be edited';
  END IF;

  -- Validate input
  IF p_title IS NULL OR trim(p_title) = '' THEN
    RAISE EXCEPTION 'Title is required';
  END IF;

  IF length(p_title) > 200 THEN
    RAISE EXCEPTION 'Title must be 200 characters or less';
  END IF;

  IF p_body IS NOT NULL AND length(p_body) > 5000 THEN
    RAISE EXCEPTION 'Body must be 5000 characters or less';
  END IF;

  -- Save edit history
  INSERT INTO post_edit_history (post_id, previous_title, previous_body)
  VALUES (p_post_id, v_old_title, v_old_body);

  -- Update the post
  UPDATE posts
  SET
    title = trim(p_title),
    body = NULLIF(trim(COALESCE(p_body, '')), ''),
    is_edited = true,
    edited_at = now(),
    updated_at = now()
  WHERE id = p_post_id;

  RETURN json_build_object(
    'success', true,
    'post_id', p_post_id
  );
END;
$$;

-- Update comment function
CREATE OR REPLACE FUNCTION public.update_comment(
  p_comment_id UUID,
  p_body TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_comment_user_id UUID;
  v_old_body TEXT;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get comment info
  SELECT user_id, body
  INTO v_comment_user_id, v_old_body
  FROM post_comments WHERE id = p_comment_id;

  IF v_comment_user_id IS NULL THEN
    RAISE EXCEPTION 'Comment not found';
  END IF;

  -- Only comment owner can edit
  IF v_comment_user_id != v_user_id THEN
    RAISE EXCEPTION 'You can only edit your own comments';
  END IF;

  -- Validate input
  IF p_body IS NULL OR trim(p_body) = '' THEN
    RAISE EXCEPTION 'Comment body is required';
  END IF;

  IF length(p_body) > 2000 THEN
    RAISE EXCEPTION 'Comment must be 2000 characters or less';
  END IF;

  -- Save edit history
  INSERT INTO comment_edit_history (comment_id, previous_body)
  VALUES (p_comment_id, v_old_body);

  -- Update the comment
  UPDATE post_comments
  SET
    body = trim(p_body),
    is_edited = true,
    edited_at = now(),
    updated_at = now()
  WHERE id = p_comment_id;

  RETURN json_build_object(
    'success', true,
    'comment_id', p_comment_id
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_post(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_comment(UUID, TEXT) TO authenticated;
