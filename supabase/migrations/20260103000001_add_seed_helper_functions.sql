-- Migration: Add seed helper functions for seeding historical data
-- These functions allow temporarily disabling triggers for data seeding

-- Function to disable pick lock trigger (for seeding historical picks)
CREATE OR REPLACE FUNCTION disable_pick_lock_trigger()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow service role to call this
  IF current_setting('role', true) != 'service_role' AND
     NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND rolsuper) THEN
    RAISE EXCEPTION 'Only service role can disable pick lock trigger';
  END IF;

  ALTER TABLE picks DISABLE TRIGGER enforce_pick_lock;
END;
$$;

-- Function to re-enable pick lock trigger
CREATE OR REPLACE FUNCTION enable_pick_lock_trigger()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  ALTER TABLE picks ENABLE TRIGGER enforce_pick_lock;
END;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION disable_pick_lock_trigger() TO service_role;
GRANT EXECUTE ON FUNCTION enable_pick_lock_trigger() TO service_role;

COMMENT ON FUNCTION disable_pick_lock_trigger IS 'Temporarily disables pick lock trigger for data seeding (service role only)';
COMMENT ON FUNCTION enable_pick_lock_trigger IS 'Re-enables pick lock trigger after data seeding';
