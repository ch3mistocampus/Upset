-- Add is_title_bout flag to bouts table
-- Enables automatic champion detection when title fight results come in

ALTER TABLE bouts ADD COLUMN IF NOT EXISTS is_title_bout boolean DEFAULT false;

-- Backfill: Mark bouts as title fights where scheduled_rounds = 5
-- AND the event is a numbered UFC event (e.g., "UFC 324: ...")
UPDATE bouts b
SET is_title_bout = true
FROM events e
WHERE b.event_id = e.id
  AND b.scheduled_rounds = 5
  AND e.name ~ 'UFC \d+';

-- Also mark any bout where weight_class contains 'title' or 'championship'
UPDATE bouts
SET is_title_bout = true
WHERE weight_class ILIKE '%title%'
   OR weight_class ILIKE '%championship%';
