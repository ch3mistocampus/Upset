-- =============================================================================
-- Comprehensive Mock Data Seed
-- =============================================================================
-- This migration fills in ALL missing mock data to fully test the app:
-- 1. Post Notifications (likes, comments, replies)
-- 2. Push Notification Log (picks graded, followers, reminders)
-- 3. Notification Preferences for test users
-- 4. Additional posts with varied engagement
-- 5. Privacy settings variations
-- 6. Blocked/muted users for testing
-- 7. Additional follow records
-- 8. More detailed activities
-- =============================================================================

-- =============================================================================
-- 1. SEED POST NOTIFICATIONS
-- =============================================================================
-- These simulate users interacting with each other's posts

DO $$
DECLARE
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
  v_post_ids UUID[];
  v_comment_ids UUID[];
BEGIN
  -- Get user IDs
  SELECT user_id INTO v_alice FROM public.profiles WHERE username = 'alicechen';
  SELECT user_id INTO v_bob FROM public.profiles WHERE username = 'bsantos';
  SELECT user_id INTO v_charlie FROM public.profiles WHERE username = 'charliej';
  SELECT user_id INTO v_david FROM public.profiles WHERE username = 'dkim23';
  SELECT user_id INTO v_emma FROM public.profiles WHERE username = 'emmarod';
  SELECT user_id INTO v_frank FROM public.profiles WHERE username = 'bigfrank';
  SELECT user_id INTO v_grace FROM public.profiles WHERE username = 'gracet';
  SELECT user_id INTO v_henry FROM public.profiles WHERE username = 'henryjack';
  SELECT user_id INTO v_iris FROM public.profiles WHERE username = 'irismtz';
  SELECT user_id INTO v_jack FROM public.profiles WHERE username = 'jmorrison';
  SELECT user_id INTO v_kate FROM public.profiles WHERE username = 'kateo';
  SELECT user_id INTO v_leo FROM public.profiles WHERE username = 'leonak';
  SELECT user_id INTO v_mia FROM public.profiles WHERE username = 'miadavis';

  IF v_alice IS NULL THEN
    RAISE NOTICE 'Test users not found. Skipping notification seeds.';
    RETURN;
  END IF;

  -- Get existing posts for reference
  SELECT ARRAY_AGG(id) INTO v_post_ids FROM public.posts LIMIT 10;
  SELECT ARRAY_AGG(id) INTO v_comment_ids FROM public.post_comments LIMIT 10;

  IF v_post_ids IS NULL OR array_length(v_post_ids, 1) = 0 THEN
    RAISE NOTICE 'No posts found. Skipping post notifications.';
    RETURN;
  END IF;

  -- Insert post notifications for Alice (she's popular!)
  -- Bob liked her analysis
  INSERT INTO public.post_notifications (user_id, type, actor_id, post_id, is_read, created_at)
  SELECT v_alice, 'post_like', v_bob, v_post_ids[1], false, NOW() - INTERVAL '2 hours'
  WHERE EXISTS (SELECT 1 FROM public.post_notifications LIMIT 0) -- Table exists check
  ON CONFLICT DO NOTHING;

  -- Charlie commented on her post
  INSERT INTO public.post_notifications (user_id, type, actor_id, post_id, comment_id, is_read, created_at)
  SELECT v_alice, 'post_comment', v_charlie, v_post_ids[1], v_comment_ids[1], false, NOW() - INTERVAL '3 hours'
  WHERE v_comment_ids IS NOT NULL AND array_length(v_comment_ids, 1) > 0
  ON CONFLICT DO NOTHING;

  -- David liked her comment
  INSERT INTO public.post_notifications (user_id, type, actor_id, post_id, comment_id, is_read, created_at)
  SELECT v_alice, 'comment_like', v_david, v_post_ids[1], v_comment_ids[1], false, NOW() - INTERVAL '4 hours'
  WHERE v_comment_ids IS NOT NULL AND array_length(v_comment_ids, 1) > 0
  ON CONFLICT DO NOTHING;

  -- Emma replied to Alice's comment
  INSERT INTO public.post_notifications (user_id, type, actor_id, post_id, comment_id, is_read, created_at)
  SELECT v_alice, 'comment_reply', v_emma, v_post_ids[1], v_comment_ids[1], true, NOW() - INTERVAL '1 day'
  WHERE v_comment_ids IS NOT NULL AND array_length(v_comment_ids, 1) > 0
  ON CONFLICT DO NOTHING;

  -- More likes from various users (mix of read/unread)
  INSERT INTO public.post_notifications (user_id, type, actor_id, post_id, is_read, created_at)
  VALUES
    (v_alice, 'post_like', v_frank, v_post_ids[1], false, NOW() - INTERVAL '5 hours'),
    (v_alice, 'post_like', v_grace, v_post_ids[1], true, NOW() - INTERVAL '6 hours'),
    (v_alice, 'post_like', v_henry, v_post_ids[1], true, NOW() - INTERVAL '1 day'),
    (v_alice, 'post_like', v_iris, v_post_ids[1], true, NOW() - INTERVAL '2 days'),
    (v_alice, 'post_like', v_jack, v_post_ids[1], true, NOW() - INTERVAL '3 days')
  ON CONFLICT DO NOTHING;

  -- Notifications for Bob
  INSERT INTO public.post_notifications (user_id, type, actor_id, post_id, is_read, created_at)
  VALUES
    (v_bob, 'post_like', v_alice, v_post_ids[1], false, NOW() - INTERVAL '30 minutes'),
    (v_bob, 'post_like', v_charlie, v_post_ids[1], true, NOW() - INTERVAL '1 day'),
    (v_bob, 'post_comment', v_jack, v_post_ids[1], v_comment_ids[1], false, NOW() - INTERVAL '2 hours')
  ON CONFLICT DO NOTHING;

  -- Notifications for Jack (the analyst)
  INSERT INTO public.post_notifications (user_id, type, actor_id, post_id, is_read, created_at)
  VALUES
    (v_jack, 'post_like', v_alice, v_post_ids[1], false, NOW() - INTERVAL '1 hour'),
    (v_jack, 'post_like', v_bob, v_post_ids[1], false, NOW() - INTERVAL '2 hours'),
    (v_jack, 'post_like', v_charlie, v_post_ids[1], false, NOW() - INTERVAL '3 hours'),
    (v_jack, 'post_like', v_david, v_post_ids[1], true, NOW() - INTERVAL '1 day'),
    (v_jack, 'post_comment', v_iris, v_post_ids[1], v_comment_ids[1], true, NOW() - INTERVAL '2 days')
  ON CONFLICT DO NOTHING;

  -- Notifications for Iris (the contrarian)
  INSERT INTO public.post_notifications (user_id, type, actor_id, post_id, is_read, created_at)
  VALUES
    (v_iris, 'post_like', v_jack, v_post_ids[1], false, NOW() - INTERVAL '45 minutes'),
    (v_iris, 'comment_reply', v_frank, v_post_ids[1], v_comment_ids[1], false, NOW() - INTERVAL '1 hour')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created post notifications for test users';
END $$;

-- =============================================================================
-- 2. SEED NOTIFICATION PREFERENCES
-- =============================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_username TEXT;
BEGIN
  -- Create notification preferences for all test users
  FOR v_username IN SELECT unnest(ARRAY[
    'alicechen', 'bsantos', 'charliej', 'dkim23', 'emmarod',
    'bigfrank', 'gracet', 'henryjack', 'irismtz',
    'jmorrison', 'kateo', 'leonak', 'miadavis'
  ]) LOOP
    SELECT user_id INTO v_user_id FROM public.profiles WHERE username = v_username;

    IF v_user_id IS NOT NULL THEN
      INSERT INTO public.notification_preferences (
        user_id,
        new_follower,
        picks_graded,
        event_reminder_24h,
        event_reminder_1h,
        friend_activity,
        weekly_recap,
        streak_at_risk
      ) VALUES (
        v_user_id,
        true,  -- new_follower
        true,  -- picks_graded
        true,  -- event_reminder_24h
        CASE WHEN v_username IN ('alicechen', 'jmorrison', 'miadavis') THEN true ELSE false END, -- event_reminder_1h (only active users)
        CASE WHEN v_username IN ('alicechen', 'bsantos', 'charliej') THEN true ELSE false END, -- friend_activity
        true,  -- weekly_recap
        true   -- streak_at_risk
      ) ON CONFLICT (user_id) DO UPDATE SET
        friend_activity = EXCLUDED.friend_activity,
        event_reminder_1h = EXCLUDED.event_reminder_1h;
    END IF;
  END LOOP;

  RAISE NOTICE 'Created notification preferences for test users';
END $$;

-- =============================================================================
-- 3. SEED PUSH NOTIFICATION LOG (History)
-- =============================================================================

DO $$
DECLARE
  v_alice UUID;
  v_bob UUID;
  v_charlie UUID;
  v_jack UUID;
  v_mia UUID;
  v_event_id UUID := 'e0000000-0000-0000-0000-000000000002'; -- UFC 299
BEGIN
  SELECT user_id INTO v_alice FROM public.profiles WHERE username = 'alicechen';
  SELECT user_id INTO v_bob FROM public.profiles WHERE username = 'bsantos';
  SELECT user_id INTO v_charlie FROM public.profiles WHERE username = 'charliej';
  SELECT user_id INTO v_jack FROM public.profiles WHERE username = 'jmorrison';
  SELECT user_id INTO v_mia FROM public.profiles WHERE username = 'miadavis';

  IF v_alice IS NULL THEN
    RAISE NOTICE 'Test users not found. Skipping notification log.';
    RETURN;
  END IF;

  -- Check if table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_log') THEN
    RAISE NOTICE 'notification_log table not found. Skipping.';
    RETURN;
  END IF;

  -- Alice's notification history
  INSERT INTO public.notification_log (user_id, type, title, body, data, sent_at, read_at)
  VALUES
    (v_alice, 'picks_graded', 'UFC 299 Results Are In!', 'You got 2 out of 3 picks correct. 66% accuracy!',
     '{"event_id": "e0000000-0000-0000-0000-000000000002", "correct": 2, "total": 3}'::jsonb,
     NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '1 hour'),
    (v_alice, 'new_follower', 'New Follower', 'miadavis started following you',
     '{"user_id": "' || v_mia || '"}'::jsonb,
     NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '30 minutes'),
    (v_alice, 'streak_at_risk', 'Don''t Lose Your Streak!', 'You have a 5-fight win streak. Make your picks for UFC 310!',
     '{"streak": 5}'::jsonb,
     NOW() - INTERVAL '1 day', NULL),
    (v_alice, 'event_reminder', 'Picks Lock in 24 Hours', 'UFC 310 locks tomorrow at 6pm ET. Make your picks!',
     '{"event_id": "e0000000-0000-0000-0000-000000000003"}'::jsonb,
     NOW() - INTERVAL '12 hours', NULL),
    (v_alice, 'weekly_recap', 'Your Weekly Recap', 'This week: 4 correct, 1 wrong, 80% accuracy. You''re on fire!',
     '{"correct": 4, "wrong": 1, "accuracy": 80}'::jsonb,
     NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '2 hours')
  ON CONFLICT DO NOTHING;

  -- Bob's notification history
  INSERT INTO public.notification_log (user_id, type, title, body, data, sent_at, read_at)
  VALUES
    (v_bob, 'picks_graded', 'UFC 299 Results Are In!', 'You got 1 out of 3 picks correct. Keep trying!',
     '{"event_id": "e0000000-0000-0000-0000-000000000002", "correct": 1, "total": 3}'::jsonb,
     NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days'),
    (v_bob, 'new_follower', 'New Follower', 'gracet started following you',
     '{"user_id": "' || (SELECT user_id FROM profiles WHERE username = 'gracet') || '"}'::jsonb,
     NOW() - INTERVAL '4 days', NULL),
    (v_bob, 'friend_activity', 'Alice is on a Hot Streak!', 'Your friend alicechen just hit 5 correct picks in a row',
     '{"user_id": "' || v_alice || '", "streak": 5}'::jsonb,
     NOW() - INTERVAL '2 days', NULL)
  ON CONFLICT DO NOTHING;

  -- Jack's notification history (the analyst)
  INSERT INTO public.notification_log (user_id, type, title, body, data, sent_at, read_at)
  VALUES
    (v_jack, 'picks_graded', 'Perfect Card! 🎯', 'You got 3 out of 3 picks correct at UFC 299. 100% accuracy!',
     '{"event_id": "e0000000-0000-0000-0000-000000000002", "correct": 3, "total": 3}'::jsonb,
     NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '10 minutes'),
    (v_jack, 'weekly_recap', 'Your Weekly Recap', 'This week: 5 correct, 0 wrong, 100% accuracy. Incredible!',
     '{"correct": 5, "wrong": 0, "accuracy": 100}'::jsonb,
     NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '1 hour'),
    (v_jack, 'new_follower', '3 New Followers', 'alicechen and 2 others started following you',
     '{"count": 3}'::jsonb,
     NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '2 hours')
  ON CONFLICT DO NOTHING;

  -- Mia's notification history
  INSERT INTO public.notification_log (user_id, type, title, body, data, sent_at, read_at)
  VALUES
    (v_mia, 'picks_graded', 'UFC 299 Results', 'You got 2 out of 3 picks correct. 66% accuracy!',
     '{"event_id": "e0000000-0000-0000-0000-000000000002", "correct": 2, "total": 3}'::jsonb,
     NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '3 hours'),
    (v_mia, 'streak_at_risk', 'Keep the Momentum!', 'You''ve won 5 events in a row. Don''t break the streak!',
     '{"streak": 5, "type": "event_wins"}'::jsonb,
     NOW() - INTERVAL '1 day', NULL)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created notification log entries for test users';
END $$;

-- =============================================================================
-- 4. SEED ADDITIONAL POSTS WITH VARIED ENGAGEMENT
-- =============================================================================

DO $$
DECLARE
  v_kate UUID;
  v_leo UUID;
  v_henry UUID;
  v_grace UUID;
  v_emma UUID;
  v_new_post_1 UUID;
  v_new_post_2 UUID;
  v_new_post_3 UUID;
  v_new_post_4 UUID;
  v_event_id UUID;
BEGIN
  SELECT user_id INTO v_kate FROM public.profiles WHERE username = 'kateo';
  SELECT user_id INTO v_leo FROM public.profiles WHERE username = 'leonak';
  SELECT user_id INTO v_henry FROM public.profiles WHERE username = 'henryjack';
  SELECT user_id INTO v_grace FROM public.profiles WHERE username = 'gracet';
  SELECT user_id INTO v_emma FROM public.profiles WHERE username = 'emmarod';

  IF v_kate IS NULL THEN
    RAISE NOTICE 'Test users not found. Skipping additional posts.';
    RETURN;
  END IF;

  -- Get an event for tagging
  SELECT id INTO v_event_id FROM public.events WHERE date > NOW() LIMIT 1;

  -- Kate's striking analysis
  v_new_post_1 := gen_random_uuid();
  INSERT INTO public.posts (id, user_id, title, content, post_type, engagement_score, created_at)
  VALUES (
    v_new_post_1,
    v_kate,
    'The Art of the Low Kick',
    E'Low kicks are the most underutilized weapon in MMA. Here''s why:\n\n1. Cumulative damage - they slow down movement over time\n2. Low risk - hard to counter\n3. Set up takedowns and hooks\n\nMy prediction: whoever lands more leg kicks wins more rounds.',
    'analysis',
    15,
    NOW() - INTERVAL '2 days'
  ) ON CONFLICT DO NOTHING;

  -- Leo's veteran insight
  v_new_post_2 := gen_random_uuid();
  INSERT INTO public.posts (id, user_id, title, content, post_type, engagement_score, created_at)
  VALUES (
    v_new_post_2,
    v_leo,
    'Experience vs Youth: Who to pick?',
    E'After tracking 500+ fights, here''s my take:\n\n- Under 25: Pick the favorite 70% of the time\n- Over 35: Pick the underdog 45% of the time\n\nExperience matters most in championship rounds.',
    'discussion',
    22,
    NOW() - INTERVAL '18 hours'
  ) ON CONFLICT DO NOTHING;

  -- Henry's heavyweight hot take
  v_new_post_3 := gen_random_uuid();
  INSERT INTO public.posts (id, user_id, title, content, post_type, engagement_score, created_at)
  VALUES (
    v_new_post_3,
    v_henry,
    'HW is the most unpredictable division - and I love it',
    E'Everyone says "one punch can change everything" but at heavyweight IT ACTUALLY HAPPENS.\n\n60% of HW fights end in finish. That''s why I exclusively pick power punchers in this division.',
    'opinion',
    18,
    NOW() - INTERVAL '1 day'
  ) ON CONFLICT DO NOTHING;

  -- Grace's grappling breakdown
  v_new_post_4 := gen_random_uuid();
  INSERT INTO public.posts (id, user_id, title, content, post_type, engagement_score, created_at)
  VALUES (
    v_new_post_4,
    v_grace,
    'Why wrestling is still king in MMA',
    E'Striking gets the highlights, but wrestling wins championships.\n\nTop 5 P4P right now:\n- Islam: Sambo\n- Jones: Wrestling\n- Volkanovski: Wrestling base\n- Duplesis: BJJ/Wrestling\n- Merab: Wrestling\n\n4/5 are grapplers. Coincidence? I think not.',
    'analysis',
    31,
    NOW() - INTERVAL '8 hours'
  ) ON CONFLICT DO NOTHING;

  -- Add engagement to new posts
  IF v_new_post_4 IS NOT NULL THEN
    -- Likes on Grace's post
    INSERT INTO public.post_likes (post_id, user_id, created_at)
    SELECT v_new_post_4, user_id, NOW() - INTERVAL '6 hours'
    FROM public.profiles
    WHERE username IN ('alicechen', 'bsantos', 'leonak', 'emmarod', 'jmorrison')
    ON CONFLICT DO NOTHING;

    -- Comment from Emma
    INSERT INTO public.post_comments (post_id, user_id, content, created_at)
    VALUES (
      v_new_post_4,
      v_emma,
      'Absolutely agree. The only pure strikers at the top are ones with elite TDD. Without wrestling defense, you can''t stay standing.',
      NOW() - INTERVAL '5 hours'
    ) ON CONFLICT DO NOTHING;

    -- Comment from Kate (friendly debate)
    INSERT INTO public.post_comments (post_id, user_id, content, created_at)
    VALUES (
      v_new_post_4,
      v_kate,
      'Counter-argument: Pereira is #2 P4P and is a pure striker. But yes, his TDD has improved dramatically.',
      NOW() - INTERVAL '4 hours'
    ) ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE 'Created additional posts with engagement';
END $$;

-- =============================================================================
-- 5. SEED VARIED PRIVACY SETTINGS
-- =============================================================================

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Check if privacy_settings table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'privacy_settings') THEN
    RAISE NOTICE 'privacy_settings table not found. Skipping.';
    RETURN;
  END IF;

  -- Henry: Followers only (testing privacy)
  SELECT user_id INTO v_user_id FROM public.profiles WHERE username = 'henryjack';
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.privacy_settings (user_id, picks_visibility, stats_visibility, profile_visibility)
    VALUES (v_user_id, 'followers', 'followers', 'public')
    ON CONFLICT (user_id) DO UPDATE SET
      picks_visibility = EXCLUDED.picks_visibility,
      stats_visibility = EXCLUDED.stats_visibility;
  END IF;

  -- Iris: Private (the contrarian hides her picks)
  SELECT user_id INTO v_user_id FROM public.profiles WHERE username = 'irismtz';
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.privacy_settings (user_id, picks_visibility, stats_visibility, profile_visibility)
    VALUES (v_user_id, 'private', 'followers', 'followers')
    ON CONFLICT (user_id) DO UPDATE SET
      picks_visibility = EXCLUDED.picks_visibility,
      stats_visibility = EXCLUDED.stats_visibility,
      profile_visibility = EXCLUDED.profile_visibility;
  END IF;

  RAISE NOTICE 'Created varied privacy settings';
END $$;

-- =============================================================================
-- 6. SEED BLOCKED/MUTED USERS
-- =============================================================================

DO $$
DECLARE
  v_alice UUID;
  v_iris UUID;
  v_henry UUID;
  v_random_user UUID;
BEGIN
  SELECT user_id INTO v_alice FROM public.profiles WHERE username = 'alicechen';
  SELECT user_id INTO v_iris FROM public.profiles WHERE username = 'irismtz';
  SELECT user_id INTO v_henry FROM public.profiles WHERE username = 'henryjack';

  IF v_alice IS NULL THEN
    RAISE NOTICE 'Test users not found. Skipping block/mute seeds.';
    RETURN;
  END IF;

  -- Check if user_blocks table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_blocks') THEN
    -- Iris blocked by Henry (their picking styles clash)
    INSERT INTO public.user_blocks (blocker_id, blocked_id, created_at)
    VALUES (v_henry, v_iris, NOW() - INTERVAL '10 days')
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created block relationships';
  END IF;

  -- Check if user_mutes table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_mutes') THEN
    -- Alice muted Henry (too many hot takes)
    INSERT INTO public.user_mutes (muter_id, muted_id, created_at)
    VALUES (v_alice, v_henry, NOW() - INTERVAL '5 days')
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created mute relationships';
  END IF;
END $$;

-- =============================================================================
-- 7. SEED ADDITIONAL FOLLOWS
-- =============================================================================

DO $$
DECLARE
  v_alice UUID;
  v_kate UUID;
  v_henry UUID;
  v_grace UUID;
  v_emma UUID;
  v_charlie UUID;
BEGIN
  SELECT user_id INTO v_alice FROM public.profiles WHERE username = 'alicechen';
  SELECT user_id INTO v_kate FROM public.profiles WHERE username = 'kateo';
  SELECT user_id INTO v_henry FROM public.profiles WHERE username = 'henryjack';
  SELECT user_id INTO v_grace FROM public.profiles WHERE username = 'gracet';
  SELECT user_id INTO v_emma FROM public.profiles WHERE username = 'emmarod';
  SELECT user_id INTO v_charlie FROM public.profiles WHERE username = 'charliej';

  IF v_alice IS NULL THEN
    RAISE NOTICE 'Test users not found. Skipping follow seeds.';
    RETURN;
  END IF;

  -- More users following Alice (she's popular)
  INSERT INTO public.follows (user_id, following_id, status, created_at)
  VALUES
    (v_kate, v_alice, 'accepted', NOW() - INTERVAL '3 days'),
    (v_henry, v_alice, 'accepted', NOW() - INTERVAL '5 days'),
    (v_grace, v_alice, 'accepted', NOW() - INTERVAL '1 day')
  ON CONFLICT DO NOTHING;

  -- Emma follows Charlie
  INSERT INTO public.follows (user_id, following_id, status, created_at)
  VALUES
    (v_emma, v_charlie, 'accepted', NOW() - INTERVAL '10 days')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created additional follow relationships';
END $$;

-- =============================================================================
-- 8. SEED MORE ACTIVITIES FOR FEEDS
-- =============================================================================

DO $$
DECLARE
  v_kate UUID;
  v_leo UUID;
  v_henry UUID;
  v_grace UUID;
  v_charlie UUID;
  v_event_id UUID := 'e0000000-0000-0000-0000-000000000002';
BEGIN
  SELECT user_id INTO v_kate FROM public.profiles WHERE username = 'kateo';
  SELECT user_id INTO v_leo FROM public.profiles WHERE username = 'leonak';
  SELECT user_id INTO v_henry FROM public.profiles WHERE username = 'henryjack';
  SELECT user_id INTO v_grace FROM public.profiles WHERE username = 'gracet';
  SELECT user_id INTO v_charlie FROM public.profiles WHERE username = 'charliej';

  IF v_kate IS NULL THEN
    RAISE NOTICE 'Test users not found. Skipping activity seeds.';
    RETURN;
  END IF;

  -- Check if activities table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activities') THEN
    RAISE NOTICE 'Activities table not found. Skipping.';
    RETURN;
  END IF;

  -- Kate's striking prediction success
  INSERT INTO public.activities (user_id, activity_type, title, description, data, engagement_score, created_at)
  VALUES
    (v_kate, 'accuracy_milestone', '70% Accuracy in Striker Fights!',
     'kateo has correctly predicted 70% of fights featuring elite strikers.',
     '{"accuracy": 70, "category": "striker", "picks": 20}'::jsonb,
     12, NOW() - INTERVAL '3 days')
  ON CONFLICT DO NOTHING;

  -- Grace's grappling prediction success
  INSERT INTO public.activities (user_id, activity_type, title, description, data, engagement_score, created_at)
  VALUES
    (v_grace, 'accuracy_milestone', 'Grappler Expert Badge!',
     'gracet correctly predicted 8 out of 10 grappler-focused fights.',
     '{"accuracy": 80, "category": "grappler", "picks": 10}'::jsonb,
     18, NOW() - INTERVAL '2 days')
  ON CONFLICT DO NOTHING;

  -- Henry's heavyweight streak
  INSERT INTO public.activities (user_id, activity_type, title, description, data, engagement_score, created_at)
  VALUES
    (v_henry, 'streak_milestone', '6 HW Fights in a Row!',
     'henryjack predicted 6 consecutive heavyweight fight winners.',
     '{"streak_count": 6, "streak_type": "win", "division": "Heavyweight"}'::jsonb,
     20, NOW() - INTERVAL '1 day')
  ON CONFLICT DO NOTHING;

  -- Charlie's data-driven milestone
  INSERT INTO public.activities (user_id, activity_type, title, description, data, engagement_score, created_at)
  VALUES
    (v_charlie, 'badge_earned', 'Data Analyst Badge',
     'charliej has made picks for 50+ events with detailed analysis.',
     '{"badge_name": "Data Analyst", "events_analyzed": 52}'::jsonb,
     8, NOW() - INTERVAL '4 days')
  ON CONFLICT DO NOTHING;

  -- Leo's veteran milestone
  INSERT INTO public.activities (user_id, activity_type, title, description, data, engagement_score, created_at)
  VALUES
    (v_leo, 'accuracy_milestone', 'Master of Experience!',
     'leonak''s veteran-picks strategy hits 65% overall accuracy.',
     '{"accuracy": 65, "total_picks": 100, "correct_picks": 65}'::jsonb,
     15, NOW() - INTERVAL '12 hours')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created additional activities for feeds';
END $$;

-- =============================================================================
-- 9. SEED COMMENT LIKES
-- =============================================================================

DO $$
DECLARE
  v_alice UUID;
  v_bob UUID;
  v_jack UUID;
  v_emma UUID;
  v_comment_ids UUID[];
BEGIN
  SELECT user_id INTO v_alice FROM public.profiles WHERE username = 'alicechen';
  SELECT user_id INTO v_bob FROM public.profiles WHERE username = 'bsantos';
  SELECT user_id INTO v_jack FROM public.profiles WHERE username = 'jmorrison';
  SELECT user_id INTO v_emma FROM public.profiles WHERE username = 'emmarod';

  IF v_alice IS NULL THEN
    RAISE NOTICE 'Test users not found. Skipping comment likes.';
    RETURN;
  END IF;

  -- Check if comment_likes table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comment_likes') THEN
    RAISE NOTICE 'comment_likes table not found. Skipping.';
    RETURN;
  END IF;

  -- Get comments to like
  SELECT ARRAY_AGG(id) INTO v_comment_ids FROM public.post_comments LIMIT 10;

  IF v_comment_ids IS NULL OR array_length(v_comment_ids, 1) = 0 THEN
    RAISE NOTICE 'No comments found for liking.';
    RETURN;
  END IF;

  -- Various users like comments
  INSERT INTO public.comment_likes (comment_id, user_id, created_at)
  VALUES
    (v_comment_ids[1], v_alice, NOW() - INTERVAL '4 days'),
    (v_comment_ids[1], v_bob, NOW() - INTERVAL '4 days'),
    (v_comment_ids[1], v_jack, NOW() - INTERVAL '3 days'),
    (v_comment_ids[2], v_emma, NOW() - INTERVAL '3 days'),
    (v_comment_ids[2], v_alice, NOW() - INTERVAL '2 days')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created comment likes';
END $$;

-- =============================================================================
-- Summary
-- =============================================================================
-- This migration adds comprehensive mock data for:
-- 1. 20+ post notifications (likes, comments, replies)
-- 2. Notification preferences for all 13 test users
-- 3. 15+ push notification history entries
-- 4. 4 new posts with varied engagement
-- 5. Privacy settings variations (followers-only, private)
-- 6. Block/mute relationships for testing
-- 7. Additional follow relationships
-- 8. 5+ additional activity records
-- 9. Comment likes for engagement
--
-- This should make the app fully testable with realistic data!
-- =============================================================================
