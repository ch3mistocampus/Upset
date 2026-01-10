-- ============================================================================
-- Add ESPN IDs for MMA API integration
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- 1. Add ESPN event ID to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS espn_event_id TEXT;

CREATE INDEX IF NOT EXISTS idx_events_espn_id
ON events(espn_event_id)
WHERE espn_event_id IS NOT NULL;

-- 2. Add ESPN fighter ID to ufc_fighters table
ALTER TABLE ufc_fighters
ADD COLUMN IF NOT EXISTS espn_fighter_id TEXT;

CREATE INDEX IF NOT EXISTS idx_ufc_fighters_espn_id
ON ufc_fighters(espn_fighter_id)
WHERE espn_fighter_id IS NOT NULL;

-- 3. Add ESPN IDs to bouts table
ALTER TABLE bouts
ADD COLUMN IF NOT EXISTS espn_fight_id TEXT;

ALTER TABLE bouts
ADD COLUMN IF NOT EXISTS espn_red_fighter_id TEXT;

ALTER TABLE bouts
ADD COLUMN IF NOT EXISTS espn_blue_fighter_id TEXT;

CREATE INDEX IF NOT EXISTS idx_bouts_espn_fight_id
ON bouts(espn_fight_id)
WHERE espn_fight_id IS NOT NULL;

-- 4. Function to find fighter by name (for ID mapping)
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
    LOWER(f.full_name) = LOWER(p_name)
    OR LOWER(f.full_name) ILIKE '%' || LOWER(p_name) || '%'
    OR LOWER(p_name) ILIKE '%' || LOWER(f.full_name) || '%'
  ORDER BY
    CASE WHEN LOWER(f.full_name) = LOWER(p_name) THEN 0 ELSE 1 END,
    (f.record_wins + f.record_losses) DESC
  LIMIT 5;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_fighter_by_name(TEXT) TO authenticated, anon;

-- 5. Function to update ESPN fighter ID
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

GRANT EXECUTE ON FUNCTION public.set_espn_fighter_id(TEXT, TEXT) TO service_role;

-- Done!
SELECT 'ESPN columns added successfully!' as status;
