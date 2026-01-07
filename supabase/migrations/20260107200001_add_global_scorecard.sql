-- =============================================================================
-- Global Scorecard Feature - Database Schema
-- =============================================================================
-- This migration creates the tables and functions for round-by-round scoring
-- during live UFC fights, allowing users to submit scores and see aggregated
-- global scorecards.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ENUMS
-- -----------------------------------------------------------------------------

-- Round phase enum for state machine
CREATE TYPE public.round_phase AS ENUM (
  'PRE_FIGHT',      -- Fight hasn't started
  'ROUND_LIVE',     -- Round is currently in progress
  'ROUND_BREAK',    -- Between rounds, scoring is OPEN
  'ROUND_CLOSED',   -- Round scoring period ended
  'FIGHT_ENDED'     -- Fight is over (decision, finish, etc.)
);

-- Source of round state updates
CREATE TYPE public.round_state_source AS ENUM (
  'MANUAL',         -- Admin-controlled (MVP)
  'PROVIDER',       -- External data provider
  'HYBRID'          -- Provider with manual override
);

-- -----------------------------------------------------------------------------
-- 2. ROUND STATE TABLE
-- -----------------------------------------------------------------------------
-- Server-authoritative state for each fight's scoring window
-- One row per fight (bout_id is unique)

CREATE TABLE public.round_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bout_id UUID NOT NULL REFERENCES public.bouts(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,

  -- Current state
  current_round INT NOT NULL DEFAULT 0,
  phase public.round_phase NOT NULL DEFAULT 'PRE_FIGHT',

  -- Timing
  round_started_at TIMESTAMPTZ,
  round_ends_at TIMESTAMPTZ,

  -- Configuration
  scheduled_rounds INT NOT NULL DEFAULT 3, -- 3 for regular, 5 for main/title
  round_duration_seconds INT NOT NULL DEFAULT 300, -- 5 minutes
  scoring_grace_seconds INT NOT NULL DEFAULT 90, -- 90 seconds after round to submit

  -- Provider tracking
  source public.round_state_source NOT NULL DEFAULT 'MANUAL',
  provider_fight_id TEXT, -- External provider's fight ID for future integration

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_bout_round_state UNIQUE(bout_id)
);

-- Index for quick lookups by event
CREATE INDEX idx_round_state_event ON public.round_state(event_id);
CREATE INDEX idx_round_state_phase ON public.round_state(phase);

-- -----------------------------------------------------------------------------
-- 3. ROUND SCORES TABLE
-- -----------------------------------------------------------------------------
-- Individual user submissions for each round

CREATE TABLE public.round_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL, -- Client-generated for idempotency

  bout_id UUID NOT NULL REFERENCES public.bouts(id) ON DELETE CASCADE,
  round_number INT NOT NULL CHECK (round_number >= 1 AND round_number <= 5),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Score values (10-point must system)
  -- score_red: points given to red corner (typically 10)
  -- score_blue: points given to blue corner (9, 8, 7, or 10)
  score_red INT NOT NULL CHECK (score_red >= 7 AND score_red <= 10),
  score_blue INT NOT NULL CHECK (score_blue >= 7 AND score_blue <= 10),

  -- Metadata
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_user_round_score UNIQUE(bout_id, round_number, user_id),
  CONSTRAINT unique_submission_id UNIQUE(submission_id),

  -- At least one fighter must have 10 points (standard scoring)
  CONSTRAINT valid_score_pair CHECK (score_red = 10 OR score_blue = 10)
);

-- Indexes for common queries
CREATE INDEX idx_round_scores_bout ON public.round_scores(bout_id);
CREATE INDEX idx_round_scores_bout_round ON public.round_scores(bout_id, round_number);
CREATE INDEX idx_round_scores_user ON public.round_scores(user_id);

-- -----------------------------------------------------------------------------
-- 4. ROUND AGGREGATES TABLE
-- -----------------------------------------------------------------------------
-- Pre-computed aggregates for fast scorecard display

CREATE TABLE public.round_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bout_id UUID NOT NULL REFERENCES public.bouts(id) ON DELETE CASCADE,
  round_number INT NOT NULL CHECK (round_number >= 1 AND round_number <= 5),

  -- Submission count
  submission_count INT NOT NULL DEFAULT 0,

  -- Bucket counts (stored as JSON for flexibility)
  -- Format: { "red_10_9": 45, "red_10_8": 3, "blue_10_9": 52, "blue_10_8": 0, "even_10_10": 0 }
  buckets JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Computed stats
  mean_red NUMERIC(4,2),
  mean_blue NUMERIC(4,2),

  -- Consensus index: 0 = split, 1 = unanimous
  -- Calculated as: (max_bucket_count / total_count)
  consensus_index NUMERIC(3,2),

  -- Metadata
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_bout_round_aggregate UNIQUE(bout_id, round_number)
);

-- Index for scorecard retrieval
CREATE INDEX idx_round_aggregates_bout ON public.round_aggregates(bout_id);

-- -----------------------------------------------------------------------------
-- 5. ADMIN STATE LOG TABLE
-- -----------------------------------------------------------------------------
-- Audit trail for admin round state changes

CREATE TABLE public.round_state_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bout_id UUID NOT NULL REFERENCES public.bouts(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),

  action TEXT NOT NULL, -- START_ROUND, END_ROUND, START_BREAK, END_FIGHT
  round_number INT,
  previous_phase public.round_phase,
  new_phase public.round_phase NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_round_state_log_bout ON public.round_state_log(bout_id);
CREATE INDEX idx_round_state_log_admin ON public.round_state_log(admin_user_id);

-- -----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE public.round_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_state_log ENABLE ROW LEVEL SECURITY;

-- Round State: Anyone can read, only admins can modify
CREATE POLICY "Round state viewable by everyone"
  ON public.round_state FOR SELECT
  USING (true);

CREATE POLICY "Round state modifiable by admins only"
  ON public.round_state FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Round Scores: Users can view all scores, insert/update their own
CREATE POLICY "Round scores viewable by everyone"
  ON public.round_scores FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own scores"
  ON public.round_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scores"
  ON public.round_scores FOR UPDATE
  USING (auth.uid() = user_id);

-- Round Aggregates: Anyone can read
CREATE POLICY "Round aggregates viewable by everyone"
  ON public.round_aggregates FOR SELECT
  USING (true);

-- Round State Log: Only admins can view
CREATE POLICY "Round state log viewable by admins only"
  ON public.round_state_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
    )
  );

-- -----------------------------------------------------------------------------
-- 7. HELPER FUNCTIONS
-- -----------------------------------------------------------------------------

-- Check if scoring is currently open for a fight/round
CREATE OR REPLACE FUNCTION public.is_scoring_open(
  p_bout_id UUID,
  p_round_number INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state round_state%ROWTYPE;
  v_grace_end TIMESTAMPTZ;
BEGIN
  -- Get current round state
  SELECT * INTO v_state
  FROM round_state
  WHERE bout_id = p_bout_id;

  -- No state record = scoring not available
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Must be in ROUND_BREAK phase
  IF v_state.phase != 'ROUND_BREAK' THEN
    RETURN false;
  END IF;

  -- Must be scoring for the current round
  IF v_state.current_round != p_round_number THEN
    RETURN false;
  END IF;

  -- Check if within grace period
  IF v_state.round_ends_at IS NOT NULL THEN
    v_grace_end := v_state.round_ends_at + (v_state.scoring_grace_seconds || ' seconds')::interval;
    IF now() > v_grace_end THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;

-- Get score bucket key from score pair
CREATE OR REPLACE FUNCTION public.get_score_bucket(
  p_score_red INT,
  p_score_blue INT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_score_red = p_score_blue THEN
    RETURN 'even_' || p_score_red || '_' || p_score_blue;
  ELSIF p_score_red > p_score_blue THEN
    RETURN 'red_' || p_score_red || '_' || p_score_blue;
  ELSE
    RETURN 'blue_' || p_score_blue || '_' || p_score_red;
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 8. UPDATED_AT TRIGGER
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_round_state_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_round_state_updated_at
  BEFORE UPDATE ON public.round_state
  FOR EACH ROW
  EXECUTE FUNCTION public.update_round_state_updated_at();

CREATE TRIGGER trigger_round_aggregates_updated_at
  BEFORE UPDATE ON public.round_aggregates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_round_state_updated_at();

-- -----------------------------------------------------------------------------
-- 9. COMMENTS
-- -----------------------------------------------------------------------------

COMMENT ON TABLE public.round_state IS 'Server-authoritative round state for live fight scoring';
COMMENT ON TABLE public.round_scores IS 'Individual user score submissions per round';
COMMENT ON TABLE public.round_aggregates IS 'Pre-computed aggregate statistics per round';
COMMENT ON TABLE public.round_state_log IS 'Audit trail for admin round state changes';

COMMENT ON COLUMN public.round_state.phase IS 'Current phase: PRE_FIGHT, ROUND_LIVE, ROUND_BREAK (scoring open), ROUND_CLOSED, FIGHT_ENDED';
COMMENT ON COLUMN public.round_state.scoring_grace_seconds IS 'Seconds after round ends that scoring remains open';
COMMENT ON COLUMN public.round_scores.submission_id IS 'Client-generated UUID for idempotent retries';
COMMENT ON COLUMN public.round_aggregates.buckets IS 'JSON object with counts per score bucket (e.g., red_10_9, blue_10_8)';
COMMENT ON COLUMN public.round_aggregates.consensus_index IS 'Score 0-1 indicating how unanimous the scores are (1 = all same)';
