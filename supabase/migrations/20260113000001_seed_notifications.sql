-- =============================================================================
-- Seed Post Notifications for All Users
-- =============================================================================
-- This migration populates the post_notifications table with sample data
-- so users can see what the notifications tab looks like.
-- =============================================================================

DO $$
DECLARE
  -- User IDs
  v_alice UUID;
  v_bob UUID;
  v_charlie UUID;
  v_david UUID;
  v_emma UUID;
  v_frank UUID;
  v_grace UUID;
  v_henry UUID;
  v_iris UUID;
  v_jack UUID;
  v_kate UUID;
  v_leo UUID;
  v_mia UUID;

  -- Post IDs (we'll look these up)
  v_post_id UUID;
  v_comment_id UUID;

  -- Temp variables
  v_user_ids UUID[];
  v_actor_id UUID;
  v_target_id UUID;
  v_temp_post_id UUID;
  v_temp_comment_id UUID;
  v_i INT;
  v_j INT;
BEGIN
  -- Get all test user IDs
  SELECT user_id INTO v_alice FROM public.profiles WHERE username = 'alice_ufc';
  SELECT user_id INTO v_bob FROM public.profiles WHERE username = 'bob_fighter';
  SELECT user_id INTO v_charlie FROM public.profiles WHERE username = 'charlie_picks';
  SELECT user_id INTO v_david FROM public.profiles WHERE username = 'david_mma';
  SELECT user_id INTO v_emma FROM public.profiles WHERE username = 'emma_octagon';
  SELECT user_id INTO v_frank FROM public.profiles WHERE username = 'frank_knockout';
  SELECT user_id INTO v_grace FROM public.profiles WHERE username = 'grace_grappling';
  SELECT user_id INTO v_henry FROM public.profiles WHERE username = 'henry_heavyweight';
  SELECT user_id INTO v_iris FROM public.profiles WHERE username = 'iris_insider';
  SELECT user_id INTO v_jack FROM public.profiles WHERE username = 'jack_judge';
  SELECT user_id INTO v_kate FROM public.profiles WHERE username = 'kate_kicks';
  SELECT user_id INTO v_leo FROM public.profiles WHERE username = 'leo_legacy';
  SELECT user_id INTO v_mia FROM public.profiles WHERE username = 'mia_matchup';

  -- Exit if no users found
  IF v_alice IS NULL THEN
    RAISE NOTICE 'No test users found. Skipping notification seeding.';
    RETURN;
  END IF;

  -- Check if post_notifications table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_notifications') THEN
    RAISE NOTICE 'post_notifications table not found. Skipping.';
    RETURN;
  END IF;

  -- Build array of user IDs for easier iteration
  v_user_ids := ARRAY[v_alice, v_bob, v_charlie, v_david, v_emma, v_frank, v_grace, v_henry, v_iris, v_jack, v_kate, v_leo];

  -- Remove any NULLs from the array
  v_user_ids := array_remove(v_user_ids, NULL);

  RAISE NOTICE 'Found % users for notification seeding', array_length(v_user_ids, 1);

  -- =============================================================================
  -- 1. CREATE NOTIFICATIONS FROM EXISTING LIKES (retroactively)
  -- =============================================================================

  -- For each post_like, create a notification for the post owner
  INSERT INTO public.post_notifications (user_id, type, actor_id, post_id, is_read, created_at)
  SELECT
    p.user_id,                    -- notify post owner
    'post_like',
    pl.user_id,                   -- actor is the liker
    pl.post_id,
    CASE WHEN random() < 0.3 THEN false ELSE true END,  -- 70% read, 30% unread
    pl.created_at + INTERVAL '1 minute'
  FROM public.post_likes pl
  JOIN public.posts p ON p.id = pl.post_id
  WHERE p.user_id != pl.user_id  -- Don't notify self-likes
  ON CONFLICT (user_id, type, actor_id, post_id, comment_id) DO NOTHING;

  RAISE NOTICE 'Created notifications from existing post likes';

  -- =============================================================================
  -- 2. CREATE NOTIFICATIONS FROM EXISTING COMMENTS
  -- =============================================================================

  -- For each comment, create a notification for the post owner
  INSERT INTO public.post_notifications (user_id, type, actor_id, post_id, comment_id, is_read, created_at)
  SELECT
    p.user_id,                    -- notify post owner
    'post_comment',
    pc.user_id,                   -- actor is the commenter
    pc.post_id,
    pc.id,
    CASE WHEN random() < 0.4 THEN false ELSE true END,  -- 60% read, 40% unread
    pc.created_at + INTERVAL '1 minute'
  FROM public.post_comments pc
  JOIN public.posts p ON p.id = pc.post_id
  WHERE p.user_id != pc.user_id  -- Don't notify self-comments
    AND pc.parent_id IS NULL      -- Only top-level comments trigger post_comment
  ON CONFLICT (user_id, type, actor_id, post_id, comment_id) DO NOTHING;

  RAISE NOTICE 'Created notifications from existing comments';

  -- =============================================================================
  -- 3. CREATE ADDITIONAL SAMPLE NOTIFICATIONS FOR EACH USER
  -- =============================================================================
  -- We'll create a variety of notifications so each user has a full inbox

  FOR v_i IN 1..array_length(v_user_ids, 1) LOOP
    v_target_id := v_user_ids[v_i];

    -- Find a post by this user (if any)
    SELECT id INTO v_temp_post_id
    FROM public.posts
    WHERE user_id = v_target_id
    LIMIT 1;

    -- If user has no posts, create notifications referencing other posts
    IF v_temp_post_id IS NULL THEN
      SELECT id INTO v_temp_post_id
      FROM public.posts
      ORDER BY created_at DESC
      LIMIT 1;
    END IF;

    IF v_temp_post_id IS NULL THEN
      CONTINUE;  -- No posts exist, skip
    END IF;

    -- Create 3-7 notifications per user from random other users
    FOR v_j IN 1..5 + floor(random() * 3)::int LOOP
      -- Pick a random actor (different from target)
      v_actor_id := v_user_ids[1 + (floor(random() * array_length(v_user_ids, 1)))::int];

      -- Skip if same user
      IF v_actor_id = v_target_id OR v_actor_id IS NULL THEN
        CONTINUE;
      END IF;

      -- Randomly choose notification type
      CASE floor(random() * 4)::int
        WHEN 0 THEN
          -- post_like notification
          INSERT INTO public.post_notifications (
            user_id, type, actor_id, post_id, is_read, created_at
          ) VALUES (
            v_target_id,
            'post_like',
            v_actor_id,
            v_temp_post_id,
            random() < 0.3,  -- 30% chance unread
            NOW() - (random() * INTERVAL '7 days')
          ) ON CONFLICT DO NOTHING;

        WHEN 1 THEN
          -- post_comment notification (need to create a temp comment reference)
          INSERT INTO public.post_notifications (
            user_id, type, actor_id, post_id, comment_id, is_read, created_at
          )
          SELECT
            v_target_id,
            'post_comment',
            v_actor_id,
            v_temp_post_id,
            (SELECT id FROM public.post_comments WHERE post_id = v_temp_post_id LIMIT 1),
            random() < 0.4,
            NOW() - (random() * INTERVAL '5 days')
          ON CONFLICT DO NOTHING;

        WHEN 2 THEN
          -- comment_like notification
          INSERT INTO public.post_notifications (
            user_id, type, actor_id, post_id, comment_id, is_read, created_at
          )
          SELECT
            v_target_id,
            'comment_like',
            v_actor_id,
            pc.post_id,
            pc.id,
            random() < 0.5,
            NOW() - (random() * INTERVAL '3 days')
          FROM public.post_comments pc
          WHERE pc.user_id = v_target_id
          LIMIT 1
          ON CONFLICT DO NOTHING;

        ELSE
          -- comment_reply notification
          INSERT INTO public.post_notifications (
            user_id, type, actor_id, post_id, comment_id, is_read, created_at
          )
          SELECT
            v_target_id,
            'comment_reply',
            v_actor_id,
            pc.post_id,
            pc.id,
            random() < 0.6,
            NOW() - (random() * INTERVAL '2 days')
          FROM public.post_comments pc
          WHERE pc.user_id = v_target_id
          LIMIT 1
          ON CONFLICT DO NOTHING;
      END CASE;
    END LOOP;

  END LOOP;

  RAISE NOTICE 'Created sample notifications for all users';

  -- =============================================================================
  -- 4. CREATE RECENT UNREAD NOTIFICATIONS (last 24 hours)
  -- =============================================================================
  -- Ensure each user has at least 2-3 recent unread notifications

  FOR v_i IN 1..array_length(v_user_ids, 1) LOOP
    v_target_id := v_user_ids[v_i];

    -- Get user's posts
    FOR v_temp_post_id IN
      SELECT id FROM public.posts WHERE user_id = v_target_id LIMIT 2
    LOOP
      -- Add 2 recent likes from random users
      FOR v_j IN 1..2 LOOP
        v_actor_id := v_user_ids[1 + (floor(random() * array_length(v_user_ids, 1)))::int];

        IF v_actor_id != v_target_id AND v_actor_id IS NOT NULL THEN
          INSERT INTO public.post_notifications (
            user_id, type, actor_id, post_id, is_read, created_at
          ) VALUES (
            v_target_id,
            'post_like',
            v_actor_id,
            v_temp_post_id,
            false,  -- Unread
            NOW() - (random() * INTERVAL '12 hours')
          ) ON CONFLICT DO NOTHING;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Created recent unread notifications';

  -- =============================================================================
  -- 5. ENSURE VARIETY IN NOTIFICATION TIMESTAMPS
  -- =============================================================================
  -- Update some notifications to have nicer time distribution

  UPDATE public.post_notifications
  SET created_at = NOW() - INTERVAL '1 hour' - (random() * INTERVAL '30 minutes')
  WHERE is_read = false
    AND created_at > NOW() - INTERVAL '1 hour'
  LIMIT 5;

  UPDATE public.post_notifications
  SET created_at = NOW() - INTERVAL '3 hours' - (random() * INTERVAL '1 hour')
  WHERE is_read = false
    AND created_at > NOW() - INTERVAL '2 hours'
  LIMIT 5;

  UPDATE public.post_notifications
  SET created_at = NOW() - INTERVAL '1 day' - (random() * INTERVAL '12 hours')
  WHERE is_read = true
    AND created_at > NOW() - INTERVAL '1 day'
  LIMIT 10;

  RAISE NOTICE 'Notification seeding complete!';
END $$;

-- =============================================================================
-- Summary
-- =============================================================================
-- This migration creates:
-- 1. Retroactive notifications from existing post_likes
-- 2. Retroactive notifications from existing post_comments
-- 3. 5-8 additional sample notifications per user
-- 4. 2-4 recent unread notifications per user (last 24 hours)
--
-- Notification types included:
-- - post_like: Someone liked your post
-- - post_comment: Someone commented on your post
-- - comment_like: Someone liked your comment
-- - comment_reply: Someone replied to your comment
--
-- Each user should now see a populated notifications tab with:
-- - Mix of read/unread notifications
-- - Various notification types
-- - Timestamps spanning the last week
-- =============================================================================
