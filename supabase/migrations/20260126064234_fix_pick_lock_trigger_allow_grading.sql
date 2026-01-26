-- Fix the pick lock trigger to allow grading updates
-- Only block changes to actual pick data (picked_corner, picked_method, picked_round)
-- Allow updates to grading fields (status, score, locked_at, is_correct_method, is_correct_round)

CREATE OR REPLACE FUNCTION validate_pick_not_locked()
RETURNS TRIGGER AS $$
DECLARE
  event_start TIMESTAMPTZ;
  is_pick_change BOOLEAN;
BEGIN
  -- Get event start time
  SELECT e.event_date INTO event_start
  FROM public.events e
  WHERE e.id = NEW.event_id;

  -- Check if this is a change to the actual pick (not just grading)
  IF TG_OP = 'UPDATE' THEN
    -- Only consider it a "pick change" if the picked values are being modified
    is_pick_change := (
      OLD.picked_corner IS DISTINCT FROM NEW.picked_corner OR
      OLD.picked_method IS DISTINCT FROM NEW.picked_method OR
      OLD.picked_round IS DISTINCT FROM NEW.picked_round
    );
  ELSE
    -- INSERT is always a pick change
    is_pick_change := TRUE;
  END IF;

  -- If event has started AND this is a pick change, reject
  IF now() >= event_start AND is_pick_change THEN
    RAISE EXCEPTION 'Picks are locked. Event has already started.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_pick_not_locked() IS
'Prevents users from changing their picks after event starts, but allows grading updates (status, score, locked_at)';
