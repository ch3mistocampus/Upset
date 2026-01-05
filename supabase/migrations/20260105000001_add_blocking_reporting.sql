-- Add Blocking and Reporting System
-- Phase 1: Safety features required for App Store
--
-- Tables:
-- 1. blocks - User blocking (bidirectional hide)
-- 2. reports - User reports for moderation
-- 3. admin_users - Simple admin role tracking

-- ============================================================================
-- BLOCKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id),
  CONSTRAINT no_self_block CHECK (blocker_id != blocked_id)
);

COMMENT ON TABLE public.blocks IS 'User blocks - blocked users are hidden from blocker and vice versa';
COMMENT ON COLUMN public.blocks.blocker_id IS 'User who initiated the block';
COMMENT ON COLUMN public.blocks.blocked_id IS 'User who was blocked';

CREATE INDEX idx_blocks_blocker ON public.blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON public.blocks(blocked_id);

-- ============================================================================
-- REPORTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN (
    'spam',
    'harassment',
    'inappropriate_username',
    'impersonation',
    'cheating',
    'other'
  )),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'reviewed',
    'actioned',
    'dismissed'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  action_taken TEXT,
  admin_notes TEXT,

  CONSTRAINT no_self_report CHECK (reporter_id != reported_user_id)
);

COMMENT ON TABLE public.reports IS 'User reports for moderation review';
COMMENT ON COLUMN public.reports.reason IS 'Category of the report';
COMMENT ON COLUMN public.reports.status IS 'pending, reviewed, actioned, dismissed';
COMMENT ON COLUMN public.reports.action_taken IS 'Action taken: warning, suspended, banned, etc.';

CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_reports_reported_user ON public.reports(reported_user_id);
CREATE INDEX idx_reports_created ON public.reports(created_at DESC);

-- ============================================================================
-- ADMIN USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'moderator' CHECK (role IN ('moderator', 'admin', 'super_admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE public.admin_users IS 'Users with admin/moderation privileges';
COMMENT ON COLUMN public.admin_users.role IS 'moderator (review reports), admin (manage users), super_admin (full access)';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Check if two users have a block relationship (either direction)
CREATE OR REPLACE FUNCTION is_blocked(user_a UUID, user_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = user_a AND blocked_id = user_b)
       OR (blocker_id = user_b AND blocked_id = user_a)
  );
$$;

COMMENT ON FUNCTION is_blocked IS 'Check if a block exists between two users (either direction)';

-- Check if current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION is_admin IS 'Check if the current authenticated user has admin privileges';

-- Get admin role for current user
CREATE OR REPLACE FUNCTION get_admin_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.admin_users
  WHERE user_id = auth.uid();
$$;

COMMENT ON FUNCTION get_admin_role IS 'Get the admin role of the current user (null if not admin)';

-- ============================================================================
-- RLS POLICIES - BLOCKS
-- ============================================================================
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Users can view their own blocks
CREATE POLICY "Users can view their own blocks" ON public.blocks
  FOR SELECT
  USING (auth.uid() = blocker_id);

-- Users can create blocks
CREATE POLICY "Users can block others" ON public.blocks
  FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

-- Users can unblock
CREATE POLICY "Users can unblock" ON public.blocks
  FOR DELETE
  USING (auth.uid() = blocker_id);

-- ============================================================================
-- RLS POLICIES - REPORTS
-- ============================================================================
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own reports (that they submitted)
CREATE POLICY "Users can view their own submitted reports" ON public.reports
  FOR SELECT
  USING (auth.uid() = reporter_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports" ON public.reports
  FOR SELECT
  USING (is_admin());

-- Users can create reports
CREATE POLICY "Users can submit reports" ON public.reports
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_id AND status = 'pending');

-- Admins can update reports (review, action, dismiss)
CREATE POLICY "Admins can update reports" ON public.reports
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- RLS POLICIES - ADMIN USERS
-- ============================================================================
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Only super_admins can view admin list
CREATE POLICY "Super admins can view admin list" ON public.admin_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Users can check if they are admin (for their own record only)
CREATE POLICY "Users can check own admin status" ON public.admin_users
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only super_admins can add admins
CREATE POLICY "Super admins can add admins" ON public.admin_users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT SELECT ON public.admin_users TO authenticated;
GRANT EXECUTE ON FUNCTION is_blocked(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_role() TO authenticated;
