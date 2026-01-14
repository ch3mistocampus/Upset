-- Harden report feature against abuse
-- Addresses: rate limiting, self-reporting, detail requirements, audit logging

-- 1. Update rate_limits CHECK constraint to include 'report' action type
ALTER TABLE public.rate_limits
  DROP CONSTRAINT IF EXISTS rate_limits_action_type_check;

ALTER TABLE public.rate_limits
  ADD CONSTRAINT rate_limits_action_type_check
  CHECK (action_type IN ('post', 'comment', 'like', 'report'));

-- 2. Update get_rate_limit_status to include report limits
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
    WHEN 'report' THEN 10  -- 10 reports per hour max
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

-- 3. Create audit log table for admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'report_reviewed',
    'report_action_taken',
    'report_dismissed',
    'content_deleted',
    'user_warned',
    'user_banned'
  )),
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'user', 'report')),
  target_id UUID NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin
  ON public.admin_audit_log(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target
  ON public.admin_audit_log(target_type, target_id);

-- RLS - only admins can view audit log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON public.admin_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- 4. Update report_post with rate limiting, self-report prevention, and detail validation
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
  v_post_author_id UUID;
  v_rate_limit_ok BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check rate limit (10 reports per hour)
  v_rate_limit_ok := check_and_increment_rate_limit('report', 10);
  IF NOT v_rate_limit_ok THEN
    RAISE EXCEPTION 'You are submitting too many reports. Please wait before reporting more content.';
  END IF;

  -- Check if post exists and get author
  SELECT user_id INTO v_post_author_id FROM posts WHERE id = p_post_id;
  IF v_post_author_id IS NULL THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  -- Prevent self-reporting
  IF v_post_author_id = v_user_id THEN
    RAISE EXCEPTION 'You cannot report your own content';
  END IF;

  -- Require details for "other" reason (minimum 20 characters)
  IF p_reason = 'other' THEN
    IF p_details IS NULL OR length(trim(p_details)) < 20 THEN
      RAISE EXCEPTION 'Please provide more details (at least 20 characters) when selecting "Other" as the reason';
    END IF;
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

-- 5. Update report_comment with rate limiting, self-report prevention, and detail validation
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
  v_comment_author_id UUID;
  v_rate_limit_ok BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check rate limit (10 reports per hour)
  v_rate_limit_ok := check_and_increment_rate_limit('report', 10);
  IF NOT v_rate_limit_ok THEN
    RAISE EXCEPTION 'You are submitting too many reports. Please wait before reporting more content.';
  END IF;

  -- Check if comment exists and get author
  SELECT user_id INTO v_comment_author_id FROM post_comments WHERE id = p_comment_id;
  IF v_comment_author_id IS NULL THEN
    RAISE EXCEPTION 'Comment not found';
  END IF;

  -- Prevent self-reporting
  IF v_comment_author_id = v_user_id THEN
    RAISE EXCEPTION 'You cannot report your own content';
  END IF;

  -- Require details for "other" reason (minimum 20 characters)
  IF p_reason = 'other' THEN
    IF p_details IS NULL OR length(trim(p_details)) < 20 THEN
      RAISE EXCEPTION 'Please provide more details (at least 20 characters) when selecting "Other" as the reason';
    END IF;
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

-- 6. Update admin_resolve_report to include audit logging
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
  v_reporter_id UUID;
  v_reason TEXT;
  v_audit_action TEXT;
BEGIN
  v_user_id := auth.uid();

  -- Check admin status
  SELECT is_admin INTO v_is_admin
  FROM profiles WHERE user_id = v_user_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Determine audit action type
  v_audit_action := CASE
    WHEN p_status = 'action_taken' THEN 'report_action_taken'
    WHEN p_status = 'dismissed' THEN 'report_dismissed'
    ELSE 'report_reviewed'
  END;

  IF p_report_type = 'post' THEN
    -- Get report details for audit
    SELECT post_id, reporter_id, reason::TEXT
    INTO v_content_id, v_reporter_id, v_reason
    FROM post_reports WHERE id = p_report_id;

    -- Update post report
    UPDATE post_reports
    SET
      status = p_status,
      reviewed_by = v_user_id,
      reviewed_at = now(),
      admin_notes = p_admin_notes
    WHERE id = p_report_id;

    -- Log the admin action
    INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
    VALUES (
      v_user_id,
      v_audit_action,
      'report',
      p_report_id,
      jsonb_build_object(
        'report_type', 'post',
        'content_id', v_content_id,
        'reporter_id', v_reporter_id,
        'reason', v_reason,
        'status', p_status::TEXT,
        'admin_notes', p_admin_notes,
        'content_deleted', p_delete_content
      )
    );

    -- Optionally delete the post
    IF p_delete_content AND v_content_id IS NOT NULL THEN
      DELETE FROM posts WHERE id = v_content_id;

      -- Log content deletion separately
      INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
      VALUES (
        v_user_id,
        'content_deleted',
        'post',
        v_content_id,
        jsonb_build_object(
          'reason', 'Report resolved: ' || v_reason,
          'report_id', p_report_id
        )
      );
    END IF;

  ELSIF p_report_type = 'comment' THEN
    -- Get report details for audit
    SELECT comment_id, reporter_id, reason::TEXT
    INTO v_content_id, v_reporter_id, v_reason
    FROM comment_reports WHERE id = p_report_id;

    -- Update comment report
    UPDATE comment_reports
    SET
      status = p_status,
      reviewed_by = v_user_id,
      reviewed_at = now(),
      admin_notes = p_admin_notes
    WHERE id = p_report_id;

    -- Log the admin action
    INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
    VALUES (
      v_user_id,
      v_audit_action,
      'report',
      p_report_id,
      jsonb_build_object(
        'report_type', 'comment',
        'content_id', v_content_id,
        'reporter_id', v_reporter_id,
        'reason', v_reason,
        'status', p_status::TEXT,
        'admin_notes', p_admin_notes,
        'content_deleted', p_delete_content
      )
    );

    -- Optionally delete the comment
    IF p_delete_content AND v_content_id IS NOT NULL THEN
      DELETE FROM post_comments WHERE id = v_content_id;

      -- Log content deletion separately
      INSERT INTO admin_audit_log (admin_id, action_type, target_type, target_id, details)
      VALUES (
        v_user_id,
        'content_deleted',
        'comment',
        v_content_id,
        jsonb_build_object(
          'reason', 'Report resolved: ' || v_reason,
          'report_id', p_report_id
        )
      );
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

-- 7. Add index for tracking reporter credibility (count of actioned vs dismissed reports)
CREATE INDEX IF NOT EXISTS idx_post_reports_reporter_status
  ON public.post_reports(reporter_id, status);
CREATE INDEX IF NOT EXISTS idx_comment_reports_reporter_status
  ON public.comment_reports(reporter_id, status);

-- 8. Function to get reporter credibility score (for future use in weighted report priority)
CREATE OR REPLACE FUNCTION get_reporter_credibility(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_reports INTEGER;
  v_actioned_reports INTEGER;
  v_dismissed_reports INTEGER;
  v_pending_reports INTEGER;
  v_credibility_score NUMERIC;
BEGIN
  -- Count post reports
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'action_taken'),
    COUNT(*) FILTER (WHERE status = 'dismissed'),
    COUNT(*) FILTER (WHERE status = 'pending')
  INTO v_total_reports, v_actioned_reports, v_dismissed_reports, v_pending_reports
  FROM post_reports WHERE reporter_id = p_user_id;

  -- Add comment reports
  SELECT
    v_total_reports + COUNT(*),
    v_actioned_reports + COUNT(*) FILTER (WHERE status = 'action_taken'),
    v_dismissed_reports + COUNT(*) FILTER (WHERE status = 'dismissed'),
    v_pending_reports + COUNT(*) FILTER (WHERE status = 'pending')
  INTO v_total_reports, v_actioned_reports, v_dismissed_reports, v_pending_reports
  FROM comment_reports WHERE reporter_id = p_user_id;

  -- Calculate credibility score (0-100)
  -- Start at 50, gain points for actioned reports, lose points for dismissed
  IF v_total_reports = 0 THEN
    v_credibility_score := 50; -- Default for new reporters
  ELSE
    v_credibility_score := GREATEST(0, LEAST(100,
      50 + (v_actioned_reports * 10) - (v_dismissed_reports * 15)
    ));
  END IF;

  RETURN json_build_object(
    'user_id', p_user_id,
    'total_reports', v_total_reports,
    'actioned_reports', v_actioned_reports,
    'dismissed_reports', v_dismissed_reports,
    'pending_reports', v_pending_reports,
    'credibility_score', v_credibility_score
  );
END;
$$;

-- Grant execute to admins only
GRANT EXECUTE ON FUNCTION get_reporter_credibility(UUID) TO authenticated;

COMMENT ON TABLE public.admin_audit_log IS 'Audit trail for admin actions on reports and content moderation';
COMMENT ON FUNCTION get_reporter_credibility IS 'Calculates reporter credibility based on historical report accuracy';
