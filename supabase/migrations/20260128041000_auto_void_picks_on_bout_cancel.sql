-- Automatically void active picks when a bout is canceled
-- This prevents orphaned active picks regardless of which code path
-- triggers the cancellation (sync, manual, etc.)

CREATE OR REPLACE FUNCTION public.void_picks_on_bout_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when status changes TO canceled or replaced
  IF (NEW.status IN ('canceled', 'replaced'))
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE picks
    SET status = 'voided', score = NULL
    WHERE bout_id = NEW.id
      AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_void_picks_on_bout_cancel
  AFTER UPDATE OF status ON bouts
  FOR EACH ROW
  EXECUTE FUNCTION void_picks_on_bout_cancel();

-- Also void any existing orphans (idempotent)
UPDATE picks
SET status = 'voided', score = NULL
WHERE status = 'active'
  AND bout_id IN (
    SELECT id FROM bouts WHERE status IN ('canceled', 'replaced')
  );
