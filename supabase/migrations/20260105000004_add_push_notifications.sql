-- Add Push Notifications System
-- Phase 3: Push notifications for engagement
--
-- Tables:
-- 1. push_tokens - Device push tokens
-- 2. notification_preferences - User notification settings
-- 3. notification_queue - Pending notifications
-- 4. notification_batches - For batched notifications

-- ============================================================================
-- PUSH TOKENS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_user_token UNIQUE (user_id, token)
);

COMMENT ON TABLE public.push_tokens IS 'Expo push tokens for user devices';
COMMENT ON COLUMN public.push_tokens.is_active IS 'Set to false if token becomes invalid';

CREATE INDEX idx_push_tokens_user ON public.push_tokens(user_id);
CREATE INDEX idx_push_tokens_active ON public.push_tokens(is_active) WHERE is_active = true;

-- ============================================================================
-- NOTIFICATION PREFERENCES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification types
  new_follower BOOLEAN NOT NULL DEFAULT true,
  picks_graded BOOLEAN NOT NULL DEFAULT true,
  event_reminder_24h BOOLEAN NOT NULL DEFAULT true,
  event_reminder_1h BOOLEAN NOT NULL DEFAULT true,
  friend_activity BOOLEAN NOT NULL DEFAULT false,  -- Off by default (can be noisy)
  weekly_recap BOOLEAN NOT NULL DEFAULT true,
  streak_at_risk BOOLEAN NOT NULL DEFAULT true,  -- "You're on a 5 streak! Don't miss UFC 315"

  -- Quiet hours (optional)
  quiet_hours_start TIME,  -- e.g., 22:00
  quiet_hours_end TIME,    -- e.g., 08:00
  timezone TEXT DEFAULT 'UTC',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notification_preferences IS 'User preferences for push notifications';

-- ============================================================================
-- NOTIFICATION QUEUE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'new_follower',
    'picks_graded',
    'event_reminder',
    'friend_activity',
    'weekly_recap',
    'streak_at_risk',
    'welcome',
    'admin_message'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',  -- Deep link data, metadata

  -- Batching support
  batch_key TEXT,  -- Group similar notifications (e.g., 'new_follower:2024-01-05')
  batch_count INTEGER DEFAULT 1,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'batched',  -- Waiting to be combined with others
    'sending',
    'sent',
    'failed',
    'skipped'  -- User has preference disabled
  )),

  priority INTEGER DEFAULT 0,  -- Higher = send first

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_for TIMESTAMPTZ,  -- For scheduled notifications
  sent_at TIMESTAMPTZ,

  -- Error tracking
  error TEXT,
  retry_count INTEGER DEFAULT 0
);

COMMENT ON TABLE public.notification_queue IS 'Queue of notifications to send';
COMMENT ON COLUMN public.notification_queue.batch_key IS 'Key for batching similar notifications';
COMMENT ON COLUMN public.notification_queue.scheduled_for IS 'Send at this time (null = send immediately)';

CREATE INDEX idx_notification_queue_pending ON public.notification_queue(status, scheduled_for)
  WHERE status IN ('pending', 'batched');
CREATE INDEX idx_notification_queue_user ON public.notification_queue(user_id, created_at DESC);
CREATE INDEX idx_notification_queue_batch ON public.notification_queue(batch_key) WHERE batch_key IS NOT NULL;

-- ============================================================================
-- NOTIFICATION LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ
);

COMMENT ON TABLE public.notification_log IS 'Historical log of sent notifications';

CREATE INDEX idx_notification_log_user ON public.notification_log(user_id, sent_at DESC);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Queue a notification (respects user preferences)
CREATE OR REPLACE FUNCTION queue_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT '{}',
  p_batch_key TEXT DEFAULT NULL,
  p_scheduled_for TIMESTAMPTZ DEFAULT NULL,
  p_priority INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
  pref_enabled BOOLEAN;
BEGIN
  -- Check if user has this notification type enabled
  SELECT
    CASE p_type
      WHEN 'new_follower' THEN new_follower
      WHEN 'picks_graded' THEN picks_graded
      WHEN 'event_reminder' THEN event_reminder_24h OR event_reminder_1h
      WHEN 'friend_activity' THEN friend_activity
      WHEN 'weekly_recap' THEN weekly_recap
      WHEN 'streak_at_risk' THEN streak_at_risk
      ELSE true  -- welcome, admin_message always enabled
    END
  INTO pref_enabled
  FROM public.notification_preferences
  WHERE user_id = p_user_id;

  -- Default to true if no preferences exist
  IF pref_enabled IS NULL THEN
    pref_enabled := true;
  END IF;

  IF NOT pref_enabled THEN
    -- Insert as skipped for tracking
    INSERT INTO public.notification_queue (user_id, type, title, body, data, status)
    VALUES (p_user_id, p_type, p_title, p_body, p_data, 'skipped')
    RETURNING id INTO new_id;
  ELSE
    INSERT INTO public.notification_queue (
      user_id, type, title, body, data, batch_key, scheduled_for, priority, status
    )
    VALUES (
      p_user_id, p_type, p_title, p_body, p_data, p_batch_key, p_scheduled_for, p_priority,
      CASE WHEN p_batch_key IS NOT NULL THEN 'batched' ELSE 'pending' END
    )
    RETURNING id INTO new_id;
  END IF;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION queue_notification(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TIMESTAMPTZ, INTEGER) TO service_role;

-- Get pending notifications for sending
CREATE OR REPLACE FUNCTION get_pending_notifications(limit_count INTEGER DEFAULT 100)
RETURNS TABLE (
  notification_id UUID,
  user_id UUID,
  type TEXT,
  title TEXT,
  body TEXT,
  data JSONB,
  tokens TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    nq.id AS notification_id,
    nq.user_id,
    nq.type,
    nq.title,
    nq.body,
    nq.data,
    ARRAY_AGG(pt.token) AS tokens
  FROM public.notification_queue nq
  JOIN public.push_tokens pt ON pt.user_id = nq.user_id AND pt.is_active = true
  WHERE
    nq.status = 'pending'
    AND (nq.scheduled_for IS NULL OR nq.scheduled_for <= now())
  GROUP BY nq.id, nq.user_id, nq.type, nq.title, nq.body, nq.data
  ORDER BY nq.priority DESC, nq.created_at ASC
  LIMIT limit_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_pending_notifications(INTEGER) TO service_role;

-- Mark notification as sent
CREATE OR REPLACE FUNCTION mark_notification_sent(
  notification_ids UUID[],
  success BOOLEAN DEFAULT true,
  error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF success THEN
    UPDATE public.notification_queue
    SET status = 'sent', sent_at = now()
    WHERE id = ANY(notification_ids);

    -- Also log the sent notifications
    INSERT INTO public.notification_log (user_id, type, title, body, data, sent_at)
    SELECT user_id, type, title, body, data, now()
    FROM public.notification_queue
    WHERE id = ANY(notification_ids);
  ELSE
    UPDATE public.notification_queue
    SET
      status = CASE WHEN retry_count >= 3 THEN 'failed' ELSE 'pending' END,
      error = error_message,
      retry_count = retry_count + 1
    WHERE id = ANY(notification_ids);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION mark_notification_sent(UUID[], BOOLEAN, TEXT) TO service_role;

-- Process batched notifications
CREATE OR REPLACE FUNCTION process_batched_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  processed_count INTEGER := 0;
  batch RECORD;
BEGIN
  -- Find batches that are ready to send (waiting for 5 minutes)
  FOR batch IN
    SELECT
      user_id,
      batch_key,
      type,
      COUNT(*) as count,
      MIN(created_at) as first_created
    FROM public.notification_queue
    WHERE
      status = 'batched'
      AND created_at < now() - INTERVAL '5 minutes'
    GROUP BY user_id, batch_key, type
  LOOP
    -- Create a combined notification
    IF batch.type = 'new_follower' THEN
      INSERT INTO public.notification_queue (user_id, type, title, body, data, status)
      VALUES (
        batch.user_id,
        batch.type,
        CASE
          WHEN batch.count = 1 THEN 'New follower'
          ELSE batch.count || ' new followers'
        END,
        CASE
          WHEN batch.count = 1 THEN 'Someone started following you'
          ELSE batch.count || ' people started following you'
        END,
        jsonb_build_object('count', batch.count),
        'pending'
      );
    END IF;

    -- Mark batched items as processed
    UPDATE public.notification_queue
    SET status = 'sent', sent_at = now()
    WHERE user_id = batch.user_id AND batch_key = batch.batch_key AND status = 'batched';

    processed_count := processed_count + 1;
  END LOOP;

  RETURN processed_count;
END;
$$;

GRANT EXECUTE ON FUNCTION process_batched_notifications() TO service_role;

-- ============================================================================
-- DEFAULT PREFERENCES TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create default preferences when profile is created
CREATE TRIGGER create_notification_prefs_on_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Push tokens
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tokens" ON public.push_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Notification preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences" ON public.notification_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Notification queue (read-only for users)
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own queue" ON public.notification_queue
  FOR SELECT
  USING (auth.uid() = user_id);

-- Notification log
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own log" ON public.notification_log
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark own notifications read" ON public.notification_log
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT SELECT ON public.notification_queue TO authenticated;
GRANT SELECT, UPDATE ON public.notification_log TO authenticated;

-- Service role needs full access for Edge Functions
GRANT ALL ON public.notification_queue TO service_role;
GRANT ALL ON public.notification_log TO service_role;
GRANT ALL ON public.push_tokens TO service_role;
