-- Phase 2.3: Fix engagement score staleness
-- Calculate time decay dynamically at query time instead of storing stale values
-- The stored engagement_score becomes a "base score" (likes*2 + comments*3)
-- Time decay is applied during queries for accurate ranking

-- Update trigger to only calculate base score (without time decay)
CREATE OR REPLACE FUNCTION recalculate_post_engagement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_post_id UUID;
  v_base_score NUMERIC;
BEGIN
  IF TG_TABLE_NAME = 'post_likes' THEN
    v_post_id := COALESCE(NEW.post_id, OLD.post_id);
  ELSIF TG_TABLE_NAME = 'post_comments' THEN
    v_post_id := COALESCE(NEW.post_id, OLD.post_id);
  ELSE
    RETURN NULL;
  END IF;

  -- Calculate base engagement score (without time decay)
  -- Time decay will be applied at query time for freshness
  SELECT (p.like_count * 2 + p.comment_count * 3)::NUMERIC
  INTO v_base_score
  FROM public.posts p
  WHERE p.id = v_post_id;

  UPDATE public.posts SET engagement_score = v_base_score WHERE id = v_post_id;

  RETURN NULL;
END;
$$;

-- Create a helper function for calculating dynamic engagement with time decay
CREATE OR REPLACE FUNCTION calculate_engagement_with_decay(
  p_base_score NUMERIC,
  p_created_at TIMESTAMPTZ
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT p_base_score * (1.0 / (1.0 + EXTRACT(EPOCH FROM (now() - p_created_at)) / 86400.0))
$$;

-- Update get_posts_feed to use dynamic engagement ranking
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
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  WITH
  -- Pre-fetch the posts with dynamic engagement score
  paginated_posts AS (
    SELECT
      p.*,
      -- Calculate dynamic engagement score with time decay
      calculate_engagement_with_decay(p.engagement_score, p.created_at) AS dynamic_score
    FROM public.posts p
    WHERE p.is_public = true
    ORDER BY calculate_engagement_with_decay(p.engagement_score, p.created_at) DESC, p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ),
  -- Pre-aggregate all images for selected posts
  post_images_agg AS (
    SELECT
      pi.post_id,
      COALESCE(json_agg(json_build_object(
        'id', pi.id,
        'image_url', pi.image_url,
        'display_order', pi.display_order
      ) ORDER BY pi.display_order), '[]'::json) AS images
    FROM public.post_images pi
    WHERE pi.post_id IN (SELECT pp.id FROM paginated_posts pp)
    GROUP BY pi.post_id
  ),
  -- Pre-fetch user likes
  user_likes AS (
    SELECT pl.post_id
    FROM public.post_likes pl
    WHERE pl.user_id = v_user_id
      AND pl.post_id IN (SELECT pp.id FROM paginated_posts pp)
  )
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
    p.dynamic_score AS engagement_score, -- Return dynamic score
    p.is_public,
    p.created_at,
    p.updated_at,
    pr.username AS author_username,
    pr.display_name AS author_display_name,
    pr.avatar_url AS author_avatar_url,
    e.name AS event_name,
    fa.name AS fighter_a_name,
    fb.name AS fighter_b_name,
    COALESCE(pia.images, '[]'::json) AS images,
    EXISTS (SELECT 1 FROM user_likes ul WHERE ul.post_id = p.id) AS user_has_liked
  FROM paginated_posts p
  LEFT JOIN public.profiles pr ON pr.user_id = p.user_id
  LEFT JOIN public.events e ON e.id = p.event_id
  LEFT JOIN public.bouts b ON b.id = p.bout_id
  LEFT JOIN public.fighters fa ON fa.id = b.fighter_a_id
  LEFT JOIN public.fighters fb ON fb.id = b.fighter_b_id
  LEFT JOIN post_images_agg pia ON pia.post_id = p.id
  ORDER BY p.dynamic_score DESC, p.created_at DESC;
END;
$$;

-- Create an index to help with the dynamic score calculation
-- Uses expression index on the base components
CREATE INDEX IF NOT EXISTS idx_posts_base_engagement
  ON public.posts(engagement_score DESC, created_at DESC)
  WHERE is_public = true;

-- Update existing posts to have correct base scores (one-time fix)
UPDATE public.posts p
SET engagement_score = (p.like_count * 2 + p.comment_count * 3)::NUMERIC
WHERE engagement_score != (p.like_count * 2 + p.comment_count * 3)::NUMERIC;

-- Add comment explaining the engagement_score column semantics
COMMENT ON COLUMN public.posts.engagement_score IS 'Base engagement score (likes*2 + comments*3). Time decay is applied dynamically at query time for fresh ranking.';
