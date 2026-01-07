-- ============================================================================
-- Add ESPN Fighter ID for MMA API integration
-- ============================================================================
-- This allows us to use both UFCStats (scraping) and ESPN/MMA API data sources

-- Add ESPN fighter ID column
ALTER TABLE ufc_fighters
ADD COLUMN IF NOT EXISTS espn_fighter_id TEXT;

-- Create index for ESPN ID lookups
CREATE INDEX IF NOT EXISTS idx_ufc_fighters_espn_id
ON ufc_fighters(espn_fighter_id)
WHERE espn_fighter_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN ufc_fighters.espn_fighter_id IS 'ESPN fighter ID for MMA API integration';

-- ============================================================================
-- Add ESPN Event ID to events table
-- ============================================================================
ALTER TABLE events
ADD COLUMN IF NOT EXISTS espn_event_id TEXT;

CREATE INDEX IF NOT EXISTS idx_events_espn_id
ON events(espn_event_id)
WHERE espn_event_id IS NOT NULL;

COMMENT ON COLUMN events.espn_event_id IS 'ESPN event ID for MMA API integration';

-- ============================================================================
-- Function to find fighter by name (for ID mapping)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.find_fighter_by_name(p_name TEXT)
RETURNS TABLE (
  fighter_id TEXT,
  full_name TEXT,
  espn_fighter_id TEXT,
  weight_lbs INTEGER,
  record_wins INTEGER,
  record_losses INTEGER
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
    f.espn_fighter_id,
    f.weight_lbs,
    f.record_wins,
    f.record_losses
  FROM ufc_fighters f
  WHERE
    -- Exact match
    LOWER(f.full_name) = LOWER(p_name)
    -- Or close match (handle "Jon Jones" vs "Jonathan Jones")
    OR LOWER(f.full_name) ILIKE '%' || LOWER(p_name) || '%'
    OR LOWER(p_name) ILIKE '%' || LOWER(f.full_name) || '%'
  ORDER BY
    -- Prefer exact matches
    CASE WHEN LOWER(f.full_name) = LOWER(p_name) THEN 0 ELSE 1 END,
    -- Then by activity (more fights = more likely correct)
    (f.record_wins + f.record_losses) DESC
  LIMIT 5;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_fighter_by_name(TEXT) TO authenticated, anon;

-- ============================================================================
-- Function to update ESPN fighter ID
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_espn_fighter_id(
  p_fighter_id TEXT,
  p_espn_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ufc_fighters
  SET espn_fighter_id = p_espn_id,
      updated_at = NOW()
  WHERE fighter_id = p_fighter_id;

  RETURN FOUND;
END;
$$;

-- Only allow service role to update ESPN IDs
GRANT EXECUTE ON FUNCTION public.set_espn_fighter_id(TEXT, TEXT) TO service_role;
