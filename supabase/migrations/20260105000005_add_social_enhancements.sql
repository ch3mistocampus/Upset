-- Social Enhancements Migration
-- Features: Account deletion, Mutes, Activity Likes, Privacy Settings, User Suggestions
--
-- Apple App Store Requirements:
-- - Account deletion capability (required)
-- - Privacy controls

-- ============================================================================
-- MUTES TABLE (soft block - hidden from feed but can still follow)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  muted_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_mute UNIQUE (user_id, muted_user_id),
  CONSTRAINT no_self_mute CHECK (user_id != muted_user_id)
);

CREATE INDEX idx_mutes_user ON public.mutes(user_id);
CREATE INDEX idx_mutes_muted ON public.mutes(muted_user_id);

COMMENT ON TABLE public.mutes IS 'Users muted by other users - hidden from feed but not blocked';

-- RLS for mutes
ALTER TABLE public.mutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mutes" ON public.mutes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can mute others" ON public.mutes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unmute" ON public.mutes
  FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.mutes TO authenticated;

-- ============================================================================
-- ACTIVITY LIKES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.activity_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_activity_like UNIQUE (activity_id, user_id)
);

CREATE INDEX idx_activity_likes_activity ON public.activity_likes(activity_id);
CREATE INDEX idx_activity_likes_user ON public.activity_likes(user_id);

COMMENT ON TABLE public.activity_likes IS 'Likes on activity feed items';

-- RLS for activity likes
ALTER TABLE public.activity_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes" ON public.activity_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like activities" ON public.activity_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike" ON public.activity_likes
  FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.activity_likes TO authenticated;

-- Add like_count to activities for quick access
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- Function to update like count
CREATE OR REPLACE FUNCTION update_activity_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.activities SET like_count = like_count + 1 WHERE id = NEW.activity_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.activities SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.activity_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activity_like_count_trigger
  AFTER INSERT OR DELETE ON public.activity_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_like_count();

-- ============================================================================
-- PRIVACY SETTINGS
-- Note: Following is open (no approval required). Privacy settings control
-- visibility levels (public/friends/private) but not account privacy.

-- ============================================================================
-- ACCOUNT DELETION FUNCTION (Apple Required)
-- ============================================================================
CREATE OR REPLACE FUNCTION delete_user_account(confirmation_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  deleted_data JSONB;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Require confirmation text for safety
  IF confirmation_text != 'DELETE MY ACCOUNT' THEN
    RAISE EXCEPTION 'Invalid confirmation. Please type "DELETE MY ACCOUNT" to confirm.';
  END IF;

  -- Collect summary of what will be deleted
  SELECT jsonb_build_object(
    'picks_deleted', (SELECT COUNT(*) FROM public.picks WHERE user_id = current_user_id),
    'activities_deleted', (SELECT COUNT(*) FROM public.activities WHERE user_id = current_user_id),
    'friendships_deleted', (SELECT COUNT(*) FROM public.friendships WHERE user_id = current_user_id OR friend_id = current_user_id)
  ) INTO deleted_data;

  -- Delete user data (cascade will handle most, but be explicit)
  DELETE FROM public.picks WHERE user_id = current_user_id;
  DELETE FROM public.activities WHERE user_id = current_user_id;
  DELETE FROM public.friendships WHERE user_id = current_user_id OR friend_id = current_user_id;
  DELETE FROM public.blocks WHERE user_id = current_user_id OR blocked_user_id = current_user_id;
  DELETE FROM public.mutes WHERE user_id = current_user_id OR muted_user_id = current_user_id;
  DELETE FROM public.reports WHERE reporter_id = current_user_id;
  DELETE FROM public.push_tokens WHERE user_id = current_user_id;
  DELETE FROM public.notification_preferences WHERE user_id = current_user_id;
  DELETE FROM public.notification_queue WHERE user_id = current_user_id;
  DELETE FROM public.notification_log WHERE user_id = current_user_id;
  DELETE FROM public.activity_likes WHERE user_id = current_user_id;
  DELETE FROM public.user_interactions WHERE user_id = current_user_id OR target_user_id = current_user_id;

  -- Delete profile (this should cascade from auth.users deletion)
  DELETE FROM public.profiles WHERE user_id = current_user_id;

  -- Note: The actual auth.users deletion should be done via Supabase Admin API
  -- or a separate Edge Function with service role, as we can't delete from auth schema directly

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Account data deleted. Please sign out to complete the process.',
    'deleted', deleted_data
  );
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_account(TEXT) TO authenticated;

-- ============================================================================
-- MUTE HELPER FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION is_muted(check_user_id UUID, by_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mutes
    WHERE user_id = by_user_id AND muted_user_id = check_user_id
  );
$$;

CREATE OR REPLACE FUNCTION get_muted_users(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  muted_user_id UUID,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  requesting_user UUID;
BEGIN
  requesting_user := COALESCE(p_user_id, auth.uid());

  RETURN QUERY
  SELECT
    m.id,
    m.muted_user_id,
    p.username,
    p.avatar_url,
    m.created_at
  FROM public.mutes m
  JOIN public.profiles p ON p.user_id = m.muted_user_id
  WHERE m.user_id = requesting_user
  ORDER BY m.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION is_muted(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_muted_users(UUID) TO authenticated;

-- ============================================================================
-- USER SUGGESTIONS FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_suggestions(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  accuracy_pct NUMERIC,
  total_picks INTEGER,
  mutual_follows INTEGER,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cur_user_id UUID;
BEGIN
  cur_user_id := auth.uid();

  IF cur_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  WITH user_follows AS (
    -- Users the current user follows
    SELECT friend_id FROM public.friendships
    WHERE user_id = cur_user_id AND status = 'accepted'
  ),
  blocked_users AS (
    SELECT blocked_user_id FROM public.blocks WHERE user_id = cur_user_id
    UNION
    SELECT user_id FROM public.blocks WHERE blocked_user_id = cur_user_id
  ),
  mutual_follow_counts AS (
    -- Count mutual follows (friends of friends)
    SELECT
      f2.friend_id AS suggested_user,
      COUNT(*) AS mutual_count
    FROM user_follows uf
    JOIN public.friendships f2 ON f2.user_id = uf.friend_id AND f2.status = 'accepted'
    WHERE f2.friend_id != cur_user_id
      AND f2.friend_id NOT IN (SELECT friend_id FROM user_follows)
      AND f2.friend_id NOT IN (SELECT blocked_user_id FROM blocked_users)
    GROUP BY f2.friend_id
  ),
  top_predictors AS (
    -- Top predictors by accuracy
    SELECT
      p.user_id AS suggested_user,
      us.accuracy_pct,
      us.total_picks
    FROM public.profiles p
    JOIN public.user_stats us ON us.user_id = p.user_id
    WHERE p.user_id != cur_user_id
      AND p.user_id NOT IN (SELECT friend_id FROM user_follows)
      AND p.user_id NOT IN (SELECT blocked_user_id FROM blocked_users)
      AND us.total_picks >= 10
    ORDER BY us.accuracy_pct DESC
    LIMIT 20
  )
  -- Combine suggestions with reasons
  SELECT DISTINCT ON (suggested.user_id)
    suggested.user_id,
    p.username,
    p.avatar_url,
    COALESCE(us.accuracy_pct, 0) AS accuracy_pct,
    COALESCE(us.total_picks, 0) AS total_picks,
    COALESCE(mfc.mutual_count, 0)::INTEGER AS mutual_follows,
    CASE
      WHEN mfc.mutual_count > 0 THEN 'mutual_follows'
      WHEN tp.suggested_user IS NOT NULL THEN 'top_predictor'
      ELSE 'popular'
    END AS reason
  FROM (
    SELECT suggested_user AS user_id FROM mutual_follow_counts
    UNION
    SELECT suggested_user AS user_id FROM top_predictors
  ) suggested
  JOIN public.profiles p ON p.user_id = suggested.user_id
  LEFT JOIN public.user_stats us ON us.user_id = suggested.user_id
  LEFT JOIN mutual_follow_counts mfc ON mfc.suggested_user = suggested.user_id
  LEFT JOIN top_predictors tp ON tp.suggested_user = suggested.user_id
  ORDER BY suggested.user_id, mfc.mutual_count DESC NULLS LAST, us.accuracy_pct DESC NULLS LAST
  LIMIT limit_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_suggestions(INTEGER) TO authenticated;

-- ============================================================================
-- UPDATE FEED FUNCTIONS TO EXCLUDE MUTED USERS
-- ============================================================================
-- Drop existing functions first (different signature from migration 3)
DROP FUNCTION IF EXISTS get_discover_feed(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_following_feed(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_trending_users(INTEGER);

CREATE OR REPLACE FUNCTION get_discover_feed(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  activity_type TEXT,
  title TEXT,
  description TEXT,
  metadata JSONB,
  engagement_score NUMERIC,
  like_count INTEGER,
  is_liked BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cur_user_id UUID;
BEGIN
  cur_user_id := auth.uid();

  RETURN QUERY
  SELECT
    a.id,
    a.user_id,
    p.username,
    p.avatar_url,
    a.activity_type,
    a.title,
    a.description,
    a.metadata,
    a.engagement_score,
    a.like_count,
    EXISTS (
      SELECT 1 FROM public.activity_likes al
      WHERE al.activity_id = a.id AND al.user_id = cur_user_id
    ) AS is_liked,
    a.created_at
  FROM public.activities a
  JOIN public.profiles p ON p.user_id = a.user_id
  WHERE a.is_public = true
    -- Exclude blocked users
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.user_id = cur_user_id AND b.blocked_user_id = a.user_id)
         OR (b.blocked_user_id = cur_user_id AND b.user_id = a.user_id)
    )
    -- Exclude muted users
    AND NOT EXISTS (
      SELECT 1 FROM public.mutes m
      WHERE m.user_id = cur_user_id AND m.muted_user_id = a.user_id
    )
  ORDER BY a.engagement_score DESC, a.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION get_following_feed(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  activity_type TEXT,
  title TEXT,
  description TEXT,
  metadata JSONB,
  engagement_score NUMERIC,
  like_count INTEGER,
  is_liked BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cur_user_id UUID;
BEGIN
  cur_user_id := auth.uid();

  IF cur_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.user_id,
    p.username,
    p.avatar_url,
    a.activity_type,
    a.title,
    a.description,
    a.metadata,
    a.engagement_score,
    a.like_count,
    EXISTS (
      SELECT 1 FROM public.activity_likes al
      WHERE al.activity_id = a.id AND al.user_id = cur_user_id
    ) AS is_liked,
    a.created_at
  FROM public.activities a
  JOIN public.profiles p ON p.user_id = a.user_id
  WHERE a.user_id IN (
    SELECT friend_id FROM public.friendships
    WHERE user_id = cur_user_id AND status = 'accepted'
  )
  -- Exclude muted users (even if following)
  AND NOT EXISTS (
    SELECT 1 FROM public.mutes m
    WHERE m.user_id = cur_user_id AND m.muted_user_id = a.user_id
  )
  ORDER BY a.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ============================================================================
-- ACTIVITY LIKE FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION toggle_activity_like(p_activity_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cur_user_id UUID;
  existing_like UUID;
  new_like_count INTEGER;
BEGIN
  cur_user_id := auth.uid();

  IF cur_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if already liked
  SELECT id INTO existing_like
  FROM public.activity_likes
  WHERE activity_id = p_activity_id AND user_id = cur_user_id;

  IF existing_like IS NOT NULL THEN
    -- Unlike
    DELETE FROM public.activity_likes WHERE id = existing_like;

    SELECT like_count INTO new_like_count
    FROM public.activities WHERE id = p_activity_id;

    RETURN jsonb_build_object('liked', false, 'like_count', new_like_count);
  ELSE
    -- Like
    INSERT INTO public.activity_likes (activity_id, user_id)
    VALUES (p_activity_id, cur_user_id);

    SELECT like_count INTO new_like_count
    FROM public.activities WHERE id = p_activity_id;

    RETURN jsonb_build_object('liked', true, 'like_count', new_like_count);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION toggle_activity_like(UUID) TO authenticated;

-- ============================================================================
-- CHECK FOR NEW ACTIVITIES (for "New posts" indicator)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_new_activity_count(since_timestamp TIMESTAMPTZ)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cur_user_id UUID;
  new_count INTEGER;
BEGIN
  cur_user_id := auth.uid();

  SELECT COUNT(*)::INTEGER INTO new_count
  FROM public.activities a
  JOIN public.profiles p ON p.user_id = a.user_id
  WHERE a.is_public = true
    AND a.created_at > since_timestamp
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.user_id = cur_user_id AND b.blocked_user_id = a.user_id)
         OR (b.blocked_user_id = cur_user_id AND b.user_id = a.user_id)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.mutes m
      WHERE m.user_id = cur_user_id AND m.muted_user_id = a.user_id
    );

  RETURN new_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_new_activity_count(TIMESTAMPTZ) TO authenticated;

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT ALL ON public.mutes TO service_role;
GRANT ALL ON public.activity_likes TO service_role;
