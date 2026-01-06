-- Add search functionality and view tracking for posts

-- Add view count to posts
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS view_count INT NOT NULL DEFAULT 0;

-- Create view tracking table (for unique views)
CREATE TABLE IF NOT EXISTS public.post_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewer_ip_hash TEXT, -- Hashed IP for anonymous users
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique view per user/IP per post per day
  CONSTRAINT unique_daily_view UNIQUE (post_id, user_id, viewer_ip_hash, (created_at::date))
);

-- Index for view count updates
CREATE INDEX IF NOT EXISTS idx_post_views_post
  ON public.post_views(post_id);

-- Enable RLS
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

-- Anyone can record a view
CREATE POLICY "Anyone can record views"
  ON public.post_views
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Enable full-text search on posts
-- Create search vector column
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_posts_search_vector
  ON public.posts USING GIN(search_vector);

-- Trigger to update search vector
CREATE OR REPLACE FUNCTION public.update_post_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.body, '')), 'B');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_post_search_vector ON posts;
CREATE TRIGGER trigger_update_post_search_vector
  BEFORE INSERT OR UPDATE OF title, body ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_post_search_vector();

-- Update existing posts with search vectors
UPDATE posts SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(body, '')), 'B')
WHERE search_vector IS NULL;

-- Function to record a view
CREATE OR REPLACE FUNCTION public.record_post_view(p_post_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_is_new_view BOOLEAN := false;
BEGIN
  v_user_id := auth.uid();

  -- Try to insert a view record (will fail silently on duplicate)
  INSERT INTO post_views (post_id, user_id)
  VALUES (p_post_id, v_user_id)
  ON CONFLICT DO NOTHING;

  IF FOUND THEN
    v_is_new_view := true;
    -- Increment view count
    UPDATE posts
    SET view_count = view_count + 1
    WHERE id = p_post_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'new_view', v_is_new_view
  );
END;
$$;

-- Function to search posts
CREATE OR REPLACE FUNCTION public.search_posts(
  p_query TEXT,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_sort_by TEXT DEFAULT 'relevance' -- 'relevance', 'recent', 'popular'
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

  -- Convert search query to tsquery
  -- Handle plain text search with prefix matching
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
    'user_has_bookmarked', CASE
      WHEN v_user_id IS NULL THEN false
      ELSE EXISTS(SELECT 1 FROM post_bookmarks pb WHERE pb.post_id = p.id AND pb.user_id = v_user_id)
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

-- Function to get trending posts (high engagement in recent timeframe)
CREATE OR REPLACE FUNCTION public.get_trending_posts(
  p_hours INT DEFAULT 24,
  p_limit INT DEFAULT 10
)
RETURNS SETOF JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  RETURN QUERY
  SELECT json_build_object(
    'id', p.id,
    'user_id', p.user_id,
    'post_type', p.post_type,
    'title', p.title,
    'body', p.body,
    'like_count', p.like_count,
    'comment_count', p.comment_count,
    'view_count', p.view_count,
    'created_at', p.created_at,
    'author_username', pr.username,
    'author_display_name', pr.display_name,
    'author_avatar_url', pr.avatar_url,
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
    -- Trending score: recent engagement weighted higher
    'trending_score', (
      p.like_count * 2 + p.comment_count * 3 + p.view_count * 0.1
    ) / (1 + extract(epoch from (now() - p.created_at)) / 3600)
  )
  FROM posts p
  LEFT JOIN profiles pr ON pr.user_id = p.user_id
  WHERE p.is_public = true
    AND p.created_at > now() - (p_hours || ' hours')::interval
  ORDER BY (
    p.like_count * 2 + p.comment_count * 3 + p.view_count * 0.1
  ) / (1 + extract(epoch from (now() - p.created_at)) / 3600) DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.record_post_view(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_posts(TEXT, INT, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trending_posts(INT, INT) TO authenticated;
