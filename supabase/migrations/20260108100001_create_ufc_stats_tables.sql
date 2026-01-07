-- ============================================================================
-- UFC Stats Reference Data Tables
-- ============================================================================
-- Source: Greco1899/scrape_ufc_stats GitHub repository
-- Purpose: Store historical UFC fighter data and fight history for Fighter Stats feature
-- ============================================================================

-- Source snapshots table for tracking imports
CREATE TABLE IF NOT EXISTS public.ufc_source_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'greco1899',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  git_ref TEXT,
  notes TEXT,
  row_counts JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS but allow public read access
ALTER TABLE public.ufc_source_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to snapshots"
  ON public.ufc_source_snapshots
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- ============================================================================
-- UFC Fighters Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ufc_fighters (
  fighter_id TEXT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT NOT NULL,
  nickname TEXT,
  dob DATE,
  height_inches INTEGER,
  weight_lbs INTEGER,
  reach_inches INTEGER,
  stance TEXT,
  record_wins INTEGER DEFAULT 0,
  record_losses INTEGER DEFAULT 0,
  record_draws INTEGER DEFAULT 0,
  record_nc INTEGER DEFAULT 0,
  -- Career stats (from tott data or computed)
  slpm NUMERIC(5,2),  -- Significant strikes landed per minute
  sapm NUMERIC(5,2),  -- Significant strikes absorbed per minute
  str_acc NUMERIC(5,2),  -- Strike accuracy %
  str_def NUMERIC(5,2),  -- Strike defense %
  td_avg NUMERIC(5,2),  -- Takedown average per 15 min
  td_acc NUMERIC(5,2),  -- Takedown accuracy %
  td_def NUMERIC(5,2),  -- Takedown defense %
  sub_avg NUMERIC(5,2),  -- Submission average per 15 min
  -- Source tracking
  ufcstats_url TEXT,
  source_snapshot_id TEXT NOT NULL REFERENCES public.ufc_source_snapshots(snapshot_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fighter lookups
CREATE INDEX IF NOT EXISTS idx_ufc_fighters_full_name ON public.ufc_fighters(full_name);
CREATE INDEX IF NOT EXISTS idx_ufc_fighters_last_name ON public.ufc_fighters(last_name);
CREATE INDEX IF NOT EXISTS idx_ufc_fighters_snapshot ON public.ufc_fighters(source_snapshot_id);

-- Enable RLS with public read
ALTER TABLE public.ufc_fighters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to fighters"
  ON public.ufc_fighters
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- ============================================================================
-- UFC Events Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ufc_events (
  event_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  event_date DATE,
  location TEXT,
  ufcstats_url TEXT,
  source_snapshot_id TEXT NOT NULL REFERENCES public.ufc_source_snapshots(snapshot_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for event lookups
CREATE INDEX IF NOT EXISTS idx_ufc_events_date ON public.ufc_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_ufc_events_name ON public.ufc_events(name);
CREATE INDEX IF NOT EXISTS idx_ufc_events_snapshot ON public.ufc_events(source_snapshot_id);

-- Enable RLS with public read
ALTER TABLE public.ufc_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to events"
  ON public.ufc_events
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- ============================================================================
-- UFC Fights Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ufc_fights (
  fight_id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES public.ufc_events(event_id),
  bout_order INTEGER,  -- Position on card
  weight_class TEXT,
  is_title_fight BOOLEAN DEFAULT FALSE,
  scheduled_rounds INTEGER,
  -- Participants (extracted from "Fighter A vs. Fighter B" format)
  red_fighter_id TEXT REFERENCES public.ufc_fighters(fighter_id),
  blue_fighter_id TEXT REFERENCES public.ufc_fighters(fighter_id),
  red_fighter_name TEXT,  -- Denormalized for display
  blue_fighter_name TEXT,
  -- Result
  winner_fighter_id TEXT REFERENCES public.ufc_fighters(fighter_id),
  loser_fighter_id TEXT REFERENCES public.ufc_fighters(fighter_id),
  result_method TEXT,  -- KO/TKO, Decision, Submission, etc.
  result_method_details TEXT,  -- Specific details
  result_round INTEGER,
  result_time_seconds INTEGER,  -- Time in seconds
  referee TEXT,
  -- Source tracking
  ufcstats_url TEXT,
  source_snapshot_id TEXT NOT NULL REFERENCES public.ufc_source_snapshots(snapshot_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fight queries
CREATE INDEX IF NOT EXISTS idx_ufc_fights_event ON public.ufc_fights(event_id);
CREATE INDEX IF NOT EXISTS idx_ufc_fights_red_fighter ON public.ufc_fights(red_fighter_id);
CREATE INDEX IF NOT EXISTS idx_ufc_fights_blue_fighter ON public.ufc_fights(blue_fighter_id);
CREATE INDEX IF NOT EXISTS idx_ufc_fights_winner ON public.ufc_fights(winner_fighter_id);
CREATE INDEX IF NOT EXISTS idx_ufc_fights_snapshot ON public.ufc_fights(source_snapshot_id);

-- Enable RLS with public read
ALTER TABLE public.ufc_fights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to fights"
  ON public.ufc_fights
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- ============================================================================
-- UFC Fight Stats Table (per-round statistics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ufc_fight_stats (
  id TEXT PRIMARY KEY,  -- Composite: fight_id + fighter_id + round/total
  fight_id TEXT NOT NULL REFERENCES public.ufc_fights(fight_id),
  fighter_id TEXT NOT NULL REFERENCES public.ufc_fighters(fighter_id),
  opponent_id TEXT REFERENCES public.ufc_fighters(fighter_id),
  round INTEGER,  -- NULL for totals
  is_total BOOLEAN NOT NULL DEFAULT FALSE,
  -- Strike stats
  knockdowns INTEGER DEFAULT 0,
  sig_str_landed INTEGER DEFAULT 0,
  sig_str_attempted INTEGER DEFAULT 0,
  total_str_landed INTEGER DEFAULT 0,
  total_str_attempted INTEGER DEFAULT 0,
  -- Grappling stats
  td_landed INTEGER DEFAULT 0,
  td_attempted INTEGER DEFAULT 0,
  sub_attempts INTEGER DEFAULT 0,
  reversals INTEGER DEFAULT 0,
  ctrl_time_seconds INTEGER DEFAULT 0,
  -- Strike breakdown by target
  head_landed INTEGER DEFAULT 0,
  head_attempted INTEGER DEFAULT 0,
  body_landed INTEGER DEFAULT 0,
  body_attempted INTEGER DEFAULT 0,
  leg_landed INTEGER DEFAULT 0,
  leg_attempted INTEGER DEFAULT 0,
  -- Strike breakdown by position
  distance_landed INTEGER DEFAULT 0,
  distance_attempted INTEGER DEFAULT 0,
  clinch_landed INTEGER DEFAULT 0,
  clinch_attempted INTEGER DEFAULT 0,
  ground_landed INTEGER DEFAULT 0,
  ground_attempted INTEGER DEFAULT 0,
  -- Source tracking
  source_snapshot_id TEXT NOT NULL REFERENCES public.ufc_source_snapshots(snapshot_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS uix_ufc_fight_stats_unique
  ON public.ufc_fight_stats(fight_id, fighter_id, is_total, COALESCE(round, -1));

-- Indexes for stats queries
CREATE INDEX IF NOT EXISTS idx_ufc_fight_stats_fighter ON public.ufc_fight_stats(fighter_id);
CREATE INDEX IF NOT EXISTS idx_ufc_fight_stats_fight ON public.ufc_fight_stats(fight_id);
CREATE INDEX IF NOT EXISTS idx_ufc_fight_stats_totals ON public.ufc_fight_stats(fighter_id, is_total) WHERE is_total = TRUE;

-- Enable RLS with public read
ALTER TABLE public.ufc_fight_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to fight stats"
  ON public.ufc_fight_stats
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- ============================================================================
-- Updated_at trigger function (reuse if exists)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.ufc_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS ufc_fighters_updated_at ON public.ufc_fighters;
CREATE TRIGGER ufc_fighters_updated_at
  BEFORE UPDATE ON public.ufc_fighters
  FOR EACH ROW EXECUTE FUNCTION public.ufc_set_updated_at();

DROP TRIGGER IF EXISTS ufc_events_updated_at ON public.ufc_events;
CREATE TRIGGER ufc_events_updated_at
  BEFORE UPDATE ON public.ufc_events
  FOR EACH ROW EXECUTE FUNCTION public.ufc_set_updated_at();

DROP TRIGGER IF EXISTS ufc_fights_updated_at ON public.ufc_fights;
CREATE TRIGGER ufc_fights_updated_at
  BEFORE UPDATE ON public.ufc_fights
  FOR EACH ROW EXECUTE FUNCTION public.ufc_set_updated_at();

-- ============================================================================
-- RPC Function: Get Fighter Profile with Fight History
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_fighter_profile_and_history(p_fighter_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fighter JSON;
  v_history JSON;
  v_result JSON;
BEGIN
  -- Get fighter profile
  SELECT json_build_object(
    'fighter_id', f.fighter_id,
    'first_name', f.first_name,
    'last_name', f.last_name,
    'full_name', f.full_name,
    'nickname', f.nickname,
    'dob', f.dob,
    'height_inches', f.height_inches,
    'weight_lbs', f.weight_lbs,
    'reach_inches', f.reach_inches,
    'stance', f.stance,
    'record', json_build_object(
      'wins', f.record_wins,
      'losses', f.record_losses,
      'draws', f.record_draws,
      'nc', f.record_nc
    ),
    'career_stats', json_build_object(
      'slpm', f.slpm,
      'sapm', f.sapm,
      'str_acc', f.str_acc,
      'str_def', f.str_def,
      'td_avg', f.td_avg,
      'td_acc', f.td_acc,
      'td_def', f.td_def,
      'sub_avg', f.sub_avg
    )
  )
  INTO v_fighter
  FROM public.ufc_fighters f
  WHERE f.fighter_id = p_fighter_id;

  IF v_fighter IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get fight history with opponent info and event details
  SELECT COALESCE(json_agg(history ORDER BY event_date DESC NULLS LAST), '[]'::json)
  INTO v_history
  FROM (
    SELECT
      fi.fight_id,
      fi.event_id,
      e.name AS event_name,
      e.event_date,
      fi.weight_class,
      fi.result_method,
      fi.result_method_details,
      fi.result_round,
      fi.result_time_seconds,
      fi.referee,
      -- Determine opponent
      CASE
        WHEN fi.red_fighter_id = p_fighter_id THEN fi.blue_fighter_id
        ELSE fi.red_fighter_id
      END AS opponent_id,
      CASE
        WHEN fi.red_fighter_id = p_fighter_id THEN fi.blue_fighter_name
        ELSE fi.red_fighter_name
      END AS opponent_name,
      -- Determine result from perspective of this fighter
      CASE
        WHEN fi.winner_fighter_id = p_fighter_id THEN 'Win'
        WHEN fi.loser_fighter_id = p_fighter_id THEN 'Loss'
        WHEN fi.result_method = 'Draw' THEN 'Draw'
        WHEN fi.result_method ILIKE '%no contest%' THEN 'NC'
        ELSE 'Unknown'
      END AS result,
      -- Which corner was this fighter
      CASE
        WHEN fi.red_fighter_id = p_fighter_id THEN 'red'
        ELSE 'blue'
      END AS corner,
      -- Get totals stats for this fighter in this fight
      (
        SELECT json_build_object(
          'knockdowns', fs.knockdowns,
          'sig_str_landed', fs.sig_str_landed,
          'sig_str_attempted', fs.sig_str_attempted,
          'total_str_landed', fs.total_str_landed,
          'total_str_attempted', fs.total_str_attempted,
          'td_landed', fs.td_landed,
          'td_attempted', fs.td_attempted,
          'sub_attempts', fs.sub_attempts,
          'reversals', fs.reversals,
          'ctrl_time_seconds', fs.ctrl_time_seconds
        )
        FROM public.ufc_fight_stats fs
        WHERE fs.fight_id = fi.fight_id
          AND fs.fighter_id = p_fighter_id
          AND fs.is_total = TRUE
        LIMIT 1
      ) AS totals
    FROM public.ufc_fights fi
    JOIN public.ufc_events e ON e.event_id = fi.event_id
    WHERE fi.red_fighter_id = p_fighter_id
       OR fi.blue_fighter_id = p_fighter_id
  ) history;

  -- Combine results
  v_result := json_build_object(
    'fighter', v_fighter,
    'history', v_history
  );

  RETURN v_result;
END;
$$;

-- ============================================================================
-- RPC Function: Search Fighters by Name
-- ============================================================================
CREATE OR REPLACE FUNCTION public.search_ufc_fighters(p_query TEXT, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  fighter_id TEXT,
  full_name TEXT,
  nickname TEXT,
  record TEXT,
  weight_lbs INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.fighter_id,
    f.full_name,
    f.nickname,
    CONCAT(f.record_wins, '-', f.record_losses,
           CASE WHEN f.record_draws > 0 THEN CONCAT('-', f.record_draws) ELSE '' END,
           CASE WHEN f.record_nc > 0 THEN CONCAT(' (', f.record_nc, ' NC)') ELSE '' END
    ) AS record,
    f.weight_lbs
  FROM public.ufc_fighters f
  WHERE f.full_name ILIKE '%' || p_query || '%'
     OR f.nickname ILIKE '%' || p_query || '%'
     OR f.first_name ILIKE '%' || p_query || '%'
     OR f.last_name ILIKE '%' || p_query || '%'
  ORDER BY
    -- Exact matches first
    CASE WHEN LOWER(f.full_name) = LOWER(p_query) THEN 0 ELSE 1 END,
    -- Then by total fights (popularity proxy)
    (f.record_wins + f.record_losses + f.record_draws) DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_fighter_profile_and_history(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.search_ufc_fighters(TEXT, INTEGER) TO authenticated, anon;

-- Add helpful comments
COMMENT ON TABLE public.ufc_fighters IS 'UFC fighter biographical and career statistics data from UFCStats.com';
COMMENT ON TABLE public.ufc_events IS 'UFC event information including date and location';
COMMENT ON TABLE public.ufc_fights IS 'Individual UFC fights with participants and results';
COMMENT ON TABLE public.ufc_fight_stats IS 'Per-round and total statistics for each fighter in each fight';
COMMENT ON TABLE public.ufc_source_snapshots IS 'Tracks data import runs for debugging and auditing';
