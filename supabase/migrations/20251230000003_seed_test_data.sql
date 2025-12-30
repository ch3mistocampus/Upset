-- Seed test data for UFC Picks Tracker
-- Creates test events, bouts, and results for testing
-- NOTE: Test user profiles must be created through normal auth signup flow

DO $$
DECLARE
  event1_id UUID := 'e0000000-0000-0000-0000-000000000001'; -- UFC 300 (upcoming)
  event2_id UUID := 'e0000000-0000-0000-0000-000000000002'; -- UFC 299 (completed)
  event3_id UUID := 'e0000000-0000-0000-0000-000000000003'; -- UFC Fight Night (future)
  bout1_id UUID := 'b0000000-0000-0000-0000-000000000001';
  bout2_id UUID := 'b0000000-0000-0000-0000-000000000002';
  bout3_id UUID := 'b0000000-0000-0000-0000-000000000003';
  bout4_id UUID := 'b0000000-0000-0000-0000-000000000004';
  bout5_id UUID := 'b0000000-0000-0000-0000-000000000005';
  bout6_id UUID := 'b0000000-0000-0000-0000-000000000006';
  bout7_id UUID := 'b0000000-0000-0000-0000-000000000007';
  bout8_id UUID := 'b0000000-0000-0000-0000-000000000008';
BEGIN
  -- ============================================================================
  -- TEST EVENTS
  -- ============================================================================
  INSERT INTO public.events (id, ufcstats_event_id, name, event_date, location, status, created_at)
  VALUES
    -- UFC 300: Upcoming event (3 days from now)
    (event1_id, 'test-event-ufc-300', 'UFC 300: Pereira vs. Hill', NOW() + INTERVAL '3 days', 'T-Mobile Arena, Las Vegas, Nevada, USA', 'upcoming', NOW()),
    -- UFC 299: Completed event (7 days ago)
    (event2_id, 'test-event-ufc-299', 'UFC 299: O''Malley vs. Vera 2', NOW() - INTERVAL '7 days', 'Kaseya Center, Miami, Florida, USA', 'completed', NOW()),
    -- UFC Fight Night: Future event (14 days from now)
    (event3_id, 'test-event-fight-night', 'UFC Fight Night: Cannonier vs. Borralho', NOW() + INTERVAL '14 days', 'UFC APEX, Las Vegas, Nevada, USA', 'upcoming', NOW())
  ON CONFLICT (ufcstats_event_id) DO NOTHING;

  -- ============================================================================
  -- TEST BOUTS FOR UFC 300 (Upcoming - No Results)
  -- ============================================================================
  INSERT INTO public.bouts (id, ufcstats_fight_id, event_id, order_index, weight_class, red_fighter_ufcstats_id, blue_fighter_ufcstats_id, red_name, blue_name, status, created_at)
  VALUES
    (bout1_id, 'test-fight-ufc300-1', event1_id, 1, 'Light Heavyweight', 'test-fighter-pereira', 'test-fighter-hill', 'Alex Pereira', 'Jamahal Hill', 'scheduled', NOW()),
    (bout2_id, 'test-fight-ufc300-2', event1_id, 2, 'Lightweight', 'test-fighter-gaethje', 'test-fighter-holloway', 'Justin Gaethje', 'Max Holloway', 'scheduled', NOW()),
    (bout3_id, 'test-fight-ufc300-3', event1_id, 3, 'Welterweight', 'test-fighter-burns', 'test-fighter-garry', 'Gilbert Burns', 'Ian Machado Garry', 'scheduled', NOW()),
    (bout4_id, 'test-fight-ufc300-4', event1_id, 4, 'Bantamweight', 'test-fighter-song', 'test-fighter-simon', 'Song Yadong', 'Ricky Simon', 'scheduled', NOW()),
    (bout5_id, 'test-fight-ufc300-5', event1_id, 5, 'Flyweight', 'test-fighter-figueiredo', 'test-fighter-garbrandt', 'Deiveson Figueiredo', 'Cody Garbrandt', 'scheduled', NOW())
  ON CONFLICT (ufcstats_fight_id) DO NOTHING;

  -- ============================================================================
  -- TEST BOUTS FOR UFC 299 (Completed - With Results)
  -- ============================================================================
  INSERT INTO public.bouts (id, ufcstats_fight_id, event_id, order_index, weight_class, red_fighter_ufcstats_id, blue_fighter_ufcstats_id, red_name, blue_name, status, created_at)
  VALUES
    (bout6_id, 'test-fight-ufc299-1', event2_id, 1, 'Bantamweight', 'test-fighter-omalley', 'test-fighter-vera', 'Sean O''Malley', 'Marlon Vera', 'completed', NOW()),
    (bout7_id, 'test-fight-ufc299-2', event2_id, 2, 'Lightweight', 'test-fighter-poirier', 'test-fighter-saint-denis', 'Dustin Poirier', 'Benoit Saint-Denis', 'completed', NOW()),
    (bout8_id, 'test-fight-ufc299-3', event2_id, 3, 'Welterweight', 'test-fighter-holland', 'test-fighter-page', 'Kevin Holland', 'Michael Page', 'completed', NOW())
  ON CONFLICT (ufcstats_fight_id) DO NOTHING;

  -- ============================================================================
  -- RESULTS FOR UFC 299 BOUTS
  -- ============================================================================
  INSERT INTO public.results (bout_id, winner_corner, method, round, time, synced_at)
  VALUES
    -- O'Malley wins by Decision
    (bout6_id, 'red', 'Decision - Unanimous', 5, '5:00', NOW()),
    -- Poirier wins by KO
    (bout7_id, 'red', 'KO/TKO - Punches', 2, '2:32', NOW()),
    -- Page wins by Submission
    (bout8_id, 'blue', 'Submission - D''Arce Choke', 1, '3:45', NOW())
  ON CONFLICT (bout_id) DO NOTHING;

END $$;

-- ============================================================================
-- TEST DATA SUMMARY
-- ============================================================================
-- Events Created:
--   1. UFC 300 (upcoming in 3 days) - 5 scheduled bouts
--   2. UFC 299 (completed 7 days ago) - 3 bouts with results
--   3. UFC Fight Night (upcoming in 14 days) - 0 bouts
--
-- To test the app:
--   1. Sign up through the app to create a test user account
--   2. Navigate to Pick screen - you should see UFC 300 with 5 fights
--   3. Make picks by selecting fighters
--   4. Check Stats screen to see accuracy (will be 0 until events complete)
--
-- To create test picks manually (after signup):
-- INSERT INTO public.picks (user_id, event_id, bout_id, picked_corner, status)
-- VALUES ('<your-user-id>', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'red', 'active');
