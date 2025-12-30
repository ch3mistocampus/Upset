-- Add updated_at column to picks table
-- This column tracks when a pick was last modified

ALTER TABLE picks
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_picks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires before UPDATE on picks
CREATE TRIGGER picks_updated_at_trigger
BEFORE UPDATE ON picks
FOR EACH ROW
EXECUTE FUNCTION update_picks_updated_at();

-- Backfill existing picks with created_at as updated_at
UPDATE picks
SET updated_at = created_at
WHERE updated_at IS NULL;
