-- UFC Picks Tracker - Initial Schema
-- Tables: profiles, events, bouts, results, picks, user_stats

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'User profiles with unique usernames';
COMMENT ON COLUMN public.profiles.username IS 'Unique username handle, 3-30 characters';

-- ============================================================================
-- EVENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ufcstats_event_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'completed')),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.events IS 'UFC events synced from UFCStats';
COMMENT ON COLUMN public.events.ufcstats_event_id IS 'Unique event ID from UFCStats URL';
COMMENT ON COLUMN public.events.status IS 'Event status: upcoming, in_progress, completed';
COMMENT ON COLUMN public.events.event_date IS 'Event start time in UTC';

CREATE INDEX idx_events_status_date ON public.events(status, event_date);
CREATE INDEX idx_events_date ON public.events(event_date DESC);

-- ============================================================================
-- BOUTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ufcstats_fight_id TEXT UNIQUE NOT NULL,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  weight_class TEXT,
  red_fighter_ufcstats_id TEXT NOT NULL,
  blue_fighter_ufcstats_id TEXT NOT NULL,
  red_name TEXT NOT NULL,
  blue_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'canceled', 'replaced')),
  card_snapshot INT NOT NULL DEFAULT 1,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_event_fight_order UNIQUE(event_id, order_index)
);

COMMENT ON TABLE public.bouts IS 'Individual fights/bouts within events';
COMMENT ON COLUMN public.bouts.order_index IS 'Fight order (0 = main event)';
COMMENT ON COLUMN public.bouts.card_snapshot IS 'Increments on card changes, helps track major restructures';
COMMENT ON COLUMN public.bouts.status IS 'scheduled, completed, canceled, replaced';

CREATE INDEX idx_bouts_event_order ON public.bouts(event_id, order_index);
CREATE INDEX idx_bouts_ufcstats_id ON public.bouts(ufcstats_fight_id);
CREATE INDEX idx_bouts_status ON public.bouts(status);

-- ============================================================================
-- RESULTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.results (
  bout_id UUID PRIMARY KEY REFERENCES public.bouts(id) ON DELETE CASCADE,
  winner_corner TEXT CHECK (winner_corner IN ('red', 'blue', 'draw', 'nc')),
  method TEXT,
  round INT,
  time TEXT,
  details TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.results IS 'Fight results (one per bout)';
COMMENT ON COLUMN public.results.winner_corner IS 'red, blue, draw, or nc (no contest)';
COMMENT ON COLUMN public.results.method IS 'Method of victory (KO/TKO, Submission, Decision, etc.)';

-- ============================================================================
-- PICKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  bout_id UUID NOT NULL REFERENCES public.bouts(id) ON DELETE CASCADE,
  picked_corner TEXT NOT NULL CHECK (picked_corner IN ('red', 'blue')),
  picked_method TEXT,
  picked_round INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'graded', 'voided')),
  score INT CHECK (score IN (0, 1)),
  CONSTRAINT unique_user_bout_pick UNIQUE(user_id, bout_id)
);

COMMENT ON TABLE public.picks IS 'User predictions for bouts';
COMMENT ON COLUMN public.picks.picked_corner IS 'red or blue (winner pick)';
COMMENT ON COLUMN public.picks.picked_method IS 'Method prediction (MVP: not scored)';
COMMENT ON COLUMN public.picks.picked_round IS 'Round prediction (MVP: not scored)';
COMMENT ON COLUMN public.picks.locked_at IS 'When pick was locked (event start time)';
COMMENT ON COLUMN public.picks.status IS 'active, graded, voided';
COMMENT ON COLUMN public.picks.score IS 'Points awarded: 1 (correct), 0 (incorrect), null (voided)';

CREATE INDEX idx_picks_user_event ON public.picks(user_id, event_id);
CREATE INDEX idx_picks_bout ON public.picks(bout_id);
CREATE INDEX idx_picks_status ON public.picks(status);
CREATE INDEX idx_picks_user_graded ON public.picks(user_id, status) WHERE status = 'graded';

-- ============================================================================
-- USER_STATS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_picks INT NOT NULL DEFAULT 0,
  correct_winner INT NOT NULL DEFAULT 0,
  accuracy_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  current_streak INT NOT NULL DEFAULT 0,
  best_streak INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_stats IS 'Denormalized user statistics for fast reads';
COMMENT ON COLUMN public.user_stats.accuracy_pct IS 'Percentage of correct winner picks';
COMMENT ON COLUMN public.user_stats.current_streak IS 'Current streak of correct picks';
COMMENT ON COLUMN public.user_stats.best_streak IS 'Best streak ever achieved';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

/**
 * Recalculate user stats from picks table
 * Called after grading picks to keep stats in sync
 */
CREATE OR REPLACE FUNCTION recalculate_user_stats(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
  total INT;
  correct INT;
  accuracy NUMERIC;
  current_streak_val INT;
  best_streak_val INT;
BEGIN
  -- Count total graded picks (exclude voided)
  SELECT COUNT(*), COALESCE(SUM(score), 0)
  INTO total, correct
  FROM public.picks
  WHERE user_id = target_user_id AND status = 'graded';

  -- Calculate accuracy
  IF total > 0 THEN
    accuracy := ROUND((correct::NUMERIC / total::NUMERIC) * 100, 2);
  ELSE
    accuracy := 0;
  END IF;

  -- Calculate current streak
  -- Find streak of consecutive correct picks from most recent
  WITH ordered_picks AS (
    SELECT score, created_at
    FROM public.picks
    WHERE user_id = target_user_id AND status = 'graded'
    ORDER BY created_at DESC
  ),
  streak_calc AS (
    SELECT score,
           ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn,
           CASE WHEN score = 1 THEN 1 ELSE 0 END as is_correct
    FROM ordered_picks
  )
  SELECT COALESCE(SUM(is_correct), 0)
  INTO current_streak_val
  FROM streak_calc
  WHERE rn <= (
    SELECT COALESCE(MIN(rn), 0)
    FROM streak_calc
    WHERE is_correct = 0
  );

  -- If no incorrect picks found, count all correct picks
  IF current_streak_val = 0 AND correct > 0 THEN
    SELECT COUNT(*) INTO current_streak_val
    FROM public.picks
    WHERE user_id = target_user_id AND status = 'graded' AND score = 1;
  END IF;

  -- Calculate best streak (longest sequence of correct picks)
  WITH ordered_picks AS (
    SELECT score, created_at,
           SUM(CASE WHEN score = 0 THEN 1 ELSE 0 END) OVER (ORDER BY created_at) as group_id
    FROM public.picks
    WHERE user_id = target_user_id AND status = 'graded'
  ),
  streaks AS (
    SELECT group_id, SUM(score) as streak_length
    FROM ordered_picks
    GROUP BY group_id
  )
  SELECT COALESCE(MAX(streak_length), 0)
  INTO best_streak_val
  FROM streaks;

  -- Upsert user_stats
  INSERT INTO public.user_stats (user_id, total_picks, correct_winner, accuracy_pct, current_streak, best_streak, updated_at)
  VALUES (target_user_id, total, correct, accuracy, current_streak_val, best_streak_val, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_picks = EXCLUDED.total_picks,
    correct_winner = EXCLUDED.correct_winner,
    accuracy_pct = EXCLUDED.accuracy_pct,
    current_streak = EXCLUDED.current_streak,
    best_streak = EXCLUDED.best_streak,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION recalculate_user_stats IS 'Recompute user stats from picks table to avoid drift';

/**
 * Check if picks are locked for an event
 * Returns TRUE if event has started (picks locked), FALSE otherwise
 */
CREATE OR REPLACE FUNCTION is_event_locked(target_event_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  event_start TIMESTAMPTZ;
BEGIN
  SELECT event_date INTO event_start
  FROM public.events
  WHERE id = target_event_id;

  IF event_start IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN now() >= event_start;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION is_event_locked IS 'Check if an event has started (picks are locked)';

/**
 * Validate pick is not locked before insert/update
 * Used in RLS policies to enforce lock time
 */
CREATE OR REPLACE FUNCTION validate_pick_not_locked()
RETURNS TRIGGER AS $$
DECLARE
  event_start TIMESTAMPTZ;
BEGIN
  -- Get event start time
  SELECT e.event_date INTO event_start
  FROM public.events e
  WHERE e.id = NEW.event_id;

  -- If event has started, reject the change
  IF now() >= event_start THEN
    RAISE EXCEPTION 'Picks are locked. Event has already started.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_pick_not_locked IS 'Trigger function to prevent pick modifications after event starts';

-- Create trigger for pick locking
CREATE TRIGGER enforce_pick_lock
  BEFORE INSERT OR UPDATE ON public.picks
  FOR EACH ROW
  EXECUTE FUNCTION validate_pick_not_locked();

COMMENT ON TRIGGER enforce_pick_lock ON public.picks IS 'Enforce pick locking at event start time';
