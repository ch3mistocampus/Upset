-- Populate weight_class for all fighters based on their weight_lbs
-- UFC weight class limits (upper bounds):
-- Strawweight: 115 lbs
-- Flyweight: 125 lbs
-- Bantamweight: 135 lbs
-- Featherweight: 145 lbs
-- Lightweight: 155 lbs
-- Welterweight: 170 lbs
-- Middleweight: 185 lbs
-- Light Heavyweight: 205 lbs
-- Heavyweight: 265 lbs (or above)

-- Update fighters where weight_class is NULL but weight_lbs is known
UPDATE ufc_fighters
SET weight_class = CASE
  WHEN weight_lbs <= 115 THEN 'Strawweight'
  WHEN weight_lbs <= 125 THEN 'Flyweight'
  WHEN weight_lbs <= 135 THEN 'Bantamweight'
  WHEN weight_lbs <= 145 THEN 'Featherweight'
  WHEN weight_lbs <= 155 THEN 'Lightweight'
  WHEN weight_lbs <= 170 THEN 'Welterweight'
  WHEN weight_lbs <= 185 THEN 'Middleweight'
  WHEN weight_lbs <= 205 THEN 'Light Heavyweight'
  ELSE 'Heavyweight'
END
WHERE weight_lbs IS NOT NULL
AND weight_class IS NULL;

-- Also update ranked fighters whose weight_class might not match their weight_lbs
-- (Keep their ranking, just ensure weight_class is set consistently)
UPDATE ufc_fighters
SET weight_class = CASE
  WHEN weight_lbs <= 115 THEN 'Strawweight'
  WHEN weight_lbs <= 125 THEN 'Flyweight'
  WHEN weight_lbs <= 135 THEN 'Bantamweight'
  WHEN weight_lbs <= 145 THEN 'Featherweight'
  WHEN weight_lbs <= 155 THEN 'Lightweight'
  WHEN weight_lbs <= 170 THEN 'Welterweight'
  WHEN weight_lbs <= 185 THEN 'Middleweight'
  WHEN weight_lbs <= 205 THEN 'Light Heavyweight'
  ELSE 'Heavyweight'
END
WHERE weight_lbs IS NOT NULL
AND weight_class IS NOT NULL
AND ranking IS NULL;

-- Create an index to improve weight class queries
CREATE INDEX IF NOT EXISTS idx_ufc_fighters_weight_class ON ufc_fighters(weight_class);

-- Log the counts per weight class for verification
DO $$
DECLARE
  weight_counts RECORD;
BEGIN
  RAISE NOTICE 'Weight class distribution after migration:';
  FOR weight_counts IN
    SELECT weight_class, COUNT(*) as count
    FROM ufc_fighters
    WHERE weight_class IS NOT NULL
    GROUP BY weight_class
    ORDER BY CASE weight_class
      WHEN 'Strawweight' THEN 1
      WHEN 'Flyweight' THEN 2
      WHEN 'Bantamweight' THEN 3
      WHEN 'Featherweight' THEN 4
      WHEN 'Lightweight' THEN 5
      WHEN 'Welterweight' THEN 6
      WHEN 'Middleweight' THEN 7
      WHEN 'Light Heavyweight' THEN 8
      WHEN 'Heavyweight' THEN 9
    END
  LOOP
    RAISE NOTICE '%: %', weight_counts.weight_class, weight_counts.count;
  END LOOP;
END $$;
