-- Phase 1.2: Fix race condition in count triggers
-- Use row-level locking to prevent lost updates under concurrent operations

-- Fix post like count trigger with locking
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_post_id UUID;
  v_locked BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_post_id := NEW.post_id;
    -- Lock the row and increment atomically
    UPDATE public.posts
    SET like_count = like_count + 1
    WHERE id = v_post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_post_id := OLD.post_id;
    -- Lock the row and decrement atomically
    UPDATE public.posts
    SET like_count = GREATEST(like_count - 1, 0)
    WHERE id = v_post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Fix comment like count trigger with locking
CREATE OR REPLACE FUNCTION update_comment_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_comment_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_comment_id := NEW.comment_id;
    -- Lock the row and increment atomically
    UPDATE public.post_comments
    SET like_count = like_count + 1
    WHERE id = v_comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_comment_id := OLD.comment_id;
    -- Lock the row and decrement atomically
    UPDATE public.post_comments
    SET like_count = GREATEST(like_count - 1, 0)
    WHERE id = v_comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Fix post comment count trigger with locking
CREATE OR REPLACE FUNCTION update_post_comment_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Lock and update post comment count
    UPDATE public.posts
    SET comment_count = comment_count + 1
    WHERE id = NEW.post_id;

    -- Lock and update parent reply count if this is a reply
    IF NEW.parent_id IS NOT NULL THEN
      UPDATE public.post_comments
      SET reply_count = reply_count + 1
      WHERE id = NEW.parent_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Lock and update post comment count
    UPDATE public.posts
    SET comment_count = GREATEST(comment_count - 1, 0)
    WHERE id = OLD.post_id;

    -- Lock and update parent reply count if this was a reply
    IF OLD.parent_id IS NOT NULL THEN
      UPDATE public.post_comments
      SET reply_count = GREATEST(reply_count - 1, 0)
      WHERE id = OLD.parent_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create a function to recalculate counts if they drift
-- Can be run periodically or on-demand to fix any inconsistencies
CREATE OR REPLACE FUNCTION recalculate_post_counts(p_post_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated INTEGER := 0;
BEGIN
  -- Recalculate like counts
  UPDATE public.posts p
  SET like_count = (
    SELECT COUNT(*) FROM public.post_likes pl WHERE pl.post_id = p.id
  )
  WHERE (p_post_id IS NULL OR p.id = p_post_id)
    AND like_count != (
      SELECT COUNT(*) FROM public.post_likes pl WHERE pl.post_id = p.id
    );

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- Recalculate comment counts
  UPDATE public.posts p
  SET comment_count = (
    SELECT COUNT(*) FROM public.post_comments pc WHERE pc.post_id = p.id
  )
  WHERE (p_post_id IS NULL OR p.id = p_post_id)
    AND comment_count != (
      SELECT COUNT(*) FROM public.post_comments pc WHERE pc.post_id = p.id
    );

  GET DIAGNOSTICS v_updated = v_updated + ROW_COUNT;

  -- Recalculate comment like counts
  UPDATE public.post_comments c
  SET like_count = (
    SELECT COUNT(*) FROM public.comment_likes cl WHERE cl.comment_id = c.id
  )
  WHERE (p_post_id IS NULL OR c.post_id = p_post_id)
    AND like_count != (
      SELECT COUNT(*) FROM public.comment_likes cl WHERE cl.comment_id = c.id
    );

  GET DIAGNOSTICS v_updated = v_updated + ROW_COUNT;

  -- Recalculate reply counts
  UPDATE public.post_comments c
  SET reply_count = (
    SELECT COUNT(*) FROM public.post_comments r WHERE r.parent_id = c.id
  )
  WHERE (p_post_id IS NULL OR c.post_id = p_post_id)
    AND reply_count != (
      SELECT COUNT(*) FROM public.post_comments r WHERE r.parent_id = c.id
    );

  GET DIAGNOSTICS v_updated = v_updated + ROW_COUNT;

  RETURN v_updated;
END;
$$;

-- Grant execute to service_role for admin use
GRANT EXECUTE ON FUNCTION recalculate_post_counts(UUID) TO service_role;
