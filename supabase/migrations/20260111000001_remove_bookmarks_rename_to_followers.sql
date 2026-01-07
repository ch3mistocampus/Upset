-- Remove bookmarks feature and rename friends to followers
-- This migration:
-- 1. Drops post_bookmarks table and related functions
-- 2. Renames friendships table to follows
-- 3. Updates visibility levels from 'friends' to 'followers'
-- 4. Updates all RPC functions to use follower terminology

-- ============================================================================
-- 1. DROP BOOKMARKS FEATURE
-- ============================================================================

-- Drop bookmark functions
DROP FUNCTION IF EXISTS public.toggle_post_bookmark(UUID);
DROP FUNCTION IF EXISTS public.get_bookmarked_posts(INT, INT);

-- Drop bookmarks table (will cascade indexes and policies)
DROP TABLE IF EXISTS public.post_bookmarks;

-- ============================================================================
-- 2. RENAME FRIENDSHIPS TO FOLLOWS
-- ============================================================================

-- Rename the table
ALTER TABLE IF EXISTS public.friendships RENAME TO follows;

-- Rename friend_id column to following_id (the person being followed)
ALTER TABLE IF EXISTS public.follows RENAME COLUMN friend_id TO following_id;

-- Rename the index
DROP INDEX IF EXISTS idx_friendships_user_id;
DROP INDEX IF EXISTS idx_friendships_friend_id;
CREATE INDEX IF NOT EXISTS idx_follows_user_id ON public.follows(user_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);

-- Update constraint names
ALTER TABLE IF EXISTS public.follows
  DROP CONSTRAINT IF EXISTS friendships_pkey;
ALTER TABLE IF EXISTS public.follows
  DROP CONSTRAINT IF EXISTS friendships_user_id_friend_id_key;
ALTER TABLE IF EXISTS public.follows
  DROP CONSTRAINT IF EXISTS no_self_friendship;

-- Add new constraints
ALTER TABLE IF EXISTS public.follows
  ADD CONSTRAINT follows_pkey PRIMARY KEY (id);
ALTER TABLE IF EXISTS public.follows
  ADD CONSTRAINT follows_user_following_unique UNIQUE (user_id, following_id);
ALTER TABLE IF EXISTS public.follows
  ADD CONSTRAINT no_self_follow CHECK (user_id != following_id);

-- ============================================================================
-- 3. UPDATE PRIVACY SETTINGS - 'friends' -> 'followers'
-- ============================================================================

-- Update existing data
UPDATE public.privacy_settings SET picks_visibility = 'followers' WHERE picks_visibility = 'friends';
UPDATE public.privacy_settings SET profile_visibility = 'followers' WHERE profile_visibility = 'friends';
UPDATE public.privacy_settings SET stats_visibility = 'followers' WHERE stats_visibility = 'friends';

-- Drop old constraints and add new ones
ALTER TABLE public.privacy_settings
  DROP CONSTRAINT IF EXISTS privacy_settings_picks_visibility_check;
ALTER TABLE public.privacy_settings
  DROP CONSTRAINT IF EXISTS privacy_settings_profile_visibility_check;
ALTER TABLE public.privacy_settings
  DROP CONSTRAINT IF EXISTS privacy_settings_stats_visibility_check;

ALTER TABLE public.privacy_settings
  ADD CONSTRAINT privacy_settings_picks_visibility_check
  CHECK (picks_visibility IN ('public', 'followers', 'private'));
ALTER TABLE public.privacy_settings
  ADD CONSTRAINT privacy_settings_profile_visibility_check
  CHECK (profile_visibility IN ('public', 'followers', 'private'));
ALTER TABLE public.privacy_settings
  ADD CONSTRAINT privacy_settings_stats_visibility_check
  CHECK (stats_visibility IN ('public', 'followers', 'private'));

-- ============================================================================
-- 4. UPDATE RLS POLICIES FOR FOLLOWS TABLE
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own friendships" ON public.follows;
DROP POLICY IF EXISTS "Users can view friendships involving them" ON public.follows;
DROP POLICY IF EXISTS "Users can send friend requests" ON public.follows;
DROP POLICY IF EXISTS "Users can follow others" ON public.follows;
DROP POLICY IF EXISTS "Users can respond to friend requests" ON public.follows;
DROP POLICY IF EXISTS "Users can delete friendships" ON public.follows;
DROP POLICY IF EXISTS "Users can delete their own friendships" ON public.follows;

-- Create new policies with follower terminology
CREATE POLICY "Users can view follows involving them" ON public.follows
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = following_id);

CREATE POLICY "Users can follow others" ON public.follows
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status IN ('pending', 'accepted'));

CREATE POLICY "Users can unfollow" ON public.follows
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 5. UPDATE RPC FUNCTIONS
-- ============================================================================

-- Update get_friends to get_following
CREATE OR REPLACE FUNCTION public.get_following()
RETURNS TABLE (
  following_user_id UUID,
  username TEXT,
  avatar_url TEXT,
  total_picks BIGINT,
  correct_picks BIGINT,
  accuracy NUMERIC,
  followed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.following_id AS following_user_id,
    p.username,
    p.avatar_url,
    COALESCE(s.total_picks, 0)::BIGINT AS total_picks,
    COALESCE(s.correct_winner, 0)::BIGINT AS correct_picks,
    CASE
      WHEN COALESCE(s.total_picks, 0) > 0
      THEN ROUND((COALESCE(s.correct_winner, 0)::NUMERIC / s.total_picks) * 100, 1)
      ELSE 0
    END AS accuracy,
    f.created_at AS followed_at
  FROM follows f
  JOIN profiles p ON p.user_id = f.following_id
  LEFT JOIN user_stats s ON s.user_id = f.following_id
  LEFT JOIN blocks b ON (
    (b.blocker_id = auth.uid() AND b.blocked_id = f.following_id) OR
    (b.blocker_id = f.following_id AND b.blocked_id = auth.uid())
  )
  WHERE f.user_id = auth.uid()
    AND f.status = 'accepted'
    AND b.id IS NULL
  ORDER BY f.created_at DESC;
END;
$$;

-- Keep get_friends as an alias for backwards compatibility
CREATE OR REPLACE FUNCTION public.get_friends()
RETURNS TABLE (
  friend_user_id UUID,
  username TEXT,
  total_picks BIGINT,
  correct_picks BIGINT,
  accuracy NUMERIC,
  became_friends_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    following_user_id AS friend_user_id,
    f.username,
    f.total_picks,
    f.correct_picks,
    f.accuracy,
    f.followed_at AS became_friends_at
  FROM get_following() f;
END;
$$;

-- Update get_followers function
CREATE OR REPLACE FUNCTION public.get_followers()
RETURNS TABLE (
  follower_user_id UUID,
  username TEXT,
  avatar_url TEXT,
  total_picks BIGINT,
  correct_picks BIGINT,
  accuracy NUMERIC,
  followed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.user_id AS follower_user_id,
    p.username,
    p.avatar_url,
    COALESCE(s.total_picks, 0)::BIGINT AS total_picks,
    COALESCE(s.correct_winner, 0)::BIGINT AS correct_picks,
    CASE
      WHEN COALESCE(s.total_picks, 0) > 0
      THEN ROUND((COALESCE(s.correct_winner, 0)::NUMERIC / s.total_picks) * 100, 1)
      ELSE 0
    END AS accuracy,
    f.created_at AS followed_at
  FROM follows f
  JOIN profiles p ON p.user_id = f.user_id
  LEFT JOIN user_stats s ON s.user_id = f.user_id
  LEFT JOIN blocks b ON (
    (b.blocker_id = auth.uid() AND b.blocked_id = f.user_id) OR
    (b.blocker_id = f.user_id AND b.blocked_id = auth.uid())
  )
  WHERE f.following_id = auth.uid()
    AND f.status = 'accepted'
    AND b.id IS NULL
  ORDER BY f.created_at DESC;
END;
$$;

-- Update followers leaderboard function
CREATE OR REPLACE FUNCTION public.get_followers_leaderboard()
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  total_picks BIGINT,
  correct_picks BIGINT,
  accuracy NUMERIC,
  rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH follower_stats AS (
    -- Get people you follow
    SELECT
      f.following_id AS uid,
      p.username,
      COALESCE(s.total_picks, 0)::BIGINT AS total_picks,
      COALESCE(s.correct_winner, 0)::BIGINT AS correct_picks,
      CASE
        WHEN COALESCE(s.total_picks, 0) > 0
        THEN ROUND((COALESCE(s.correct_winner, 0)::NUMERIC / s.total_picks) * 100, 1)
        ELSE 0
      END AS accuracy
    FROM follows f
    JOIN profiles p ON p.user_id = f.following_id
    LEFT JOIN user_stats s ON s.user_id = f.following_id
    LEFT JOIN blocks b ON (
      (b.blocker_id = auth.uid() AND b.blocked_id = f.following_id) OR
      (b.blocker_id = f.following_id AND b.blocked_id = auth.uid())
    )
    WHERE f.user_id = auth.uid()
      AND f.status = 'accepted'
      AND b.id IS NULL

    UNION

    -- Include yourself
    SELECT
      auth.uid() AS uid,
      p.username,
      COALESCE(s.total_picks, 0)::BIGINT AS total_picks,
      COALESCE(s.correct_winner, 0)::BIGINT AS correct_picks,
      CASE
        WHEN COALESCE(s.total_picks, 0) > 0
        THEN ROUND((COALESCE(s.correct_winner, 0)::NUMERIC / s.total_picks) * 100, 1)
        ELSE 0
      END AS accuracy
    FROM profiles p
    LEFT JOIN user_stats s ON s.user_id = auth.uid()
    WHERE p.user_id = auth.uid()
  )
  SELECT
    fs.uid AS user_id,
    fs.username,
    fs.total_picks,
    fs.correct_picks,
    fs.accuracy,
    ROW_NUMBER() OVER (ORDER BY fs.accuracy DESC, fs.total_picks DESC)::BIGINT AS rank
  FROM follower_stats fs
  ORDER BY fs.accuracy DESC, fs.total_picks DESC;
END;
$$;

-- Keep get_friends_leaderboard as alias
CREATE OR REPLACE FUNCTION public.get_friends_leaderboard()
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  total_picks BIGINT,
  correct_picks BIGINT,
  accuracy NUMERIC,
  rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM get_followers_leaderboard();
END;
$$;

-- Update search_users to use follows table
CREATE OR REPLACE FUNCTION public.search_users(
  search_term TEXT,
  limit_count INT DEFAULT 20
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  total_picks BIGINT,
  correct_picks BIGINT,
  accuracy NUMERIC,
  is_following BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.user_id,
    p.username,
    p.avatar_url,
    COALESCE(s.total_picks, 0)::BIGINT AS total_picks,
    COALESCE(s.correct_winner, 0)::BIGINT AS correct_picks,
    CASE
      WHEN COALESCE(s.total_picks, 0) > 0
      THEN ROUND((COALESCE(s.correct_winner, 0)::NUMERIC / s.total_picks) * 100, 1)
      ELSE 0
    END AS accuracy,
    EXISTS(
      SELECT 1 FROM follows f
      WHERE f.user_id = auth.uid()
        AND f.following_id = p.user_id
        AND f.status = 'accepted'
    ) AS is_following
  FROM profiles p
  LEFT JOIN user_stats s ON s.user_id = p.user_id
  LEFT JOIN blocks b ON (
    (b.blocker_id = auth.uid() AND b.blocked_id = p.user_id) OR
    (b.blocker_id = p.user_id AND b.blocked_id = auth.uid())
  )
  WHERE p.user_id != auth.uid()
    AND p.username ILIKE '%' || search_term || '%'
    AND b.id IS NULL
  ORDER BY
    CASE WHEN p.username ILIKE search_term || '%' THEN 0 ELSE 1 END,
    COALESCE(s.total_picks, 0) DESC
  LIMIT limit_count;
END;
$$;

-- Update search_posts to remove bookmark reference
CREATE OR REPLACE FUNCTION public.search_posts(
  p_query TEXT,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_sort_by TEXT DEFAULT 'relevance'
)
RETURNS SETOF JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_tsquery tsquery;
BEGIN
  v_user_id := auth.uid();
  v_tsquery := plainto_tsquery('english', p_query);

  RETURN QUERY
  SELECT json_build_object(
    'id', p.id,
    'user_id', p.user_id,
    'post_type', p.post_type,
    'event_id', p.event_id,
    'bout_id', p.bout_id,
    'title', p.title,
    'body', p.body,
    'like_count', p.like_count,
    'comment_count', p.comment_count,
    'view_count', p.view_count,
    'engagement_score', p.engagement_score,
    'is_public', p.is_public,
    'created_at', p.created_at,
    'updated_at', p.updated_at,
    'is_edited', p.is_edited,
    'author_username', pr.username,
    'author_display_name', pr.display_name,
    'author_avatar_url', pr.avatar_url,
    'event_name', e.name,
    'fighter_a_name', b.red_name,
    'fighter_b_name', b.blue_name,
    'images', COALESCE(
      (SELECT json_agg(json_build_object(
        'id', pi.id,
        'image_url', pi.image_url,
        'display_order', pi.display_order
      ) ORDER BY pi.display_order)
      FROM post_images pi WHERE pi.post_id = p.id),
      '[]'::json
    ),
    'user_has_liked', CASE
      WHEN v_user_id IS NULL THEN false
      ELSE EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = v_user_id)
    END,
    'relevance_score', ts_rank(p.search_vector, v_tsquery)
  )
  FROM posts p
  LEFT JOIN profiles pr ON pr.user_id = p.user_id
  LEFT JOIN events e ON e.id = p.event_id
  LEFT JOIN bouts b ON b.id = p.bout_id
  WHERE p.is_public = true
    AND p.search_vector @@ v_tsquery
  ORDER BY
    CASE
      WHEN p_sort_by = 'relevance' THEN ts_rank(p.search_vector, v_tsquery)
      ELSE 0
    END DESC,
    CASE
      WHEN p_sort_by = 'recent' THEN extract(epoch from p.created_at)
      ELSE 0
    END DESC,
    CASE
      WHEN p_sort_by = 'popular' THEN p.engagement_score
      ELSE 0
    END DESC,
    p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_following() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_followers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_followers_leaderboard() TO authenticated;

-- ============================================================================
-- 7. UPDATE COMMENTS
-- ============================================================================

COMMENT ON TABLE public.follows IS 'One-way follow relationships between users (user_id follows following_id)';
COMMENT ON COLUMN public.follows.user_id IS 'The user who is following';
COMMENT ON COLUMN public.follows.following_id IS 'The user being followed';
COMMENT ON COLUMN public.follows.status IS 'Follow status: pending or accepted';
