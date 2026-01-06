-- Phase 3.1: Add rate limiting to content creation
-- Prevent spam by limiting posts and comments per time window

-- Create rate limits tracking table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('post', 'comment', 'like')),
  window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('hour', now()),
  action_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, action_type, window_start)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action_window
  ON public.rate_limits(user_id, action_type, window_start DESC);

-- Auto-cleanup old rate limit records (older than 24 hours)
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup
  ON public.rate_limits(window_start)
  WHERE window_start < now() - INTERVAL '24 hours';

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rate limits
CREATE POLICY "Users can view their own rate limits"
  ON public.rate_limits FOR SELECT
  USING (auth.uid() = user_id);

-- Rate limit check and increment function
CREATE OR REPLACE FUNCTION check_and_increment_rate_limit(
  p_action_type TEXT,
  p_max_per_hour INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_current_window TIMESTAMPTZ := date_trunc('hour', now());
  v_current_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Try to insert or update the rate limit record
  INSERT INTO public.rate_limits (user_id, action_type, window_start, action_count)
  VALUES (v_user_id, p_action_type, v_current_window, 1)
  ON CONFLICT (user_id, action_type, window_start)
  DO UPDATE SET
    action_count = rate_limits.action_count + 1,
    updated_at = now()
  RETURNING action_count INTO v_current_count;

  -- Check if limit exceeded
  IF v_current_count > p_max_per_hour THEN
    -- Rollback the increment
    UPDATE public.rate_limits
    SET action_count = action_count - 1
    WHERE user_id = v_user_id
      AND action_type = p_action_type
      AND window_start = v_current_window;

    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

-- Update create_post to include rate limiting
CREATE OR REPLACE FUNCTION create_post(
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_image_urls TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_post_id UUID;
  v_image_url TEXT;
  v_order INTEGER := 0;
  v_rate_limit_ok BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check rate limit (10 posts per hour)
  v_rate_limit_ok := check_and_increment_rate_limit('post', 10);
  IF NOT v_rate_limit_ok THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please wait before creating more posts.';
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

-- Update create_comment to include rate limiting
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

  -- Calculate depth
  IF p_parent_id IS NOT NULL THEN
    SELECT depth INTO v_parent_depth FROM public.post_comments WHERE id = p_parent_id;
    IF v_parent_depth IS NULL THEN
      RAISE EXCEPTION 'Parent comment not found';
    END IF;
    v_new_depth := LEAST(v_parent_depth + 1, 3);
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

-- Function to clean up old rate limit records
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < now() - INTERVAL '24 hours';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Grant to service_role for scheduled cleanup
GRANT EXECUTE ON FUNCTION cleanup_old_rate_limits() TO service_role;

-- Function to get current rate limit status for a user
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
    WHEN 'like' THEN 300
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

GRANT EXECUTE ON FUNCTION get_rate_limit_status(TEXT) TO authenticated;
