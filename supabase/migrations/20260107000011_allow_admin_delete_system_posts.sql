-- Phase 4.3: Allow system post deletion by admins
-- Currently system posts have user_id = NULL, so owners can't delete them
-- Allow admins to delete system posts

-- Update delete_post to allow admins to delete system posts
CREATE OR REPLACE FUNCTION delete_post(p_post_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_post_user_id UUID;
  v_post_type TEXT;
  v_is_admin BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get post info
  SELECT user_id, post_type
  INTO v_post_user_id, v_post_type
  FROM public.posts
  WHERE id = p_post_id;

  IF v_post_user_id IS NULL AND v_post_type IS NULL THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  -- Check if user is admin
  v_is_admin := is_admin();

  -- Allow deletion if:
  -- 1. User owns the post (for user posts)
  -- 2. User is admin (for any post including system posts)
  IF v_post_user_id = v_user_id THEN
    -- User owns the post, allow deletion
    NULL;
  ELSIF v_is_admin THEN
    -- Admin can delete any post
    NULL;
  ELSE
    RAISE EXCEPTION 'You do not have permission to delete this post';
  END IF;

  -- Delete post (cascades to images, comments, likes)
  DELETE FROM public.posts WHERE id = p_post_id;

  RETURN true;
END;
$$;

-- Create a separate admin function for bulk post management
CREATE OR REPLACE FUNCTION admin_delete_posts(p_post_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_deleted INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Verify admin status
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Delete the posts
  DELETE FROM public.posts
  WHERE id = ANY(p_post_ids);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_delete_posts(UUID[]) TO authenticated;

-- Create admin function to delete comments (any comment)
CREATE OR REPLACE FUNCTION admin_delete_comment(p_comment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Verify admin status
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Verify comment exists
  IF NOT EXISTS (SELECT 1 FROM public.post_comments WHERE id = p_comment_id) THEN
    RAISE EXCEPTION 'Comment not found';
  END IF;

  -- Delete comment (cascades to replies and likes)
  DELETE FROM public.post_comments WHERE id = p_comment_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_delete_comment(UUID) TO authenticated;

-- Update delete_comment to also allow admins to delete any comment
CREATE OR REPLACE FUNCTION delete_comment(p_comment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_comment_user_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get comment owner
  SELECT user_id INTO v_comment_user_id
  FROM public.post_comments
  WHERE id = p_comment_id;

  IF v_comment_user_id IS NULL THEN
    RAISE EXCEPTION 'Comment not found';
  END IF;

  -- Check if user is admin
  v_is_admin := is_admin();

  -- Allow deletion if user owns comment or is admin
  IF v_comment_user_id != v_user_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'You do not have permission to delete this comment';
  END IF;

  -- Delete comment (cascades to replies and likes)
  DELETE FROM public.post_comments WHERE id = p_comment_id;

  RETURN true;
END;
$$;

-- Add RLS policy for admins to manage system posts
DROP POLICY IF EXISTS "Admins can delete any post" ON public.posts;
CREATE POLICY "Admins can delete any post"
  ON public.posts FOR DELETE
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can update any post" ON public.posts;
CREATE POLICY "Admins can update any post"
  ON public.posts FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Add RLS policy for admins to manage comments
DROP POLICY IF EXISTS "Admins can delete any comment" ON public.post_comments;
CREATE POLICY "Admins can delete any comment"
  ON public.post_comments FOR DELETE
  USING (is_admin());

-- Add comments for documentation
COMMENT ON FUNCTION delete_post(UUID) IS 'Delete a post. Users can delete their own posts, admins can delete any post including system posts.';
COMMENT ON FUNCTION delete_comment(UUID) IS 'Delete a comment. Users can delete their own comments, admins can delete any comment.';
COMMENT ON FUNCTION admin_delete_posts(UUID[]) IS 'Admin-only: Bulk delete multiple posts.';
COMMENT ON FUNCTION admin_delete_comment(UUID) IS 'Admin-only: Delete any comment.';
