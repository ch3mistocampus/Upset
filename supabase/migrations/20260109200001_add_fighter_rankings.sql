-- Add ranking columns to ufc_fighters table
-- Rankings are 1-15 for each weight class, NULL means unranked
-- Champion is rank 0

ALTER TABLE ufc_fighters
ADD COLUMN IF NOT EXISTS ranking integer,
ADD COLUMN IF NOT EXISTS weight_class text;

-- Create index for efficient ranking queries
CREATE INDEX IF NOT EXISTS idx_ufc_fighters_ranking ON ufc_fighters(weight_class, ranking)
WHERE ranking IS NOT NULL;

-- Add comment
COMMENT ON COLUMN ufc_fighters.ranking IS 'UFC ranking (0=Champion, 1-15=ranked, NULL=unranked)';
COMMENT ON COLUMN ufc_fighters.weight_class IS 'Official weight class name';
