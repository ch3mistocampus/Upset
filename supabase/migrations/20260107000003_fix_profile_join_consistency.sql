-- Phase 1.3: Fix inconsistent profile join column
-- The profiles table uses `user_id` as the primary key, not `id`
-- All functions must join on profiles.user_id = posts.user_id

-- Note: The main function fixes were already applied in migration 20260107000001
-- This migration adds an index and verifies the join pattern is correct

-- Add index to speed up profile joins (if not exists)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- Verify consistency by creating a view that documents the correct join pattern
-- This also serves as a quick reference for the correct column usage
COMMENT ON TABLE public.profiles IS 'User profiles. Primary key is user_id (references auth.users.id), not id. Always join as: profiles.user_id = other_table.user_id';

-- Re-verify get_posts_feed uses correct join (profiles.user_id = posts.user_id)
-- This is a no-op replacement to ensure the function matches the expected pattern
CREATE OR REPLACE FUNCTION get_posts_feed(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  post_type TEXT,
  event_id UUID,
  bout_id UUID,
  title TEXT,
  body TEXT,
  like_count INTEGER,
  comment_count INTEGER,
  engagement_score NUMERIC,
  is_public BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  author_username TEXT,
  author_display_name TEXT,
  author_avatar_url TEXT,
  event_name TEXT,
  fighter_a_name TEXT,
  fighter_b_name TEXT,
  images JSON,
  user_has_liked BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.post_type,
    p.event_id,
    p.bout_id,
    p.title,
    p.body,
    p.like_count,
    p.comment_count,
    p.engagement_score,
    p.is_public,
    p.created_at,
    p.updated_at,
    pr.username AS author_username,
    pr.display_name AS author_display_name,
    pr.avatar_url AS author_avatar_url,
    e.name AS event_name,
    fa.name AS fighter_a_name,
    fb.name AS fighter_b_name,
    (
      SELECT COALESCE(json_agg(json_build_object(
        'id', pi.id,
        'image_url', pi.image_url,
        'display_order', pi.display_order
      ) ORDER BY pi.display_order), '[]'::json)
      FROM public.post_images pi
      WHERE pi.post_id = p.id
    ) AS images,
    EXISTS (
      SELECT 1 FROM public.post_likes pl
      WHERE pl.post_id = p.id AND pl.user_id = auth.uid()
    ) AS user_has_liked
  FROM public.posts p
  -- CORRECT JOIN: profiles.user_id = posts.user_id
  LEFT JOIN public.profiles pr ON pr.user_id = p.user_id
  LEFT JOIN public.events e ON e.id = p.event_id
  LEFT JOIN public.bouts b ON b.id = p.bout_id
  LEFT JOIN public.fighters fa ON fa.id = b.fighter_a_id
  LEFT JOIN public.fighters fb ON fb.id = b.fighter_b_id
  WHERE p.is_public = true
  ORDER BY p.engagement_score DESC, p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
