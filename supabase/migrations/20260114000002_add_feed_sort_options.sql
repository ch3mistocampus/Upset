-- Add sort options to posts feed
-- Allows sorting by 'top' (engagement with time decay) or 'recent' (chronological)

-- Update get_posts_feed to accept a sort parameter
CREATE OR REPLACE FUNCTION get_posts_feed(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_sort_by TEXT DEFAULT 'top'  -- 'top' or 'recent'
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
  is_edited BOOLEAN,
  edited_at TIMESTAMPTZ,
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
    ORDER BY
      CASE WHEN p_sort_by = 'recent' THEN p.created_at END DESC,
      CASE WHEN p_sort_by = 'top' OR p_sort_by IS NULL THEN calculate_engagement_with_decay(p.engagement_score, p.created_at) END DESC,
      p.created_at DESC
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
    p.dynamic_score AS engagement_score,
    p.is_public,
    p.is_edited,
    p.edited_at,
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
  ORDER BY
    CASE WHEN p_sort_by = 'recent' THEN p.created_at END DESC,
    CASE WHEN p_sort_by = 'top' OR p_sort_by IS NULL THEN p.dynamic_score END DESC,
    p.created_at DESC;
END;
$$;

-- Add index for chronological sorting
CREATE INDEX IF NOT EXISTS idx_posts_created_at_public
  ON public.posts(created_at DESC)
  WHERE is_public = true;

COMMENT ON FUNCTION get_posts_feed IS 'Fetches paginated posts feed with sort options: top (engagement with time decay) or recent (chronological)';
