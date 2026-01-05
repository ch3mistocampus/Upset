-- Update Social Functions to Exclude Blocked Users
-- This migration updates all social RPC functions to filter out blocked users

-- ============================================================================
-- UPDATE: get_global_leaderboard
-- Exclude users who have blocked the current user or vice versa
-- ============================================================================
CREATE OR REPLACE FUNCTION get_global_leaderboard(limit_count INTEGER DEFAULT 100)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  total_picks INTEGER,
  correct_picks INTEGER,
  accuracy NUMERIC,
  rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    us.user_id,
    p.username,
    us.total_picks,
    us.correct_winner AS correct_picks,
    CASE
      WHEN us.total_picks = 0 THEN 0
      ELSE ROUND((us.correct_winner::NUMERIC / us.total_picks::NUMERIC) * 100, 1)
    END AS accuracy,
    ROW_NUMBER() OVER (
      ORDER BY
        CASE
          WHEN us.total_picks = 0 THEN 0
          ELSE us.correct_winner::NUMERIC / us.total_picks::NUMERIC
        END DESC,
        us.total_picks DESC
    ) AS rank
  FROM public.user_stats us
  JOIN public.profiles p ON p.user_id = us.user_id
  JOIN public.privacy_settings ps ON ps.user_id = us.user_id
  WHERE
    ps.stats_visibility = 'public'
    AND us.total_picks > 0
    -- Exclude blocked users (either direction)
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = us.user_id)
         OR (b.blocker_id = us.user_id AND b.blocked_id = auth.uid())
    )
  ORDER BY
    CASE
      WHEN us.total_picks = 0 THEN 0
      ELSE us.correct_winner::NUMERIC / us.total_picks::NUMERIC
    END DESC,
    us.total_picks DESC
  LIMIT limit_count;
END;
$$;

-- ============================================================================
-- UPDATE: get_friends_leaderboard
-- Exclude blocked users from friends leaderboard
-- ============================================================================
CREATE OR REPLACE FUNCTION get_friends_leaderboard()
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  total_picks INTEGER,
  correct_picks INTEGER,
  accuracy NUMERIC,
  rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH friend_ids AS (
    SELECT
      CASE
        WHEN f.user_id = auth.uid() THEN f.friend_id
        ELSE f.user_id
      END AS friend_user_id
    FROM public.friendships f
    WHERE
      (f.user_id = auth.uid() OR f.friend_id = auth.uid())
      AND f.status = 'accepted'
      -- Exclude blocked friends
      AND NOT EXISTS (
        SELECT 1 FROM public.blocks b
        WHERE (b.blocker_id = auth.uid() AND b.blocked_id = CASE WHEN f.user_id = auth.uid() THEN f.friend_id ELSE f.user_id END)
           OR (b.blocker_id = CASE WHEN f.user_id = auth.uid() THEN f.friend_id ELSE f.user_id END AND b.blocked_id = auth.uid())
      )
  ),
  combined AS (
    -- Friends
    SELECT
      us.user_id,
      p.username,
      us.total_picks,
      us.correct_winner AS correct_picks,
      CASE
        WHEN us.total_picks = 0 THEN 0
        ELSE ROUND((us.correct_winner::NUMERIC / us.total_picks::NUMERIC) * 100, 1)
      END AS accuracy
    FROM public.user_stats us
    JOIN public.profiles p ON p.user_id = us.user_id
    JOIN friend_ids fi ON fi.friend_user_id = us.user_id
    WHERE us.total_picks > 0

    UNION ALL

    -- Include the authenticated user themselves
    SELECT
      us.user_id,
      p.username,
      us.total_picks,
      us.correct_winner AS correct_picks,
      CASE
        WHEN us.total_picks = 0 THEN 0
        ELSE ROUND((us.correct_winner::NUMERIC / us.total_picks::NUMERIC) * 100, 1)
      END AS accuracy
    FROM public.user_stats us
    JOIN public.profiles p ON p.user_id = us.user_id
    WHERE us.user_id = auth.uid()
  )
  SELECT
    c.user_id,
    c.username,
    c.total_picks,
    c.correct_picks,
    c.accuracy,
    ROW_NUMBER() OVER (
      ORDER BY
        CASE WHEN c.total_picks = 0 THEN 0 ELSE c.correct_picks::NUMERIC / c.total_picks::NUMERIC END DESC,
        c.total_picks DESC
    ) AS rank
  FROM combined c
  ORDER BY
    CASE WHEN c.total_picks = 0 THEN 0 ELSE c.correct_picks::NUMERIC / c.total_picks::NUMERIC END DESC,
    c.total_picks DESC;
END;
$$;

-- ============================================================================
-- UPDATE: get_friends
-- Exclude blocked users from friends list
-- ============================================================================
CREATE OR REPLACE FUNCTION get_friends()
RETURNS TABLE (
  friend_user_id UUID,
  username TEXT,
  total_picks INTEGER,
  correct_picks INTEGER,
  accuracy NUMERIC,
  became_friends_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN f.user_id = auth.uid() THEN f.friend_id
      ELSE f.user_id
    END AS friend_user_id,
    p.username,
    COALESCE(us.total_picks, 0) AS total_picks,
    COALESCE(us.correct_winner, 0) AS correct_picks,
    CASE
      WHEN COALESCE(us.total_picks, 0) = 0 THEN 0
      ELSE ROUND((COALESCE(us.correct_winner, 0)::NUMERIC / us.total_picks::NUMERIC) * 100, 1)
    END AS accuracy,
    f.updated_at AS became_friends_at
  FROM public.friendships f
  JOIN public.profiles p ON p.user_id = CASE
    WHEN f.user_id = auth.uid() THEN f.friend_id
    ELSE f.user_id
  END
  LEFT JOIN public.user_stats us ON us.user_id = p.user_id
  WHERE
    (f.user_id = auth.uid() OR f.friend_id = auth.uid())
    AND f.status = 'accepted'
    -- Exclude blocked users
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.user_id)
         OR (b.blocker_id = p.user_id AND b.blocked_id = auth.uid())
    )
  ORDER BY f.updated_at DESC;
END;
$$;

-- ============================================================================
-- NEW: search_users (with blocking filter)
-- Search for users by username, excluding blocked users
-- ============================================================================
CREATE OR REPLACE FUNCTION search_users(search_term TEXT, limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  total_picks INTEGER,
  correct_picks INTEGER,
  accuracy NUMERIC,
  is_following BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  clean_term TEXT;
BEGIN
  -- Remove @ prefix if present
  clean_term := LTRIM(search_term, '@');

  IF clean_term = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.username,
    p.avatar_url,
    COALESCE(us.total_picks, 0) AS total_picks,
    COALESCE(us.correct_winner, 0) AS correct_picks,
    CASE
      WHEN COALESCE(us.total_picks, 0) = 0 THEN 0
      ELSE ROUND((COALESCE(us.correct_winner, 0)::NUMERIC / us.total_picks::NUMERIC) * 100, 1)
    END AS accuracy,
    EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.user_id = auth.uid()
        AND f.friend_id = p.user_id
        AND f.status = 'accepted'
    ) AS is_following
  FROM public.profiles p
  LEFT JOIN public.user_stats us ON us.user_id = p.user_id
  WHERE
    p.username ILIKE '%' || clean_term || '%'
    AND p.user_id != auth.uid()
    -- Exclude blocked users
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.user_id)
         OR (b.blocker_id = p.user_id AND b.blocked_id = auth.uid())
    )
  ORDER BY
    -- Exact match first
    CASE WHEN LOWER(p.username) = LOWER(clean_term) THEN 0 ELSE 1 END,
    -- Then by total picks (more active users first)
    COALESCE(us.total_picks, 0) DESC
  LIMIT limit_count;
END;
$$;

GRANT EXECUTE ON FUNCTION search_users(TEXT, INTEGER) TO authenticated;

COMMENT ON FUNCTION search_users IS 'Search users by username with blocking filter';

-- ============================================================================
-- NEW: get_blocked_users
-- Get list of users the current user has blocked
-- ============================================================================
CREATE OR REPLACE FUNCTION get_blocked_users()
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  blocked_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.blocked_id AS user_id,
    p.username,
    p.avatar_url,
    b.created_at AS blocked_at
  FROM public.blocks b
  JOIN public.profiles p ON p.user_id = b.blocked_id
  WHERE b.blocker_id = auth.uid()
  ORDER BY b.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_blocked_users() TO authenticated;

COMMENT ON FUNCTION get_blocked_users IS 'Get list of users blocked by the current user';

-- ============================================================================
-- NEW: get_pending_reports (Admin)
-- Get pending reports for moderation
-- ============================================================================
CREATE OR REPLACE FUNCTION get_pending_reports(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  report_id UUID,
  reporter_username TEXT,
  reported_user_id UUID,
  reported_username TEXT,
  reason TEXT,
  details TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  report_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    r.id AS report_id,
    reporter_p.username AS reporter_username,
    r.reported_user_id,
    reported_p.username AS reported_username,
    r.reason,
    r.details,
    r.status,
    r.created_at,
    -- Count total reports against this user
    (SELECT COUNT(*) FROM public.reports WHERE reported_user_id = r.reported_user_id) AS report_count
  FROM public.reports r
  JOIN public.profiles reporter_p ON reporter_p.user_id = r.reporter_id
  JOIN public.profiles reported_p ON reported_p.user_id = r.reported_user_id
  WHERE r.status = 'pending'
  ORDER BY r.created_at ASC  -- Oldest first
  LIMIT limit_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_pending_reports(INTEGER) TO authenticated;

COMMENT ON FUNCTION get_pending_reports IS 'Get pending reports for admin review';

-- ============================================================================
-- NEW: review_report (Admin)
-- Update report status and take action
-- ============================================================================
CREATE OR REPLACE FUNCTION review_report(
  report_id_input UUID,
  new_status TEXT,
  action_taken_input TEXT DEFAULT NULL,
  admin_notes_input TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Validate status
  IF new_status NOT IN ('reviewed', 'actioned', 'dismissed') THEN
    RAISE EXCEPTION 'Invalid status: must be reviewed, actioned, or dismissed';
  END IF;

  UPDATE public.reports
  SET
    status = new_status,
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    action_taken = action_taken_input,
    admin_notes = admin_notes_input
  WHERE id = report_id_input;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION review_report(UUID, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION review_report IS 'Admin function to review and action reports';
