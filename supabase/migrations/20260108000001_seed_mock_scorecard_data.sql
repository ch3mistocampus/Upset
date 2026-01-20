-- =============================================================================
-- Seed Mock Scorecard Data for UFC 299: O'Malley vs. Vera 2
-- =============================================================================
-- This migration populates realistic scorecard data for testing the Global
-- Scorecard feature using our existing 13 test users.
--
-- UFC 299 Results:
-- 1. Sean O'Malley def. Marlon Vera - Decision (Unanimous) R5
-- 2. Dustin Poirier def. Benoit Saint-Denis - KO/TKO R2 2:32
-- 3. Kevin Holland vs. Michael Page - Page wins by Submission R1 3:45
-- =============================================================================

DO $$
DECLARE
  -- Event and bout IDs from seed data
  v_event_id UUID := 'e0000000-0000-0000-0000-000000000002'; -- UFC 299
  v_bout_1 UUID := 'b0000000-0000-0000-0000-000000000006';   -- O'Malley vs Vera
  v_bout_2 UUID := 'b0000000-0000-0000-0000-000000000007';   -- Poirier vs Saint-Denis
  v_bout_3 UUID := 'b0000000-0000-0000-0000-000000000008';   -- Holland vs Page

  -- User IDs (will be fetched from profiles)
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

  -- Working variables
  v_user_id UUID;
  v_round INT;
BEGIN
  -- ==========================================================================
  -- Get user IDs from profiles
  -- ==========================================================================
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

  -- Skip if users don't exist (seed-test-users hasn't run yet)
  IF v_alice IS NULL THEN
    RAISE NOTICE 'Test users not found. Run seed-test-users script first.';
    RETURN;
  END IF;

  RAISE NOTICE 'Creating mock scorecard data for UFC 299...';

  -- ==========================================================================
  -- 1. CREATE ROUND STATE RECORDS
  -- ==========================================================================

  -- O'Malley vs Vera - 5 round title fight, went to decision
  INSERT INTO public.round_state (bout_id, event_id, current_round, phase, scheduled_rounds, source)
  VALUES (v_bout_1, v_event_id, 5, 'FIGHT_ENDED', 5, 'MANUAL')
  ON CONFLICT (bout_id) DO UPDATE SET phase = 'FIGHT_ENDED', current_round = 5;

  -- Poirier vs Saint-Denis - 3 round fight, finished in R2
  INSERT INTO public.round_state (bout_id, event_id, current_round, phase, scheduled_rounds, source)
  VALUES (v_bout_2, v_event_id, 2, 'FIGHT_ENDED', 3, 'MANUAL')
  ON CONFLICT (bout_id) DO UPDATE SET phase = 'FIGHT_ENDED', current_round = 2;

  -- Holland vs Page - 3 round fight, finished in R1
  INSERT INTO public.round_state (bout_id, event_id, current_round, phase, scheduled_rounds, source)
  VALUES (v_bout_3, v_event_id, 1, 'FIGHT_ENDED', 3, 'MANUAL')
  ON CONFLICT (bout_id) DO UPDATE SET phase = 'FIGHT_ENDED', current_round = 1;

  -- ==========================================================================
  -- 2. CREATE ROUND SCORES FOR BOUT 1: O'MALLEY vs VERA (5 rounds)
  -- ==========================================================================
  -- O'Malley won a clear decision. Most rounds went to O'Malley with a few
  -- competitive rounds.

  -- Round 1: O'Malley clearly won (most scored 10-9 O'Malley)
  -- Alice (favorite picker) - 10-9 Red
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 1, v_alice, 10, 9) ON CONFLICT DO NOTHING;
  -- Bob (underdog picker) - 10-9 Blue
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 1, v_bob, 9, 10) ON CONFLICT DO NOTHING;
  -- Charlie (balanced) - 10-9 Red
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 1, v_charlie, 10, 9) ON CONFLICT DO NOTHING;
  -- David (chalk) - 10-9 Red
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 1, v_david, 10, 9) ON CONFLICT DO NOTHING;
  -- Emma - 10-9 Red
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 1, v_emma, 10, 9) ON CONFLICT DO NOTHING;
  -- Frank - 10-9 Red
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 1, v_frank, 10, 9) ON CONFLICT DO NOTHING;
  -- Grace (underdog lean) - 9-10 Blue
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 1, v_grace, 9, 10) ON CONFLICT DO NOTHING;
  -- Henry - 10-9 Red
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 1, v_henry, 10, 9) ON CONFLICT DO NOTHING;
  -- Iris (contrarian) - 9-10 Blue
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 1, v_iris, 9, 10) ON CONFLICT DO NOTHING;
  -- Jack (analyst) - 10-9 Red
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 1, v_jack, 10, 9) ON CONFLICT DO NOTHING;
  -- Kate - 10-9 Red
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 1, v_kate, 10, 9) ON CONFLICT DO NOTHING;
  -- Leo - 10-9 Red
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 1, v_leo, 10, 9) ON CONFLICT DO NOTHING;
  -- Mia - 10-9 Red
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 1, v_mia, 10, 9) ON CONFLICT DO NOTHING;

  -- Round 2: Competitive round (more split)
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 2, v_alice, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 2, v_bob, 9, 10) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 2, v_charlie, 9, 10) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 2, v_david, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 2, v_emma, 9, 10) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 2, v_frank, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 2, v_grace, 9, 10) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 2, v_henry, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 2, v_iris, 9, 10) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 2, v_jack, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 2, v_kate, 9, 10) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 2, v_leo, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 2, v_mia, 10, 9) ON CONFLICT DO NOTHING;

  -- Round 3: O'Malley dominant (10-8 some scores)
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 3, v_alice, 10, 8) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 3, v_bob, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 3, v_charlie, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 3, v_david, 10, 8) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 3, v_emma, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 3, v_frank, 10, 8) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 3, v_grace, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 3, v_henry, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 3, v_iris, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 3, v_jack, 10, 8) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 3, v_kate, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 3, v_leo, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 3, v_mia, 10, 8) ON CONFLICT DO NOTHING;

  -- Round 4: Clear O'Malley round
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 4, v_alice, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 4, v_bob, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 4, v_charlie, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 4, v_david, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 4, v_emma, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 4, v_frank, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 4, v_grace, 9, 10) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 4, v_henry, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 4, v_iris, 9, 10) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 4, v_jack, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 4, v_kate, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 4, v_leo, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 4, v_mia, 10, 9) ON CONFLICT DO NOTHING;

  -- Round 5: Championship rounds - O'Malley cruises
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 5, v_alice, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 5, v_bob, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 5, v_charlie, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 5, v_david, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 5, v_emma, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 5, v_frank, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 5, v_grace, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 5, v_henry, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 5, v_iris, 9, 10) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 5, v_jack, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 5, v_kate, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 5, v_leo, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_1, 5, v_mia, 10, 9) ON CONFLICT DO NOTHING;

  -- ==========================================================================
  -- 3. CREATE ROUND SCORES FOR BOUT 2: POIRIER vs SAINT-DENIS (2 rounds)
  -- ==========================================================================
  -- Poirier won by KO in R2. R1 was competitive.

  -- Round 1: Competitive round
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_2, 1, v_alice, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_2, 1, v_bob, 9, 10) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_2, 1, v_charlie, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_2, 1, v_david, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_2, 1, v_emma, 9, 10) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_2, 1, v_frank, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_2, 1, v_grace, 9, 10) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_2, 1, v_henry, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_2, 1, v_iris, 9, 10) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_2, 1, v_jack, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_2, 1, v_kate, 10, 9) ON CONFLICT DO NOTHING;
  INSERT INTO public.round_scores (submission_id, bout_id, round_number, user_id, score_red, score_blue)
  VALUES (gen_random_uuid(), v_bout_2, 1, v_leo, 10, 9) ON CONFLICT DO NOTHING;

  -- No Round 2 scores needed - fight ended by KO

  -- ==========================================================================
  -- 4. CREATE ROUND SCORES FOR BOUT 3: HOLLAND vs PAGE (1 round)
  -- ==========================================================================
  -- Page won by submission in R1 - fight didn't complete a full round
  -- So no scorecard submissions for this bout

  -- ==========================================================================
  -- 5. CREATE ROUND AGGREGATES
  -- ==========================================================================

  -- Bout 1 Round 1: 10 Red, 3 Blue (77% Red consensus)
  INSERT INTO public.round_aggregates (bout_id, round_number, submission_count, buckets, mean_red, mean_blue, consensus_index)
  VALUES (
    v_bout_1, 1, 13,
    '{"red_10_9": 10, "blue_10_9": 3}'::jsonb,
    9.77, 9.23, 0.77
  ) ON CONFLICT (bout_id, round_number) DO UPDATE SET
    submission_count = EXCLUDED.submission_count,
    buckets = EXCLUDED.buckets,
    mean_red = EXCLUDED.mean_red,
    mean_blue = EXCLUDED.mean_blue,
    consensus_index = EXCLUDED.consensus_index;

  -- Bout 1 Round 2: 7 Red, 6 Blue (54% Red - very split)
  INSERT INTO public.round_aggregates (bout_id, round_number, submission_count, buckets, mean_red, mean_blue, consensus_index)
  VALUES (
    v_bout_1, 2, 13,
    '{"red_10_9": 7, "blue_10_9": 6}'::jsonb,
    9.54, 9.46, 0.54
  ) ON CONFLICT (bout_id, round_number) DO UPDATE SET
    submission_count = EXCLUDED.submission_count,
    buckets = EXCLUDED.buckets,
    mean_red = EXCLUDED.mean_red,
    mean_blue = EXCLUDED.mean_blue,
    consensus_index = EXCLUDED.consensus_index;

  -- Bout 1 Round 3: 8 Red 10-9, 5 Red 10-8 = 100% Red (dominant round)
  INSERT INTO public.round_aggregates (bout_id, round_number, submission_count, buckets, mean_red, mean_blue, consensus_index)
  VALUES (
    v_bout_1, 3, 13,
    '{"red_10_9": 8, "red_10_8": 5}'::jsonb,
    10.00, 8.62, 0.62
  ) ON CONFLICT (bout_id, round_number) DO UPDATE SET
    submission_count = EXCLUDED.submission_count,
    buckets = EXCLUDED.buckets,
    mean_red = EXCLUDED.mean_red,
    mean_blue = EXCLUDED.mean_blue,
    consensus_index = EXCLUDED.consensus_index;

  -- Bout 1 Round 4: 11 Red, 2 Blue (85% consensus)
  INSERT INTO public.round_aggregates (bout_id, round_number, submission_count, buckets, mean_red, mean_blue, consensus_index)
  VALUES (
    v_bout_1, 4, 13,
    '{"red_10_9": 11, "blue_10_9": 2}'::jsonb,
    9.85, 9.15, 0.85
  ) ON CONFLICT (bout_id, round_number) DO UPDATE SET
    submission_count = EXCLUDED.submission_count,
    buckets = EXCLUDED.buckets,
    mean_red = EXCLUDED.mean_red,
    mean_blue = EXCLUDED.mean_blue,
    consensus_index = EXCLUDED.consensus_index;

  -- Bout 1 Round 5: 12 Red, 1 Blue (92% consensus - clear round)
  INSERT INTO public.round_aggregates (bout_id, round_number, submission_count, buckets, mean_red, mean_blue, consensus_index)
  VALUES (
    v_bout_1, 5, 13,
    '{"red_10_9": 12, "blue_10_9": 1}'::jsonb,
    9.92, 9.08, 0.92
  ) ON CONFLICT (bout_id, round_number) DO UPDATE SET
    submission_count = EXCLUDED.submission_count,
    buckets = EXCLUDED.buckets,
    mean_red = EXCLUDED.mean_red,
    mean_blue = EXCLUDED.mean_blue,
    consensus_index = EXCLUDED.consensus_index;

  -- Bout 2 Round 1: 8 Red, 4 Blue (67% Red)
  INSERT INTO public.round_aggregates (bout_id, round_number, submission_count, buckets, mean_red, mean_blue, consensus_index)
  VALUES (
    v_bout_2, 1, 12,
    '{"red_10_9": 8, "blue_10_9": 4}'::jsonb,
    9.67, 9.33, 0.67
  ) ON CONFLICT (bout_id, round_number) DO UPDATE SET
    submission_count = EXCLUDED.submission_count,
    buckets = EXCLUDED.buckets,
    mean_red = EXCLUDED.mean_red,
    mean_blue = EXCLUDED.mean_blue,
    consensus_index = EXCLUDED.consensus_index;

  RAISE NOTICE 'Mock scorecard data created successfully!';
  RAISE NOTICE '- Bout 1 (O''Malley vs Vera): 5 rounds, 13 users, 65 total scores';
  RAISE NOTICE '- Bout 2 (Poirier vs Saint-Denis): 1 round scored, 12 users';
  RAISE NOTICE '- Bout 3 (Holland vs Page): No scores (R1 finish)';

END $$;

-- =============================================================================
-- Summary: Mock Scorecard Data for UFC 299
-- =============================================================================
-- This seed creates realistic scorecard data showing:
--
-- O'Malley vs Vera (Title Fight):
--   R1: 77% scored 10-9 O'Malley | Global: 49 - 46
--   R2: 54% scored 10-9 O'Malley (split round) | Global: 98 - 92
--   R3: 100% scored for O'Malley (dominant) | Global: 148 - 138
--   R4: 85% scored 10-9 O'Malley | Global: 197 - 184
--   R5: 92% scored 10-9 O'Malley | Global: 246 - 230
--
-- Poirier vs Saint-Denis:
--   R1: 67% scored 10-9 Poirier | Global: 10 - 9
--   R2: No scores (KO finish)
--
-- Holland vs Page:
--   No scores (R1 submission finish before round completed)
-- =============================================================================
