-- Add rate limiting to social actions to prevent abuse
-- Protects: likes, follows, bookmarks from spam and manipulation

-- 1. Update rate_limits CHECK constraint to include new action types
ALTER TABLE public.rate_limits
  DROP CONSTRAINT IF EXISTS rate_limits_action_type_check;

ALTER TABLE public.rate_limits
  ADD CONSTRAINT rate_limits_action_type_check
  CHECK (action_type IN ('post', 'comment', 'like', 'report', 'follow', 'bookmark'));

-- 2. Update get_rate_limit_status to include new limits
CREATE OR REPLACE FUNCTION get_rate_limit_status(p_action_type TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_current_window TIMESTAMPTZ := date_trunc('hour', now());
  v_current_count INTEGER;
  v_max_limit INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get max limit based on action type
  v_max_limit := CASE p_action_type
    WHEN 'post' THEN 10
    WHEN 'comment' THEN 60
    WHEN 'like' THEN 300       -- Likes are quick actions, allow more
    WHEN 'report' THEN 10
    WHEN 'follow' THEN 100     -- Reasonable follow limit
    WHEN 'bookmark' THEN 60    -- Similar to comments
    ELSE 100
  END;

  -- Get current count
  SELECT COALESCE(action_count, 0)
  INTO v_current_count
  FROM public.rate_limits
  WHERE user_id = v_user_id
    AND action_type = p_action_type
    AND window_start = v_current_window;

  v_current_count := COALESCE(v_current_count, 0);

  RETURN json_build_object(
    'action_type', p_action_type,
    'current_count', v_current_count,
    'max_limit', v_max_limit,
    'remaining', GREATEST(v_max_limit - v_current_count, 0),
    'window_resets_at', v_current_window + INTERVAL '1 hour'
  );
END;
$$;

-- 3. Update toggle_post_like with rate limiting
CREATE OR REPLACE FUNCTION toggle_post_like(p_post_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_existing_like_id UUID;
  v_new_like_count INTEGER;
  v_rate_limit_ok BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check rate limit (300 likes per hour)
  v_rate_limit_ok := check_and_increment_rate_limit('like', 300);
  IF NOT v_rate_limit_ok THEN
    RAISE EXCEPTION 'Rate limit exceeded. You''re liking too fast. Please slow down.';
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

-- 4. Update toggle_comment_like with rate limiting
CREATE OR REPLACE FUNCTION toggle_comment_like(p_comment_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_existing_like_id UUID;
  v_new_like_count INTEGER;
  v_rate_limit_ok BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check rate limit (300 likes per hour - shared with post likes)
  v_rate_limit_ok := check_and_increment_rate_limit('like', 300);
  IF NOT v_rate_limit_ok THEN
    RAISE EXCEPTION 'Rate limit exceeded. You''re liking too fast. Please slow down.';
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

-- 5. Update toggle_activity_like with rate limiting
CREATE OR REPLACE FUNCTION toggle_activity_like(p_activity_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_existing_like_id UUID;
  v_new_like_count INTEGER;
  v_rate_limit_ok BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check rate limit (300 likes per hour - shared bucket)
  v_rate_limit_ok := check_and_increment_rate_limit('like', 300);
  IF NOT v_rate_limit_ok THEN
    RAISE EXCEPTION 'Rate limit exceeded. You''re liking too fast. Please slow down.';
  END IF;

  -- Check if already liked
  SELECT id INTO v_existing_like_id
  FROM public.activity_likes
  WHERE activity_id = p_activity_id AND user_id = v_user_id;

  IF v_existing_like_id IS NOT NULL THEN
    -- Unlike
    DELETE FROM public.activity_likes WHERE id = v_existing_like_id;
    SELECT like_count INTO v_new_like_count FROM public.activity_feed WHERE id = p_activity_id;
    RETURN jsonb_build_object('liked', false, 'like_count', v_new_like_count);
  ELSE
    -- Like
    INSERT INTO public.activity_likes (activity_id, user_id) VALUES (p_activity_id, v_user_id);
    SELECT like_count INTO v_new_like_count FROM public.activity_feed WHERE id = p_activity_id;
    RETURN jsonb_build_object('liked', true, 'like_count', v_new_like_count);
  END IF;
END;
$$;

-- 6. Update toggle_post_bookmark with rate limiting
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
  v_rate_limit_ok BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check rate limit (60 bookmarks per hour)
  v_rate_limit_ok := check_and_increment_rate_limit('bookmark', 60);
  IF NOT v_rate_limit_ok THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please wait before bookmarking more posts.';
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

-- 7. Create follow_user RPC function with rate limiting
CREATE OR REPLACE FUNCTION public.follow_user(p_target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_rate_limit_ok BOOLEAN;
  v_existing_follow_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Prevent self-follow
  IF v_user_id = p_target_user_id THEN
    RAISE EXCEPTION 'You cannot follow yourself';
  END IF;

  -- Check if target user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_target_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Check rate limit (100 follows per hour)
  v_rate_limit_ok := check_and_increment_rate_limit('follow', 100);
  IF NOT v_rate_limit_ok THEN
    RAISE EXCEPTION 'Rate limit exceeded. You''re following too fast. Please slow down.';
  END IF;

  -- Check if already following
  SELECT id INTO v_existing_follow_id
  FROM public.follows
  WHERE user_id = v_user_id AND following_id = p_target_user_id;

  IF v_existing_follow_id IS NOT NULL THEN
    RETURN json_build_object('success', true, 'already_following', true);
  END IF;

  -- Create follow relationship
  INSERT INTO public.follows (user_id, following_id, status)
  VALUES (v_user_id, p_target_user_id, 'accepted');

  RETURN json_build_object('success', true, 'already_following', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.follow_user(UUID) TO authenticated;

-- 8. Create unfollow_user RPC function with rate limiting
CREATE OR REPLACE FUNCTION public.unfollow_user(p_target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_rate_limit_ok BOOLEAN;
  v_deleted_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check rate limit (100 unfollows per hour - shared with follows)
  v_rate_limit_ok := check_and_increment_rate_limit('follow', 100);
  IF NOT v_rate_limit_ok THEN
    RAISE EXCEPTION 'Rate limit exceeded. You''re unfollowing too fast. Please slow down.';
  END IF;

  -- Delete follow relationship
  DELETE FROM public.follows
  WHERE user_id = v_user_id AND following_id = p_target_user_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN json_build_object('success', true, 'was_following', v_deleted_count > 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.unfollow_user(UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION toggle_post_like IS 'Toggle like on a post. Rate limited to 300/hour.';
COMMENT ON FUNCTION toggle_comment_like IS 'Toggle like on a comment. Rate limited to 300/hour (shared with post likes).';
COMMENT ON FUNCTION toggle_activity_like IS 'Toggle like on an activity. Rate limited to 300/hour (shared bucket).';
COMMENT ON FUNCTION toggle_post_bookmark IS 'Toggle bookmark on a post. Rate limited to 60/hour.';
COMMENT ON FUNCTION follow_user IS 'Follow a user. Rate limited to 100/hour.';
COMMENT ON FUNCTION unfollow_user IS 'Unfollow a user. Rate limited to 100/hour (shared with follows).';
