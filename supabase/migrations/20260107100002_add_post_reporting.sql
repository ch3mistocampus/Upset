-- Add post and comment reporting functionality
-- Allows users to report inappropriate content

-- Report reasons enum
CREATE TYPE public.post_report_reason AS ENUM (
  'spam',
  'harassment',
  'hate_speech',
  'misinformation',
  'inappropriate',
  'other'
);

-- Report status enum
CREATE TYPE public.report_status AS ENUM (
  'pending',
  'reviewed',
  'action_taken',
  'dismissed'
);

-- Create post reports table
CREATE TABLE IF NOT EXISTS public.post_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason post_report_reason NOT NULL,
  details TEXT,
  status report_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each user can only report a post once
  CONSTRAINT unique_post_report UNIQUE (post_id, reporter_id)
);

-- Create comment reports table
CREATE TABLE IF NOT EXISTS public.comment_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason post_report_reason NOT NULL,
  details TEXT,
  status report_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each user can only report a comment once
  CONSTRAINT unique_comment_report UNIQUE (comment_id, reporter_id)
);

-- Indexes for efficient admin queries
CREATE INDEX IF NOT EXISTS idx_post_reports_status
  ON public.post_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_reports_post
  ON public.post_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_comment_reports_status
  ON public.comment_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_reports_comment
  ON public.comment_reports(comment_id);

-- Enable RLS
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own reports
CREATE POLICY "Users can view own post reports"
  ON public.post_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "Users can view own comment reports"
  ON public.comment_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- Users can create reports
CREATE POLICY "Users can create post reports"
  ON public.post_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can create comment reports"
  ON public.comment_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all post reports"
  ON public.post_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can view all comment reports"
  ON public.comment_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Admins can update reports
CREATE POLICY "Admins can update post reports"
  ON public.post_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can update comment reports"
  ON public.comment_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Report a post function
CREATE OR REPLACE FUNCTION public.report_post(
  p_post_id UUID,
  p_reason post_report_reason,
  p_details TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_report_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if post exists
  IF NOT EXISTS (SELECT 1 FROM posts WHERE id = p_post_id) THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  -- Check if user already reported this post
  IF EXISTS (
    SELECT 1 FROM post_reports
    WHERE post_id = p_post_id AND reporter_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'You have already reported this post';
  END IF;

  -- Create the report
  INSERT INTO post_reports (post_id, reporter_id, reason, details)
  VALUES (p_post_id, v_user_id, p_reason, p_details)
  RETURNING id INTO v_report_id;

  RETURN json_build_object(
    'success', true,
    'report_id', v_report_id
  );
END;
$$;

-- Report a comment function
CREATE OR REPLACE FUNCTION public.report_comment(
  p_comment_id UUID,
  p_reason post_report_reason,
  p_details TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_report_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if comment exists
  IF NOT EXISTS (SELECT 1 FROM post_comments WHERE id = p_comment_id) THEN
    RAISE EXCEPTION 'Comment not found';
  END IF;

  -- Check if user already reported this comment
  IF EXISTS (
    SELECT 1 FROM comment_reports
    WHERE comment_id = p_comment_id AND reporter_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'You have already reported this comment';
  END IF;

  -- Create the report
  INSERT INTO comment_reports (comment_id, reporter_id, reason, details)
  VALUES (p_comment_id, v_user_id, p_reason, p_details)
  RETURNING id INTO v_report_id;

  RETURN json_build_object(
    'success', true,
    'report_id', v_report_id
  );
END;
$$;

-- Admin function to get pending reports
CREATE OR REPLACE FUNCTION public.admin_get_pending_reports(
  p_type TEXT DEFAULT 'all', -- 'post', 'comment', or 'all'
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_post_reports JSON;
  v_comment_reports JSON;
BEGIN
  v_user_id := auth.uid();

  -- Check admin status
  SELECT is_admin INTO v_is_admin
  FROM profiles WHERE user_id = v_user_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Get post reports
  IF p_type IN ('post', 'all') THEN
    SELECT COALESCE(json_agg(r ORDER BY r.created_at DESC), '[]'::json)
    INTO v_post_reports
    FROM (
      SELECT
        pr.id,
        pr.post_id,
        pr.reason,
        pr.details,
        pr.status,
        pr.created_at,
        p.title as post_title,
        p.body as post_body,
        reporter.username as reporter_username,
        author.username as author_username
      FROM post_reports pr
      JOIN posts p ON p.id = pr.post_id
      JOIN profiles reporter ON reporter.user_id = pr.reporter_id
      LEFT JOIN profiles author ON author.user_id = p.user_id
      WHERE pr.status = 'pending'
      LIMIT p_limit OFFSET p_offset
    ) r;
  ELSE
    v_post_reports := '[]'::json;
  END IF;

  -- Get comment reports
  IF p_type IN ('comment', 'all') THEN
    SELECT COALESCE(json_agg(r ORDER BY r.created_at DESC), '[]'::json)
    INTO v_comment_reports
    FROM (
      SELECT
        cr.id,
        cr.comment_id,
        cr.reason,
        cr.details,
        cr.status,
        cr.created_at,
        c.body as comment_body,
        c.post_id,
        reporter.username as reporter_username,
        author.username as author_username
      FROM comment_reports cr
      JOIN post_comments c ON c.id = cr.comment_id
      JOIN profiles reporter ON reporter.user_id = cr.reporter_id
      LEFT JOIN profiles author ON author.user_id = c.user_id
      WHERE cr.status = 'pending'
      LIMIT p_limit OFFSET p_offset
    ) r;
  ELSE
    v_comment_reports := '[]'::json;
  END IF;

  RETURN json_build_object(
    'post_reports', v_post_reports,
    'comment_reports', v_comment_reports
  );
END;
$$;

-- Admin function to resolve a report
CREATE OR REPLACE FUNCTION public.admin_resolve_report(
  p_report_id UUID,
  p_report_type TEXT, -- 'post' or 'comment'
  p_status report_status,
  p_admin_notes TEXT DEFAULT NULL,
  p_delete_content BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_content_id UUID;
BEGIN
  v_user_id := auth.uid();

  -- Check admin status
  SELECT is_admin INTO v_is_admin
  FROM profiles WHERE user_id = v_user_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_report_type = 'post' THEN
    -- Update post report
    UPDATE post_reports
    SET
      status = p_status,
      reviewed_by = v_user_id,
      reviewed_at = now(),
      admin_notes = p_admin_notes
    WHERE id = p_report_id
    RETURNING post_id INTO v_content_id;

    -- Optionally delete the post
    IF p_delete_content AND v_content_id IS NOT NULL THEN
      DELETE FROM posts WHERE id = v_content_id;
    END IF;

  ELSIF p_report_type = 'comment' THEN
    -- Update comment report
    UPDATE comment_reports
    SET
      status = p_status,
      reviewed_by = v_user_id,
      reviewed_at = now(),
      admin_notes = p_admin_notes
    WHERE id = p_report_id
    RETURNING comment_id INTO v_content_id;

    -- Optionally delete the comment
    IF p_delete_content AND v_content_id IS NOT NULL THEN
      DELETE FROM post_comments WHERE id = v_content_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid report type. Use "post" or "comment"';
  END IF;

  RETURN json_build_object(
    'success', true,
    'content_deleted', p_delete_content
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.report_post(UUID, post_report_reason, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_comment(UUID, post_report_reason, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_pending_reports(TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_report(UUID, TEXT, report_status, TEXT, BOOLEAN) TO authenticated;
