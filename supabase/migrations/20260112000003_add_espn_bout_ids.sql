-- ============================================================================
-- Add ESPN IDs to bouts table for MMA API integration
-- ============================================================================
-- This allows the bouts table to work with both UFCStats and ESPN/MMA API

-- Add ESPN fight ID
ALTER TABLE bouts
ADD COLUMN IF NOT EXISTS espn_fight_id TEXT;

CREATE INDEX IF NOT EXISTS idx_bouts_espn_fight_id
ON bouts(espn_fight_id)
WHERE espn_fight_id IS NOT NULL;

COMMENT ON COLUMN bouts.espn_fight_id IS 'ESPN fight ID for MMA API integration';

-- Add ESPN fighter IDs for red and blue corners
ALTER TABLE bouts
ADD COLUMN IF NOT EXISTS espn_red_fighter_id TEXT;

ALTER TABLE bouts
ADD COLUMN IF NOT EXISTS espn_blue_fighter_id TEXT;

CREATE INDEX IF NOT EXISTS idx_bouts_espn_red_fighter
ON bouts(espn_red_fighter_id)
WHERE espn_red_fighter_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bouts_espn_blue_fighter
ON bouts(espn_blue_fighter_id)
WHERE espn_blue_fighter_id IS NOT NULL;

COMMENT ON COLUMN bouts.espn_red_fighter_id IS 'ESPN fighter ID for red corner';
COMMENT ON COLUMN bouts.espn_blue_fighter_id IS 'ESPN fighter ID for blue corner';
