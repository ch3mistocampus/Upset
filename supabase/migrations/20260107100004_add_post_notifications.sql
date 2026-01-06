-- Add post-related notifications
-- Notifies users when someone likes/comments on their posts or replies to their comments

-- Notification types for posts
-- We'll extend the existing notifications system if it exists, or create a new one

-- Create post_notifications table
CREATE TABLE IF NOT EXISTS public.post_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('post_like', 'post_comment', 'comment_like', 'comment_reply')),
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate notifications for the same action
  CONSTRAINT unique_notification UNIQUE (user_id, type, actor_id, post_id, comment_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_post_notifications_user_unread
  ON public.post_notifications(user_id, is_read, created_at DESC)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_post_notifications_user_recent
  ON public.post_notifications(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.post_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.post_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON public.post_notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON public.post_notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger function to create notification on post like
CREATE OR REPLACE FUNCTION public.notify_post_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_post_owner_id UUID;
BEGIN
  -- Get post owner
  SELECT user_id INTO v_post_owner_id
  FROM posts WHERE id = NEW.post_id;

  -- Don't notify if user liked their own post
  IF v_post_owner_id IS NOT NULL AND v_post_owner_id != NEW.user_id THEN
    INSERT INTO post_notifications (user_id, type, actor_id, post_id)
    VALUES (v_post_owner_id, 'post_like', NEW.user_id, NEW.post_id)
    ON CONFLICT (user_id, type, actor_id, post_id, comment_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger function to create notification on comment
CREATE OR REPLACE FUNCTION public.notify_post_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_post_owner_id UUID;
  v_parent_comment_owner_id UUID;
BEGIN
  -- Get post owner
  SELECT user_id INTO v_post_owner_id
  FROM posts WHERE id = NEW.post_id;

  -- Notify post owner of new comment (if not their own comment)
  IF v_post_owner_id IS NOT NULL AND v_post_owner_id != NEW.user_id THEN
    INSERT INTO post_notifications (user_id, type, actor_id, post_id, comment_id)
    VALUES (v_post_owner_id, 'post_comment', NEW.user_id, NEW.post_id, NEW.id)
    ON CONFLICT (user_id, type, actor_id, post_id, comment_id) DO NOTHING;
  END IF;

  -- If this is a reply, also notify the parent comment owner
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO v_parent_comment_owner_id
    FROM post_comments WHERE id = NEW.parent_id;

    -- Don't notify if replying to own comment or if same as post owner (already notified)
    IF v_parent_comment_owner_id IS NOT NULL
      AND v_parent_comment_owner_id != NEW.user_id
      AND v_parent_comment_owner_id != v_post_owner_id
    THEN
      INSERT INTO post_notifications (user_id, type, actor_id, post_id, comment_id)
      VALUES (v_parent_comment_owner_id, 'comment_reply', NEW.user_id, NEW.post_id, NEW.id)
      ON CONFLICT (user_id, type, actor_id, post_id, comment_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger function to create notification on comment like
CREATE OR REPLACE FUNCTION public.notify_comment_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_comment_owner_id UUID;
  v_post_id UUID;
BEGIN
  -- Get comment owner and post_id
  SELECT user_id, post_id INTO v_comment_owner_id, v_post_id
  FROM post_comments WHERE id = NEW.comment_id;

  -- Don't notify if user liked their own comment
  IF v_comment_owner_id IS NOT NULL AND v_comment_owner_id != NEW.user_id THEN
    INSERT INTO post_notifications (user_id, type, actor_id, post_id, comment_id)
    VALUES (v_comment_owner_id, 'comment_like', NEW.user_id, v_post_id, NEW.comment_id)
    ON CONFLICT (user_id, type, actor_id, post_id, comment_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_notify_post_like ON post_likes;
CREATE TRIGGER trigger_notify_post_like
  AFTER INSERT ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_post_like();

DROP TRIGGER IF EXISTS trigger_notify_post_comment ON post_comments;
CREATE TRIGGER trigger_notify_post_comment
  AFTER INSERT ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_post_comment();

DROP TRIGGER IF EXISTS trigger_notify_comment_like ON comment_likes;
CREATE TRIGGER trigger_notify_comment_like
  AFTER INSERT ON comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_comment_like();

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION public.get_post_notification_count()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_count INT;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM post_notifications
  WHERE user_id = v_user_id AND is_read = false;

  RETURN v_count;
END;
$$;

-- Function to get notifications with details
CREATE OR REPLACE FUNCTION public.get_post_notifications(
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0,
  p_unread_only BOOLEAN DEFAULT false
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

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT json_build_object(
    'id', n.id,
    'type', n.type,
    'is_read', n.is_read,
    'created_at', n.created_at,
    'post_id', n.post_id,
    'comment_id', n.comment_id,
    'post_title', p.title,
    'actor', json_build_object(
      'user_id', actor.user_id,
      'username', actor.username,
      'avatar_url', actor.avatar_url
    )
  )
  FROM post_notifications n
  JOIN profiles actor ON actor.user_id = n.actor_id
  LEFT JOIN posts p ON p.id = n.post_id
  WHERE n.user_id = v_user_id
    AND (NOT p_unread_only OR n.is_read = false)
  ORDER BY n.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION public.mark_post_notifications_read(
  p_notification_ids UUID[] DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_updated_count INT;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_notification_ids IS NULL THEN
    -- Mark all as read
    UPDATE post_notifications
    SET is_read = true
    WHERE user_id = v_user_id AND is_read = false;
  ELSE
    -- Mark specific notifications as read
    UPDATE post_notifications
    SET is_read = true
    WHERE user_id = v_user_id
      AND id = ANY(p_notification_ids)
      AND is_read = false;
  END IF;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'updated_count', v_updated_count
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_post_notification_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_post_notifications(INT, INT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_post_notifications_read(UUID[]) TO authenticated;
