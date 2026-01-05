-- Add Activity Feed System
-- Phase 2: User discovery through activity feed
--
-- Tables:
-- 1. activities - Feed events
-- 2. user_interests - Track user engagement for relevance scoring

-- ============================================================================
-- ACTIVITIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'made_picks',        -- User made picks for an event
    'picks_graded',      -- User's picks were graded
    'new_user',          -- User joined the platform
    'streak_milestone',  -- User hit 5, 10, 20, 50 streak
    'accuracy_milestone', -- User crossed 60%, 70%, 80%, 90%
    'followed_user',     -- User followed someone
    'event_winner'       -- User was top predictor for an event
  )),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- For followed_user type
  metadata JSONB DEFAULT '{}',
  engagement_score INTEGER DEFAULT 0, -- Calculated score for ranking
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.activities IS 'Activity feed events for user discovery';
COMMENT ON COLUMN public.activities.type IS 'Type of activity';
COMMENT ON COLUMN public.activities.metadata IS 'Flexible data: {correct: 8, total: 12, streak: 10, etc}';
COMMENT ON COLUMN public.activities.engagement_score IS 'Score for feed ranking (higher = more prominent)';

CREATE INDEX idx_activities_user ON public.activities(user_id, created_at DESC);
CREATE INDEX idx_activities_created ON public.activities(created_at DESC);
CREATE INDEX idx_activities_type ON public.activities(type, created_at DESC);
CREATE INDEX idx_activities_engagement ON public.activities(engagement_score DESC, created_at DESC);

-- ============================================================================
-- USER INTERACTIONS TABLE
-- Track who interacts with whom for relevance
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN (
    'profile_view',
    'followed',
    'unfollowed'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT no_self_interaction CHECK (user_id != target_user_id)
);

COMMENT ON TABLE public.user_interactions IS 'Track user interactions for feed relevance';

CREATE INDEX idx_interactions_user ON public.user_interactions(user_id, created_at DESC);
CREATE INDEX idx_interactions_target ON public.user_interactions(target_user_id, created_at DESC);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Calculate engagement score for an activity
CREATE OR REPLACE FUNCTION calculate_engagement_score(
  activity_type TEXT,
  metadata JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  score INTEGER := 0;
BEGIN
  -- Base scores by type
  CASE activity_type
    WHEN 'event_winner' THEN score := 100;
    WHEN 'accuracy_milestone' THEN score := 80;
    WHEN 'streak_milestone' THEN score := 70;
    WHEN 'picks_graded' THEN score := 50;
    WHEN 'made_picks' THEN score := 30;
    WHEN 'followed_user' THEN score := 20;
    WHEN 'new_user' THEN score := 10;
    ELSE score := 0;
  END CASE;

  -- Bonus for high accuracy
  IF metadata ? 'accuracy' THEN
    IF (metadata->>'accuracy')::NUMERIC >= 80 THEN
      score := score + 30;
    ELSIF (metadata->>'accuracy')::NUMERIC >= 70 THEN
      score := score + 20;
    ELSIF (metadata->>'accuracy')::NUMERIC >= 60 THEN
      score := score + 10;
    END IF;
  END IF;

  -- Bonus for milestones
  IF metadata ? 'streak' THEN
    IF (metadata->>'streak')::INTEGER >= 20 THEN
      score := score + 40;
    ELSIF (metadata->>'streak')::INTEGER >= 10 THEN
      score := score + 20;
    END IF;
  END IF;

  -- Bonus for high pick counts
  IF metadata ? 'total_picks' THEN
    IF (metadata->>'total_picks')::INTEGER >= 10 THEN
      score := score + 10;
    END IF;
  END IF;

  RETURN score;
END;
$$;

-- Create activity with auto-calculated engagement score
CREATE OR REPLACE FUNCTION create_activity(
  p_user_id UUID,
  p_type TEXT,
  p_event_id UUID DEFAULT NULL,
  p_target_user_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
  score INTEGER;
BEGIN
  score := calculate_engagement_score(p_type, p_metadata);

  INSERT INTO public.activities (user_id, type, event_id, target_user_id, metadata, engagement_score)
  VALUES (p_user_id, p_type, p_event_id, p_target_user_id, p_metadata, score)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_activity(UUID, TEXT, UUID, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION create_activity(UUID, TEXT, UUID, UUID, JSONB) TO service_role;

-- ============================================================================
-- FEED FUNCTIONS
-- ============================================================================

-- Get discover feed (all public activities, ranked by engagement and recency)
CREATE OR REPLACE FUNCTION get_discover_feed(
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  activity_id UUID,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  type TEXT,
  event_id UUID,
  event_name TEXT,
  target_username TEXT,
  metadata JSONB,
  engagement_score INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id AS activity_id,
    a.user_id,
    p.username,
    p.avatar_url,
    a.type,
    a.event_id,
    e.name AS event_name,
    tp.username AS target_username,
    a.metadata,
    a.engagement_score,
    a.created_at
  FROM public.activities a
  JOIN public.profiles p ON p.user_id = a.user_id
  JOIN public.privacy_settings ps ON ps.user_id = a.user_id
  LEFT JOIN public.events e ON e.id = a.event_id
  LEFT JOIN public.profiles tp ON tp.user_id = a.target_user_id
  WHERE
    -- Only public activities
    ps.profile_visibility = 'public'
    -- Exclude blocked users
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = a.user_id)
         OR (b.blocker_id = a.user_id AND b.blocked_id = auth.uid())
    )
    -- Exclude own activities
    AND a.user_id != auth.uid()
    -- Recent activities only (last 30 days)
    AND a.created_at > now() - INTERVAL '30 days'
  ORDER BY
    -- Weighted by engagement and recency
    (a.engagement_score * 0.4) + (EXTRACT(EPOCH FROM (a.created_at - (now() - INTERVAL '30 days'))) / 86400 * 0.6) DESC,
    a.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_discover_feed(INTEGER, INTEGER) TO authenticated;

-- Get following feed (activities from people you follow)
CREATE OR REPLACE FUNCTION get_following_feed(
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  activity_id UUID,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  type TEXT,
  event_id UUID,
  event_name TEXT,
  target_username TEXT,
  metadata JSONB,
  engagement_score INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id AS activity_id,
    a.user_id,
    p.username,
    p.avatar_url,
    a.type,
    a.event_id,
    e.name AS event_name,
    tp.username AS target_username,
    a.metadata,
    a.engagement_score,
    a.created_at
  FROM public.activities a
  JOIN public.profiles p ON p.user_id = a.user_id
  LEFT JOIN public.events e ON e.id = a.event_id
  LEFT JOIN public.profiles tp ON tp.user_id = a.target_user_id
  WHERE
    -- Only from people I follow
    EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.user_id = auth.uid()
        AND f.friend_id = a.user_id
        AND f.status = 'accepted'
    )
    -- Exclude blocked users
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = a.user_id)
         OR (b.blocker_id = a.user_id AND b.blocked_id = auth.uid())
    )
    -- Recent activities only (last 30 days)
    AND a.created_at > now() - INTERVAL '30 days'
  ORDER BY a.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_following_feed(INTEGER, INTEGER) TO authenticated;

-- Get trending users (high engagement recently)
CREATE OR REPLACE FUNCTION get_trending_users(limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  total_picks INTEGER,
  correct_picks INTEGER,
  accuracy NUMERIC,
  current_streak INTEGER,
  recent_score BIGINT,
  is_following BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH recent_activity AS (
    SELECT
      a.user_id,
      SUM(a.engagement_score) AS total_score
    FROM public.activities a
    WHERE a.created_at > now() - INTERVAL '7 days'
    GROUP BY a.user_id
  )
  SELECT
    p.user_id,
    p.username,
    p.avatar_url,
    COALESCE(us.total_picks, 0) AS total_picks,
    COALESCE(us.correct_winner, 0) AS correct_picks,
    COALESCE(us.accuracy_pct, 0) AS accuracy,
    COALESCE(us.current_streak, 0) AS current_streak,
    COALESCE(ra.total_score, 0) AS recent_score,
    EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.user_id = auth.uid()
        AND f.friend_id = p.user_id
        AND f.status = 'accepted'
    ) AS is_following
  FROM public.profiles p
  JOIN public.privacy_settings ps ON ps.user_id = p.user_id
  LEFT JOIN public.user_stats us ON us.user_id = p.user_id
  LEFT JOIN recent_activity ra ON ra.user_id = p.user_id
  WHERE
    ps.profile_visibility = 'public'
    AND p.user_id != auth.uid()
    -- Exclude blocked users
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.user_id)
         OR (b.blocker_id = p.user_id AND b.blocked_id = auth.uid())
    )
    -- Has some activity
    AND COALESCE(us.total_picks, 0) > 0
  ORDER BY
    COALESCE(ra.total_score, 0) DESC,
    us.accuracy_pct DESC,
    us.current_streak DESC
  LIMIT limit_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_trending_users(INTEGER) TO authenticated;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Users can view activities based on privacy
CREATE POLICY "Users can view public activities" ON public.activities
  FOR SELECT
  USING (
    -- Own activities
    user_id = auth.uid()
    OR (
      -- Public activities from non-blocked users
      EXISTS (
        SELECT 1 FROM public.privacy_settings ps
        WHERE ps.user_id = activities.user_id
        AND ps.profile_visibility = 'public'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.blocks b
        WHERE (b.blocker_id = auth.uid() AND b.blocked_id = activities.user_id)
           OR (b.blocker_id = activities.user_id AND b.blocked_id = auth.uid())
      )
    )
    OR (
      -- Friends-only activities from friends
      EXISTS (
        SELECT 1 FROM public.privacy_settings ps
        WHERE ps.user_id = activities.user_id
        AND ps.profile_visibility = 'friends'
      )
      AND EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE f.status = 'accepted'
        AND ((f.user_id = auth.uid() AND f.friend_id = activities.user_id)
             OR (f.friend_id = auth.uid() AND f.user_id = activities.user_id))
      )
    )
  );

-- Service role can insert activities (from Edge Functions)
CREATE POLICY "Service role can insert activities" ON public.activities
  FOR INSERT
  WITH CHECK (true);

-- Interactions table RLS
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own interactions" ON public.user_interactions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create interactions" ON public.user_interactions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT SELECT ON public.activities TO authenticated;
GRANT INSERT ON public.activities TO service_role;
GRANT SELECT, INSERT ON public.user_interactions TO authenticated;
