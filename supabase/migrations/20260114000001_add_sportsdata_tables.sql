-- SportsData.io MMA API Tables
-- Separate tables to store data from the SportsData.io API
-- This allows comparison with UFCStats data and hybrid data sourcing

-- ============================================================================
-- EVENTS (SportsData.io)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sportsdata_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sportsdata_event_id INTEGER UNIQUE NOT NULL,
  league_id INTEGER NOT NULL DEFAULT 1, -- UFC = 1
  name TEXT NOT NULL,
  short_name TEXT,
  season INTEGER NOT NULL,
  event_day DATE,
  event_datetime TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Scheduled', -- Scheduled, InProgress, Final, Postponed, Canceled
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Mapping to internal events
  internal_event_id UUID REFERENCES events(id) ON DELETE SET NULL,

  -- Metadata
  raw_data JSONB, -- Store full API response for reference
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_sportsdata_events_datetime ON sportsdata_events(event_datetime);
CREATE INDEX IF NOT EXISTS idx_sportsdata_events_status ON sportsdata_events(status);
CREATE INDEX IF NOT EXISTS idx_sportsdata_events_internal ON sportsdata_events(internal_event_id);

-- ============================================================================
-- FIGHTERS (SportsData.io)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sportsdata_fighters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sportsdata_fighter_id INTEGER UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT GENERATED ALWAYS AS (
    COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')
  ) STORED,
  nickname TEXT,
  weight_class TEXT,
  birth_date DATE,
  height_inches DECIMAL(5,2),
  weight_lbs DECIMAL(5,2),
  reach_inches DECIMAL(5,2),

  -- Record
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  no_contests INTEGER NOT NULL DEFAULT 0,

  -- Win breakdown
  technical_knockouts INTEGER NOT NULL DEFAULT 0,
  technical_knockout_losses INTEGER NOT NULL DEFAULT 0,
  submissions INTEGER NOT NULL DEFAULT 0,
  submission_losses INTEGER NOT NULL DEFAULT 0,

  -- Title fights
  title_wins INTEGER NOT NULL DEFAULT 0,
  title_losses INTEGER NOT NULL DEFAULT 0,
  title_draws INTEGER NOT NULL DEFAULT 0,

  -- Mapping to internal fighters
  internal_fighter_id TEXT, -- Maps to ufc_fighters.fighter_id
  ufcstats_fighter_id TEXT, -- For cross-reference

  -- Metadata
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sportsdata_fighters_name ON sportsdata_fighters(full_name);
CREATE INDEX IF NOT EXISTS idx_sportsdata_fighters_weight ON sportsdata_fighters(weight_class);
CREATE INDEX IF NOT EXISTS idx_sportsdata_fighters_internal ON sportsdata_fighters(internal_fighter_id);

-- ============================================================================
-- FIGHTS/BOUTS (SportsData.io)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sportsdata_fights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sportsdata_fight_id INTEGER UNIQUE NOT NULL,
  sportsdata_event_id INTEGER NOT NULL REFERENCES sportsdata_events(sportsdata_event_id),

  fight_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Scheduled',
  weight_class TEXT,
  card_segment TEXT, -- Main, Preliminary, Early Preliminary
  referee TEXT,
  scheduled_rounds INTEGER NOT NULL DEFAULT 3,

  -- Result
  result_clock_seconds INTEGER,
  result_round INTEGER,
  result_type TEXT, -- KO, TKO, Submission, Decision, etc.
  winner_sportsdata_id INTEGER,

  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Mapping
  internal_bout_id UUID, -- Maps to bouts.id

  -- Metadata
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sportsdata_fights_event ON sportsdata_fights(sportsdata_event_id);
CREATE INDEX IF NOT EXISTS idx_sportsdata_fights_internal ON sportsdata_fights(internal_bout_id);

-- ============================================================================
-- FIGHT FIGHTERS (participants in each fight)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sportsdata_fight_fighters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sportsdata_fight_id INTEGER NOT NULL REFERENCES sportsdata_fights(sportsdata_fight_id),
  sportsdata_fighter_id INTEGER NOT NULL,

  corner TEXT CHECK (corner IN ('red', 'blue')),

  -- Pre-fight record
  pre_fight_wins INTEGER,
  pre_fight_losses INTEGER,
  pre_fight_draws INTEGER,
  pre_fight_no_contests INTEGER,

  -- Result
  is_winner BOOLEAN NOT NULL DEFAULT false,

  -- Odds
  moneyline INTEGER, -- American odds format

  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(sportsdata_fight_id, sportsdata_fighter_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sportsdata_fight_fighters_fight ON sportsdata_fight_fighters(sportsdata_fight_id);
CREATE INDEX IF NOT EXISTS idx_sportsdata_fight_fighters_fighter ON sportsdata_fight_fighters(sportsdata_fighter_id);

-- ============================================================================
-- FIGHT STATS (SportsData.io)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sportsdata_fight_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sportsdata_fight_id INTEGER NOT NULL REFERENCES sportsdata_fights(sportsdata_fight_id),
  sportsdata_fighter_id INTEGER NOT NULL,

  -- Basic stats
  is_winner BOOLEAN NOT NULL DEFAULT false,
  fantasy_points DECIMAL(10,2),
  fantasy_points_draftkings DECIMAL(10,2),

  -- Striking
  knockdowns INTEGER NOT NULL DEFAULT 0,
  total_strikes_attempted INTEGER NOT NULL DEFAULT 0,
  total_strikes_landed INTEGER NOT NULL DEFAULT 0,
  sig_strikes_attempted INTEGER NOT NULL DEFAULT 0,
  sig_strikes_landed INTEGER NOT NULL DEFAULT 0,

  -- Grappling
  takedowns_attempted INTEGER NOT NULL DEFAULT 0,
  takedowns_landed INTEGER NOT NULL DEFAULT 0,
  takedowns_slams INTEGER NOT NULL DEFAULT 0,
  takedown_accuracy DECIMAL(5,2),
  advances INTEGER NOT NULL DEFAULT 0,
  reversals INTEGER NOT NULL DEFAULT 0,
  submissions INTEGER NOT NULL DEFAULT 0,
  slam_rate DECIMAL(5,2),
  time_in_control_seconds INTEGER NOT NULL DEFAULT 0,

  -- Round wins (for scoring)
  first_round_win BOOLEAN NOT NULL DEFAULT false,
  second_round_win BOOLEAN NOT NULL DEFAULT false,
  third_round_win BOOLEAN NOT NULL DEFAULT false,
  fourth_round_win BOOLEAN NOT NULL DEFAULT false,
  fifth_round_win BOOLEAN NOT NULL DEFAULT false,
  decision_win BOOLEAN NOT NULL DEFAULT false,

  -- Metadata
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(sportsdata_fight_id, sportsdata_fighter_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sportsdata_fight_stats_fight ON sportsdata_fight_stats(sportsdata_fight_id);
CREATE INDEX IF NOT EXISTS idx_sportsdata_fight_stats_fighter ON sportsdata_fight_stats(sportsdata_fighter_id);

-- ============================================================================
-- FIGHTER ID MAPPING TABLE
-- Links SportsData.io fighter IDs to UFCStats fighter IDs
-- ============================================================================

CREATE TABLE IF NOT EXISTS fighter_id_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sportsdata_fighter_id INTEGER UNIQUE NOT NULL,
  ufcstats_fighter_id TEXT, -- From ufc_fighters.fighter_id
  internal_fighter_id TEXT, -- Your internal ID if different

  -- Names for verification
  sportsdata_name TEXT NOT NULL,
  ufcstats_name TEXT,

  -- Matching confidence
  match_method TEXT NOT NULL DEFAULT 'manual', -- manual, exact_name, fuzzy_name, verified
  match_confidence DECIMAL(3,2), -- 0.00 to 1.00
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verified_by UUID,
  verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fighter_id_mappings_ufcstats ON fighter_id_mappings(ufcstats_fighter_id);
CREATE INDEX IF NOT EXISTS idx_fighter_id_mappings_verified ON fighter_id_mappings(is_verified);

-- ============================================================================
-- EVENT ID MAPPING TABLE
-- Links SportsData.io event IDs to internal event IDs
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_id_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sportsdata_event_id INTEGER UNIQUE NOT NULL,
  internal_event_id UUID REFERENCES events(id) ON DELETE SET NULL,

  -- Names for verification
  sportsdata_name TEXT NOT NULL,
  internal_name TEXT,
  event_date DATE,

  -- Matching
  match_method TEXT NOT NULL DEFAULT 'manual', -- manual, exact_name, date_match
  is_verified BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_id_mappings_internal ON event_id_mappings(internal_event_id);

-- ============================================================================
-- SYNC LOG
-- Track sync operations for auditing
-- ============================================================================

CREATE TABLE IF NOT EXISTS sportsdata_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL, -- events, fighters, fights, stats
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running', -- running, completed, failed

  -- Stats
  items_fetched INTEGER NOT NULL DEFAULT 0,
  items_created INTEGER NOT NULL DEFAULT 0,
  items_updated INTEGER NOT NULL DEFAULT 0,
  items_failed INTEGER NOT NULL DEFAULT 0,

  -- Error info
  error_message TEXT,
  error_details JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for recent syncs
CREATE INDEX IF NOT EXISTS idx_sportsdata_sync_log_started ON sportsdata_sync_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sportsdata_sync_log_type ON sportsdata_sync_log(sync_type);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE sportsdata_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sportsdata_fighters ENABLE ROW LEVEL SECURITY;
ALTER TABLE sportsdata_fights ENABLE ROW LEVEL SECURITY;
ALTER TABLE sportsdata_fight_fighters ENABLE ROW LEVEL SECURITY;
ALTER TABLE sportsdata_fight_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE fighter_id_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_id_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sportsdata_sync_log ENABLE ROW LEVEL SECURITY;

-- Public read access for event/fighter data
CREATE POLICY "sportsdata_events_select" ON sportsdata_events FOR SELECT USING (true);
CREATE POLICY "sportsdata_fighters_select" ON sportsdata_fighters FOR SELECT USING (true);
CREATE POLICY "sportsdata_fights_select" ON sportsdata_fights FOR SELECT USING (true);
CREATE POLICY "sportsdata_fight_fighters_select" ON sportsdata_fight_fighters FOR SELECT USING (true);
CREATE POLICY "sportsdata_fight_stats_select" ON sportsdata_fight_stats FOR SELECT USING (true);
CREATE POLICY "fighter_id_mappings_select" ON fighter_id_mappings FOR SELECT USING (true);
CREATE POLICY "event_id_mappings_select" ON event_id_mappings FOR SELECT USING (true);

-- Service role only for write operations (Edge Functions)
CREATE POLICY "sportsdata_events_service" ON sportsdata_events
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "sportsdata_fighters_service" ON sportsdata_fighters
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "sportsdata_fights_service" ON sportsdata_fights
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "sportsdata_fight_fighters_service" ON sportsdata_fight_fighters
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "sportsdata_fight_stats_service" ON sportsdata_fight_stats
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "fighter_id_mappings_service" ON fighter_id_mappings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "event_id_mappings_service" ON event_id_mappings
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "sportsdata_sync_log_service" ON sportsdata_sync_log
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get upcoming events from SportsData
CREATE OR REPLACE FUNCTION get_sportsdata_upcoming_events(limit_count INTEGER DEFAULT 10)
RETURNS SETOF sportsdata_events
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM sportsdata_events
  WHERE event_datetime > now()
    AND status = 'Scheduled'
    AND is_active = true
  ORDER BY event_datetime ASC
  LIMIT limit_count;
$$;

-- Get fighter by SportsData ID
CREATE OR REPLACE FUNCTION get_sportsdata_fighter(p_sportsdata_id INTEGER)
RETURNS sportsdata_fighters
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM sportsdata_fighters
  WHERE sportsdata_fighter_id = p_sportsdata_id
  LIMIT 1;
$$;

-- Get event with all fights
CREATE OR REPLACE FUNCTION get_sportsdata_event_with_fights(p_event_id INTEGER)
RETURNS TABLE (
  event JSONB,
  fights JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    to_jsonb(e.*) AS event,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'fight', to_jsonb(f.*),
          'fighters', (
            SELECT jsonb_agg(to_jsonb(ff.*))
            FROM sportsdata_fight_fighters ff
            WHERE ff.sportsdata_fight_id = f.sportsdata_fight_id
          )
        )
        ORDER BY f.fight_order
      ) FILTER (WHERE f.id IS NOT NULL),
      '[]'::jsonb
    ) AS fights
  FROM sportsdata_events e
  LEFT JOIN sportsdata_fights f ON f.sportsdata_event_id = e.sportsdata_event_id
  WHERE e.sportsdata_event_id = p_event_id
  GROUP BY e.id;
END;
$$;

-- Compare fighter records between sources
CREATE OR REPLACE FUNCTION compare_fighter_records(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  sportsdata_fighter_id INTEGER,
  sportsdata_name TEXT,
  sd_wins INTEGER,
  sd_losses INTEGER,
  sd_draws INTEGER,
  ufcstats_fighter_id TEXT,
  ufcstats_name TEXT,
  ufc_wins INTEGER,
  ufc_losses INTEGER,
  ufc_draws INTEGER,
  record_matches BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sf.sportsdata_fighter_id,
    sf.full_name AS sportsdata_name,
    sf.wins AS sd_wins,
    sf.losses AS sd_losses,
    sf.draws AS sd_draws,
    fm.ufcstats_fighter_id,
    uf.full_name AS ufcstats_name,
    uf.record_wins AS ufc_wins,
    uf.record_losses AS ufc_losses,
    uf.record_draws AS ufc_draws,
    (sf.wins = uf.record_wins AND sf.losses = uf.record_losses AND sf.draws = uf.record_draws) AS record_matches
  FROM sportsdata_fighters sf
  JOIN fighter_id_mappings fm ON fm.sportsdata_fighter_id = sf.sportsdata_fighter_id
  JOIN ufc_fighters uf ON uf.fighter_id = fm.ufcstats_fighter_id
  WHERE fm.is_verified = true
  ORDER BY sf.full_name
  LIMIT p_limit;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_sportsdata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sportsdata_events_updated
  BEFORE UPDATE ON sportsdata_events
  FOR EACH ROW EXECUTE FUNCTION update_sportsdata_updated_at();

CREATE TRIGGER trigger_sportsdata_fighters_updated
  BEFORE UPDATE ON sportsdata_fighters
  FOR EACH ROW EXECUTE FUNCTION update_sportsdata_updated_at();

CREATE TRIGGER trigger_sportsdata_fights_updated
  BEFORE UPDATE ON sportsdata_fights
  FOR EACH ROW EXECUTE FUNCTION update_sportsdata_updated_at();

CREATE TRIGGER trigger_sportsdata_fight_fighters_updated
  BEFORE UPDATE ON sportsdata_fight_fighters
  FOR EACH ROW EXECUTE FUNCTION update_sportsdata_updated_at();

CREATE TRIGGER trigger_sportsdata_fight_stats_updated
  BEFORE UPDATE ON sportsdata_fight_stats
  FOR EACH ROW EXECUTE FUNCTION update_sportsdata_updated_at();

CREATE TRIGGER trigger_fighter_id_mappings_updated
  BEFORE UPDATE ON fighter_id_mappings
  FOR EACH ROW EXECUTE FUNCTION update_sportsdata_updated_at();

CREATE TRIGGER trigger_event_id_mappings_updated
  BEFORE UPDATE ON event_id_mappings
  FOR EACH ROW EXECUTE FUNCTION update_sportsdata_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE sportsdata_events IS 'UFC events from SportsData.io API';
COMMENT ON TABLE sportsdata_fighters IS 'Fighter profiles from SportsData.io API';
COMMENT ON TABLE sportsdata_fights IS 'Individual fights/bouts from SportsData.io API';
COMMENT ON TABLE sportsdata_fight_fighters IS 'Fighter participation in fights from SportsData.io';
COMMENT ON TABLE sportsdata_fight_stats IS 'Fight statistics from SportsData.io API';
COMMENT ON TABLE fighter_id_mappings IS 'Mapping between SportsData.io and UFCStats fighter IDs';
COMMENT ON TABLE event_id_mappings IS 'Mapping between SportsData.io and internal event IDs';
COMMENT ON TABLE sportsdata_sync_log IS 'Log of sync operations with SportsData.io API';
