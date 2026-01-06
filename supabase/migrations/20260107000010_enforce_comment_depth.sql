-- Phase 4.2: Enforce comment depth strictly
-- Reject replies that would exceed max depth instead of silently capping

-- Update create_comment to strictly enforce depth limits
CREATE OR REPLACE FUNCTION create_comment(
  p_post_id UUID,
  p_body TEXT,
  p_parent_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_comment_id UUID;
  v_parent_depth INTEGER;
  v_new_depth INTEGER;
  v_rate_limit_ok BOOLEAN;
  v_max_depth CONSTANT INTEGER := 3;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check rate limit (60 comments per hour)
  v_rate_limit_ok := check_and_increment_rate_limit('comment', 60);
  IF NOT v_rate_limit_ok THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please wait before posting more comments.';
  END IF;

  -- Verify post exists and is public
  IF NOT EXISTS (SELECT 1 FROM public.posts WHERE id = p_post_id AND is_public = true) THEN
    RAISE EXCEPTION 'Post not found or not accessible';
  END IF;

  -- Calculate and validate depth
  IF p_parent_id IS NOT NULL THEN
    SELECT depth INTO v_parent_depth FROM public.post_comments WHERE id = p_parent_id;

    IF v_parent_depth IS NULL THEN
      RAISE EXCEPTION 'Parent comment not found';
    END IF;

    -- Verify parent belongs to the same post
    IF NOT EXISTS (SELECT 1 FROM public.post_comments WHERE id = p_parent_id AND post_id = p_post_id) THEN
      RAISE EXCEPTION 'Parent comment does not belong to this post';
    END IF;

    v_new_depth := v_parent_depth + 1;

    -- STRICT enforcement: reject if depth would exceed maximum
    IF v_new_depth > v_max_depth THEN
      RAISE EXCEPTION 'Maximum reply depth (%) exceeded. You cannot reply to this comment.', v_max_depth;
    END IF;
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

-- Add a check constraint on the depth column as a safety net
ALTER TABLE public.post_comments
DROP CONSTRAINT IF EXISTS check_comment_depth;

ALTER TABLE public.post_comments
ADD CONSTRAINT check_comment_depth
CHECK (depth >= 0 AND depth <= 3);

-- Add comment documenting the depth limit
COMMENT ON COLUMN public.post_comments.depth IS 'Nesting level: 0=top-level, max=3. Strictly enforced - deeper replies are rejected.';

-- Create function to check if a comment can be replied to
CREATE OR REPLACE FUNCTION can_reply_to_comment(p_comment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_depth INTEGER;
  v_max_depth CONSTANT INTEGER := 3;
BEGIN
  SELECT depth INTO v_depth
  FROM public.post_comments
  WHERE id = p_comment_id;

  IF v_depth IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Can reply if depth < max_depth
  RETURN v_depth < v_max_depth;
END;
$$;

GRANT EXECUTE ON FUNCTION can_reply_to_comment(UUID) TO authenticated, anon;
