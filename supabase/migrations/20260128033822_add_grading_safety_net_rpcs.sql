-- Migration: Add grading safety net RPCs
-- 1. get_events_with_ungraded_picks - finds completed events with orphaned active picks
-- 2. grade_bout_picks - atomically grades all picks for a bout in a single transaction
-- 3. should_sync_results - event-aware cache for results sync

-- =============================================================================
-- 1. Safety net: find completed events that still have ungraded picks
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_events_with_ungraded_picks()
RETURNS SETOF events
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT DISTINCT e.*
  FROM events e
  JOIN bouts b ON b.event_id = e.id
  JOIN picks p ON p.bout_id = b.id
  WHERE e.status = 'completed'
    AND p.status = 'active'
  ORDER BY e.event_date DESC
  LIMIT 10;
$$;

GRANT EXECUTE ON FUNCTION public.get_events_with_ungraded_picks() TO service_role;

-- =============================================================================
-- 2. Transactional pick grading: grade all picks for a bout atomically
-- =============================================================================
CREATE OR REPLACE FUNCTION public.grade_bout_picks(
  p_bout_id UUID,
  p_winner_corner TEXT,
  p_event_date TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pick RECORD;
  v_new_status TEXT;
  v_score INT;
  v_graded INT := 0;
  v_affected_users UUID[] := '{}';
BEGIN
  -- Grade each active pick for this bout
  FOR v_pick IN
    SELECT id, picked_corner, user_id
    FROM picks
    WHERE bout_id = p_bout_id
      AND status = 'active'
    FOR UPDATE  -- Lock rows to prevent concurrent grading
  LOOP
    IF p_winner_corner IN ('draw', 'nc') THEN
      v_new_status := 'voided';
      v_score := NULL;
    ELSE
      v_new_status := 'graded';
      v_score := CASE WHEN v_pick.picked_corner = p_winner_corner THEN 1 ELSE 0 END;
    END IF;

    UPDATE picks
    SET status = v_new_status,
        score = v_score,
        locked_at = p_event_date
    WHERE id = v_pick.id;

    v_graded := v_graded + 1;

    -- Collect affected user IDs (avoid duplicates)
    IF NOT (v_pick.user_id = ANY(v_affected_users)) THEN
      v_affected_users := v_affected_users || v_pick.user_id;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'graded', v_graded,
    'affected_users', to_json(v_affected_users)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.grade_bout_picks(UUID, TEXT, TIMESTAMPTZ) TO service_role;

-- =============================================================================
-- 3. Event-aware results cache: shorter cache on event days
-- =============================================================================
CREATE OR REPLACE FUNCTION public.should_sync(p_sync_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings RECORD;
  v_last_sync TIMESTAMPTZ;
  v_cache_hours INTEGER;
  v_has_event_today BOOLEAN;
BEGIN
  SELECT * INTO v_settings FROM app_settings WHERE id = 'default';

  CASE p_sync_type
    WHEN 'events' THEN
      v_last_sync := v_settings.last_events_sync_at;
      v_cache_hours := v_settings.events_cache_hours;
    WHEN 'fighters' THEN
      v_last_sync := v_settings.last_fighters_sync_at;
      v_cache_hours := v_settings.fighters_cache_hours;
    WHEN 'results' THEN
      v_last_sync := v_settings.last_results_sync_at;
      -- Dynamic cache: check if there's an event within the last 24h
      SELECT EXISTS(
        SELECT 1 FROM events
        WHERE status != 'completed'
          AND event_date BETWEEN NOW() - INTERVAL '24 hours' AND NOW() + INTERVAL '24 hours'
      ) INTO v_has_event_today;

      IF v_has_event_today THEN
        v_cache_hours := 0;  -- No cache on event day, always sync
      ELSE
        v_cache_hours := 1;  -- Normal: 1 hour
      END IF;
    ELSE
      RETURN true;  -- Unknown type, sync to be safe
  END CASE;

  -- If never synced, sync now
  IF v_last_sync IS NULL THEN
    RETURN true;
  END IF;

  -- If cache is 0, always sync
  IF v_cache_hours = 0 THEN
    RETURN true;
  END IF;

  -- Check if cache has expired
  RETURN v_last_sync < NOW() - (v_cache_hours || ' hours')::INTERVAL;
END;
$$;
