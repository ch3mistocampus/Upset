-- =============================================================================
-- Seed User Profiles, Social Connections, and Activity Data
-- =============================================================================
-- This migration populates realistic user data to make the app feel "lived in":
-- - Profile details (display name, bio, avatar)
-- - Friendships between test users
-- - Activities for discover/following feeds
-- - Sample posts and comments
-- =============================================================================

-- First, add display_name column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'display_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN display_name TEXT;
  END IF;
END $$;

-- =============================================================================
-- 1. UPDATE USER PROFILES WITH BIOS, AVATARS, AND DISPLAY NAMES
-- =============================================================================

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Alice UFC
  SELECT user_id INTO v_user_id FROM public.profiles WHERE username = 'alice_ufc';
  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles SET
      display_name = 'Alice Chen',
      bio = 'UFC analyst and picks enthusiast since 2018. Love breaking down striking matchups.',
      avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice_ufc&backgroundColor=b6e3f4'
    WHERE user_id = v_user_id;
  END IF;

  -- Bob Fighter
  SELECT user_id INTO v_user_id FROM public.profiles WHERE username = 'bob_fighter';
  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles SET
      display_name = 'Bob Santos',
      bio = 'Former amateur fighter, now predicting pros. BJJ brown belt. Team pressure fighters.',
      avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob_fighter&backgroundColor=c0aede'
    WHERE user_id = v_user_id;
  END IF;

  -- Charlie Picks
  SELECT user_id INTO v_user_id FROM public.profiles WHERE username = 'charlie_picks';
  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles SET
      display_name = 'Charlie James',
      bio = 'Data-driven picks. I analyze fight stats and let the numbers guide me.',
      avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=charlie_picks&backgroundColor=d1d4f9'
    WHERE user_id = v_user_id;
  END IF;

  -- David MMA
  SELECT user_id INTO v_user_id FROM public.profiles WHERE username = 'david_mma';
  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles SET
      display_name = 'David Kim',
      bio = 'Chalk picker and proud. Why bet against the better fighter? 80% favorite picks.',
      avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=david_mma&backgroundColor=ffd5dc'
    WHERE user_id = v_user_id;
  END IF;

  -- Emma Octagon
  SELECT user_id INTO v_user_id FROM public.profiles WHERE username = 'emma_octagon';
  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles SET
      display_name = 'Emma Rodriguez',
      bio = 'MMA journalist covering UFC since 2015. I pick what I report.',
      avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=emma_octagon&backgroundColor=ffdfbf'
    WHERE user_id = v_user_id;
  END IF;

  -- Frank Knockout
  SELECT user_id INTO v_user_id FROM public.profiles WHERE username = 'frank_knockout';
  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles SET
      display_name = 'Frank "KO" Williams',
      bio = 'Power punchers win fights. I follow the knockout artists.',
      avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=frank_knockout&backgroundColor=c1e1c1'
    WHERE user_id = v_user_id;
  END IF;

  -- Grace Grappling
  SELECT user_id INTO v_user_id FROM public.profiles WHERE username = 'grace_grappling';
  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles SET
      display_name = 'Grace Thompson',
      bio = 'Jiu-jitsu coach. I believe in the ground game. Grapplers are underrated.',
      avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=grace_grappling&backgroundColor=bae1ff'
    WHERE user_id = v_user_id;
  END IF;

  -- Henry Heavyweight
  SELECT user_id INTO v_user_id FROM public.profiles WHERE username = 'henry_heavyweight';
  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles SET
      display_name = 'Henry "Big Man" Jackson',
      bio = 'Heavyweight specialist. The big boys hit different. Power > technique.',
      avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=henry_heavyweight&backgroundColor=ffffba'
    WHERE user_id = v_user_id;
  END IF;

  -- Iris Insider
  SELECT user_id INTO v_user_id FROM public.profiles WHERE username = 'iris_insider';
  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles SET
      display_name = 'Iris Martinez',
      bio = 'Contrarian picks since 2020. The upset is always one fight away.',
      avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=iris_insider&backgroundColor=ffb3ba'
    WHERE user_id = v_user_id;
  END IF;

  -- Jack Judge
  SELECT user_id INTO v_user_id FROM public.profiles WHERE username = 'jack_judge';
  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles SET
      display_name = 'Jack "The Judge" Morrison',
      bio = 'Balanced analyst. I score fights and pick based on who wins rounds.',
      avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=jack_judge&backgroundColor=baffc9'
    WHERE user_id = v_user_id;
  END IF;

  -- Kate Kicks
  SELECT user_id INTO v_user_id FROM public.profiles WHERE username = 'kate_kicks';
  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles SET
      display_name = 'Kate "Kicks" O''Brien',
      bio = 'Kickboxing background. Volume strikers are my picks. Leg kicks win fights.',
      avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=kate_kicks&backgroundColor=e2f0cb'
    WHERE user_id = v_user_id;
  END IF;

  -- Leo Legacy
  SELECT user_id INTO v_user_id FROM public.profiles WHERE username = 'leo_legacy';
  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles SET
      display_name = 'Leo Nakamura',
      bio = 'Experience matters. Veterans over prospects. Trust the record.',
      avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=leo_legacy&backgroundColor=feffd5'
    WHERE user_id = v_user_id;
  END IF;

  -- Mia Momentum
  SELECT user_id INTO v_user_id FROM public.profiles WHERE username = 'mia_momentum';
  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles SET
      display_name = 'Mia "Momentum" Davis',
      bio = 'Riding hot streaks since day one. Winners keep winning.',
      avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=mia_momentum&backgroundColor=ffc9de'
    WHERE user_id = v_user_id;
  END IF;

  RAISE NOTICE 'Updated profiles with display names, bios, and avatars';
END $$;

-- =============================================================================
-- 2. CREATE FRIENDSHIPS BETWEEN TEST USERS
-- =============================================================================

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
BEGIN
  -- Get user IDs
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
  SELECT user_id INTO v_mia FROM public.profiles WHERE username = 'mia_momentum';

  IF v_alice IS NULL THEN
    RAISE NOTICE 'Test users not found. Skipping friendships.';
    RETURN;
  END IF;

  -- Create friendship triangle: Alice ↔ Bob ↔ Charlie ↔ Alice
  INSERT INTO public.friendships (user_id, friend_id, status, created_at)
  VALUES
    (v_alice, v_bob, 'accepted', NOW() - INTERVAL '30 days'),
    (v_bob, v_alice, 'accepted', NOW() - INTERVAL '30 days'),
    (v_bob, v_charlie, 'accepted', NOW() - INTERVAL '25 days'),
    (v_charlie, v_bob, 'accepted', NOW() - INTERVAL '25 days'),
    (v_charlie, v_alice, 'accepted', NOW() - INTERVAL '20 days'),
    (v_alice, v_charlie, 'accepted', NOW() - INTERVAL '20 days')
  ON CONFLICT DO NOTHING;

  -- Alice is popular - friends with Jack and David
  INSERT INTO public.friendships (user_id, friend_id, status, created_at)
  VALUES
    (v_alice, v_jack, 'accepted', NOW() - INTERVAL '15 days'),
    (v_jack, v_alice, 'accepted', NOW() - INTERVAL '15 days'),
    (v_alice, v_david, 'accepted', NOW() - INTERVAL '12 days'),
    (v_david, v_alice, 'accepted', NOW() - INTERVAL '12 days')
  ON CONFLICT DO NOTHING;

  -- Power pickers: Frank ↔ Henry
  INSERT INTO public.friendships (user_id, friend_id, status, created_at)
  VALUES
    (v_frank, v_henry, 'accepted', NOW() - INTERVAL '18 days'),
    (v_henry, v_frank, 'accepted', NOW() - INTERVAL '18 days')
  ON CONFLICT DO NOTHING;

  -- Grapplers: Grace ↔ Bob
  INSERT INTO public.friendships (user_id, friend_id, status, created_at)
  VALUES
    (v_grace, v_bob, 'accepted', NOW() - INTERVAL '22 days'),
    (v_bob, v_grace, 'accepted', NOW() - INTERVAL '22 days')
  ON CONFLICT DO NOTHING;

  -- Analysts: Jack ↔ Charlie ↔ Iris
  INSERT INTO public.friendships (user_id, friend_id, status, created_at)
  VALUES
    (v_jack, v_charlie, 'accepted', NOW() - INTERVAL '14 days'),
    (v_charlie, v_jack, 'accepted', NOW() - INTERVAL '14 days'),
    (v_charlie, v_iris, 'accepted', NOW() - INTERVAL '10 days'),
    (v_iris, v_charlie, 'accepted', NOW() - INTERVAL '10 days')
  ON CONFLICT DO NOTHING;

  -- Strikers: Kate ↔ Emma ↔ Mia
  INSERT INTO public.friendships (user_id, friend_id, status, created_at)
  VALUES
    (v_kate, v_emma, 'accepted', NOW() - INTERVAL '16 days'),
    (v_emma, v_kate, 'accepted', NOW() - INTERVAL '16 days'),
    (v_emma, v_mia, 'accepted', NOW() - INTERVAL '8 days'),
    (v_mia, v_emma, 'accepted', NOW() - INTERVAL '8 days')
  ON CONFLICT DO NOTHING;

  -- Leo connects with veterans: Leo ↔ Jack
  INSERT INTO public.friendships (user_id, friend_id, status, created_at)
  VALUES
    (v_leo, v_jack, 'accepted', NOW() - INTERVAL '11 days'),
    (v_jack, v_leo, 'accepted', NOW() - INTERVAL '11 days')
  ON CONFLICT DO NOTHING;

  -- Pending requests for testing
  INSERT INTO public.friendships (user_id, friend_id, status, created_at)
  VALUES
    (v_mia, v_alice, 'pending', NOW() - INTERVAL '2 days'),
    (v_leo, v_frank, 'pending', NOW() - INTERVAL '1 day')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created friendships between test users';
END $$;

-- =============================================================================
-- 3. CREATE SAMPLE ACTIVITIES FOR FEEDS
-- =============================================================================

DO $$
DECLARE
  v_alice UUID;
  v_bob UUID;
  v_charlie UUID;
  v_david UUID;
  v_frank UUID;
  v_iris UUID;
  v_jack UUID;
  v_leo UUID;
  v_mia UUID;
  v_event_id UUID := 'e0000000-0000-0000-0000-000000000002'; -- UFC 299
BEGIN
  -- Get user IDs
  SELECT user_id INTO v_alice FROM public.profiles WHERE username = 'alice_ufc';
  SELECT user_id INTO v_bob FROM public.profiles WHERE username = 'bob_fighter';
  SELECT user_id INTO v_charlie FROM public.profiles WHERE username = 'charlie_picks';
  SELECT user_id INTO v_david FROM public.profiles WHERE username = 'david_mma';
  SELECT user_id INTO v_frank FROM public.profiles WHERE username = 'frank_knockout';
  SELECT user_id INTO v_iris FROM public.profiles WHERE username = 'iris_insider';
  SELECT user_id INTO v_jack FROM public.profiles WHERE username = 'jack_judge';
  SELECT user_id INTO v_leo FROM public.profiles WHERE username = 'leo_legacy';
  SELECT user_id INTO v_mia FROM public.profiles WHERE username = 'mia_momentum';

  IF v_alice IS NULL THEN
    RAISE NOTICE 'Test users not found. Skipping activities.';
    RETURN;
  END IF;

  -- Check if activities table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activities') THEN
    RAISE NOTICE 'Activities table not found. Skipping activity creation.';
    RETURN;
  END IF;

  -- Alice: Accuracy milestone (75%)
  INSERT INTO public.activities (user_id, activity_type, title, description, data, engagement_score, created_at)
  VALUES (
    v_alice,
    'accuracy_milestone',
    'Hit 75% Accuracy!',
    'alice_ufc reached 75% prediction accuracy across 28 picks.',
    '{"accuracy": 75, "total_picks": 28, "correct_picks": 21}'::jsonb,
    15,
    NOW() - INTERVAL '5 days'
  ) ON CONFLICT DO NOTHING;

  -- Iris: Top accuracy (93% - contrarian success)
  INSERT INTO public.activities (user_id, activity_type, title, description, data, engagement_score, created_at)
  VALUES (
    v_iris,
    'accuracy_milestone',
    'Reached Elite Status: 90%+ Accuracy!',
    'iris_insider defied the odds with 93% accuracy. Contrarian picks for the win!',
    '{"accuracy": 93, "total_picks": 29, "correct_picks": 27}'::jsonb,
    45,
    NOW() - INTERVAL '4 days'
  ) ON CONFLICT DO NOTHING;

  -- Jack: Event winner for UFC 299
  INSERT INTO public.activities (user_id, activity_type, title, description, data, event_id, engagement_score, created_at)
  VALUES (
    v_jack,
    'event_winner',
    'Won UFC 299 Leaderboard!',
    'jack_judge correctly predicted all 3 main card fights at UFC 299.',
    '{"event_name": "UFC 299", "correct_picks": 3, "total_picks": 3, "rank": 1}'::jsonb,
    v_event_id,
    35,
    NOW() - INTERVAL '6 days'
  ) ON CONFLICT DO NOTHING;

  -- Frank: Streak milestone (8 correct in a row)
  INSERT INTO public.activities (user_id, activity_type, title, description, data, engagement_score, created_at)
  VALUES (
    v_frank,
    'streak_milestone',
    '8-Fight Win Streak!',
    'frank_knockout is on fire with 8 correct predictions in a row.',
    '{"streak_count": 8, "streak_type": "win"}'::jsonb,
    25,
    NOW() - INTERVAL '3 days'
  ) ON CONFLICT DO NOTHING;

  -- David: Consistency milestone
  INSERT INTO public.activities (user_id, activity_type, title, description, data, engagement_score, created_at)
  VALUES (
    v_david,
    'accuracy_milestone',
    'Most Consistent Picker This Month',
    'david_mma maintained 73% accuracy across 30 picks this month.',
    '{"accuracy": 73, "total_picks": 30, "correct_picks": 22}'::jsonb,
    20,
    NOW() - INTERVAL '2 days'
  ) ON CONFLICT DO NOTHING;

  -- Mia: Momentum milestone (5 events with positive record)
  INSERT INTO public.activities (user_id, activity_type, title, description, data, engagement_score, created_at)
  VALUES (
    v_mia,
    'streak_milestone',
    '5 Winning Events in a Row!',
    'mia_momentum has a winning record at 5 consecutive UFC events.',
    '{"streak_count": 5, "streak_type": "event_wins"}'::jsonb,
    30,
    NOW() - INTERVAL '7 days'
  ) ON CONFLICT DO NOTHING;

  -- Leo: Legacy badge (1 year on platform)
  INSERT INTO public.activities (user_id, activity_type, title, description, data, engagement_score, created_at)
  VALUES (
    v_leo,
    'badge_earned',
    'Earned "Veteran" Badge',
    'leo_legacy has been making picks for over 1 year!',
    '{"badge_name": "Veteran", "badge_description": "1 year of predictions"}'::jsonb,
    10,
    NOW() - INTERVAL '1 day'
  ) ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created sample activities for feeds';
END $$;

-- =============================================================================
-- 4. CREATE SAMPLE POSTS FOR FORUM
-- =============================================================================

DO $$
DECLARE
  v_alice UUID;
  v_bob UUID;
  v_iris UUID;
  v_jack UUID;
  v_frank UUID;
  v_post_1 UUID;
  v_post_2 UUID;
  v_post_3 UUID;
  v_event_id UUID := 'e0000000-0000-0000-0000-000000000002'; -- UFC 299
BEGIN
  -- Get user IDs
  SELECT user_id INTO v_alice FROM public.profiles WHERE username = 'alice_ufc';
  SELECT user_id INTO v_bob FROM public.profiles WHERE username = 'bob_fighter';
  SELECT user_id INTO v_iris FROM public.profiles WHERE username = 'iris_insider';
  SELECT user_id INTO v_jack FROM public.profiles WHERE username = 'jack_judge';
  SELECT user_id INTO v_frank FROM public.profiles WHERE username = 'frank_knockout';

  IF v_alice IS NULL THEN
    RAISE NOTICE 'Test users not found. Skipping posts.';
    RETURN;
  END IF;

  -- Check if posts table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') THEN
    RAISE NOTICE 'Posts table not found. Skipping post creation.';
    RETURN;
  END IF;

  -- Post 1: Iris's analysis post
  v_post_1 := gen_random_uuid();
  INSERT INTO public.posts (id, user_id, title, content, post_type, engagement_score, created_at)
  VALUES (
    v_post_1,
    v_iris,
    'Why I picked Vera over O''Malley (and was wrong)',
    E'I know I was in the minority picking Vera, but here''s my analysis:\n\n1. Vera has shown incredible durability\n2. His leg kicks are devastating\n3. O''Malley has been hurt before\n\nBut I underestimated O''Malley''s improved wrestling defense and footwork. Lesson learned: don''t underestimate champions.',
    'discussion',
    28,
    NOW() - INTERVAL '6 days'
  ) ON CONFLICT DO NOTHING;

  -- Post 2: Jack's scorecard breakdown
  v_post_2 := gen_random_uuid();
  INSERT INTO public.posts (id, user_id, title, content, post_type, engagement_score, created_at)
  VALUES (
    v_post_2,
    v_jack,
    'UFC 299 Scorecard Analysis: O''Malley vs Vera',
    E'Round by round breakdown:\n\nR1: O''Malley (10-9) - Sharp jab, volume advantage\nR2: Close but Vera (10-9) - Body kicks, pressure\nR3: O''Malley (10-8) - Dominant round, almost finished it\nR4: O''Malley (10-9) - Coasting with lead\nR5: O''Malley (10-9) - Championship rounds\n\nFinal: 49-45 O''Malley. The global scorecard showed 77% agreement with this assessment.',
    'analysis',
    42,
    NOW() - INTERVAL '5 days'
  ) ON CONFLICT DO NOTHING;

  -- Post 3: Frank's hot take
  v_post_3 := gen_random_uuid();
  INSERT INTO public.posts (id, user_id, title, content, post_type, engagement_score, created_at)
  VALUES (
    v_post_3,
    v_frank,
    'Poirier proved why power > cardio every time',
    E'Saint-Denis was supposed to outwork Poirier, but what happened? \n\nPoirier''s experience and POWER ended it in R2. This is why I always pick the power puncher when the odds are close. Finishes > decisions.',
    'opinion',
    19,
    NOW() - INTERVAL '4 days'
  ) ON CONFLICT DO NOTHING;

  -- Add comments to posts
  IF v_post_2 IS NOT NULL THEN
    -- Alice comments on Jack's analysis
    INSERT INTO public.post_comments (post_id, user_id, content, created_at)
    VALUES (
      v_post_2,
      v_alice,
      'Great breakdown Jack! I had R2 as a 10-10 though. Super close round.',
      NOW() - INTERVAL '5 days' + INTERVAL '2 hours'
    ) ON CONFLICT DO NOTHING;

    -- Bob comments
    INSERT INTO public.post_comments (post_id, user_id, content, created_at)
    VALUES (
      v_post_2,
      v_bob,
      'The global scorecard feature is amazing for seeing consensus. 77% agreement is actually pretty high for a 5 rounder.',
      NOW() - INTERVAL '5 days' + INTERVAL '4 hours'
    ) ON CONFLICT DO NOTHING;

    -- Jack replies
    INSERT INTO public.post_comments (post_id, user_id, content, created_at)
    VALUES (
      v_post_2,
      v_jack,
      '@alice_ufc Fair point on R2! It was definitely the swing round. The 54% consensus shows how split the community was.',
      NOW() - INTERVAL '5 days' + INTERVAL '6 hours'
    ) ON CONFLICT DO NOTHING;
  END IF;

  IF v_post_3 IS NOT NULL THEN
    -- Iris disagrees with Frank
    INSERT INTO public.post_comments (post_id, user_id, content, created_at)
    VALUES (
      v_post_3,
      v_iris,
      'Counterpoint: Poirier is one of the best in the world. Saint-Denis was massively overhyped. This wasn''t power vs cardio, it was levels.',
      NOW() - INTERVAL '4 days' + INTERVAL '3 hours'
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Add some likes to posts
  IF v_post_2 IS NOT NULL THEN
    INSERT INTO public.post_likes (post_id, user_id, created_at)
    VALUES
      (v_post_2, v_alice, NOW() - INTERVAL '5 days' + INTERVAL '1 hour'),
      (v_post_2, v_bob, NOW() - INTERVAL '5 days' + INTERVAL '2 hours'),
      (v_post_2, v_iris, NOW() - INTERVAL '4 days'),
      (v_post_2, v_frank, NOW() - INTERVAL '4 days' + INTERVAL '5 hours')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_post_1 IS NOT NULL THEN
    INSERT INTO public.post_likes (post_id, user_id, created_at)
    VALUES
      (v_post_1, v_jack, NOW() - INTERVAL '5 days'),
      (v_post_1, v_bob, NOW() - INTERVAL '5 days' + INTERVAL '3 hours')
    ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE 'Created sample posts and comments';
END $$;

-- =============================================================================
-- Summary
-- =============================================================================
-- This migration adds:
-- 1. Display names, bios, and avatars for all 13 test users
-- 2. 22 friendship connections (11 mutual friendships + 2 pending)
-- 3. 7 activity records for discover/following feeds
-- 4. 3 discussion posts with comments and likes
--
-- The app should now feel "lived in" with:
-- - Rich user profiles with unique personalities
-- - Active social graph for friend leaderboards
-- - Content in discover and following feeds
-- - Forum discussions with engagement
-- =============================================================================
