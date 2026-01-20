-- ============================================================================
-- Fix Fighter Profile RPC to handle ESPN IDs
-- ============================================================================
-- The bouts table stores fighter IDs that may be either:
-- 1. UFCStats IDs (e.g., "e1248941344b3288")
-- 2. ESPN IDs (e.g., "espn-3949584")
--
-- This update makes the RPC try multiple lookup strategies:
-- 1. Direct match on fighter_id
-- 2. Match on espn_fighter_id (strip "espn-" prefix)
-- 3. Fallback to name matching

CREATE OR REPLACE FUNCTION public.get_fighter_profile_and_history(p_fighter_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fighter JSON;
  v_history JSON;
  v_result JSON;
  v_actual_fighter_id TEXT;
  v_espn_id TEXT;
BEGIN
  -- Try to find the fighter by multiple strategies

  -- Strategy 1: Direct match on fighter_id
  SELECT f.fighter_id INTO v_actual_fighter_id
  FROM public.ufc_fighters f
  WHERE f.fighter_id = p_fighter_id
  LIMIT 1;

  -- Strategy 2: If input starts with 'espn-', try matching espn_fighter_id
  IF v_actual_fighter_id IS NULL AND p_fighter_id LIKE 'espn-%' THEN
    -- Extract the ESPN ID number (remove 'espn-' prefix)
    v_espn_id := SUBSTRING(p_fighter_id FROM 6);

    SELECT f.fighter_id INTO v_actual_fighter_id
    FROM public.ufc_fighters f
    WHERE f.espn_fighter_id = v_espn_id
       OR f.espn_fighter_id = p_fighter_id
    LIMIT 1;
  END IF;

  -- Strategy 3: Try to find by looking up the bout and matching fighter name
  IF v_actual_fighter_id IS NULL THEN
    -- Check if this ID exists in bouts and get the fighter name
    SELECT f.fighter_id INTO v_actual_fighter_id
    FROM public.ufc_fighters f
    WHERE EXISTS (
      SELECT 1 FROM public.bouts b
      WHERE (b.red_fighter_ufcstats_id = p_fighter_id AND LOWER(f.full_name) = LOWER(b.red_name))
         OR (b.blue_fighter_ufcstats_id = p_fighter_id AND LOWER(f.full_name) = LOWER(b.blue_name))
    )
    LIMIT 1;
  END IF;

  -- If still not found, return NULL (caller can handle gracefully)
  IF v_actual_fighter_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get fighter profile using the resolved fighter_id
  SELECT json_build_object(
    'fighter_id', f.fighter_id,
    'first_name', f.first_name,
    'last_name', f.last_name,
    'full_name', f.full_name,
    'nickname', f.nickname,
    'dob', f.dob,
    'height_inches', f.height_inches,
    'weight_lbs', f.weight_lbs,
    'reach_inches', f.reach_inches,
    'stance', f.stance,
    'ranking', f.ranking,
    'weight_class', f.weight_class,
    'ufcstats_url', f.ufcstats_url,
    'record', json_build_object(
      'wins', f.record_wins,
      'losses', f.record_losses,
      'draws', f.record_draws,
      'nc', f.record_nc
    ),
    'career_stats', json_build_object(
      'slpm', f.slpm,
      'sapm', f.sapm,
      'str_acc', f.str_acc,
      'str_def', f.str_def,
      'td_avg', f.td_avg,
      'td_acc', f.td_acc,
      'td_def', f.td_def,
      'sub_avg', f.sub_avg
    )
  )
  INTO v_fighter
  FROM public.ufc_fighters f
  WHERE f.fighter_id = v_actual_fighter_id;

  IF v_fighter IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get fight history with opponent info and event details
  SELECT COALESCE(json_agg(history ORDER BY event_date DESC NULLS LAST), '[]'::json)
  INTO v_history
  FROM (
    SELECT
      fi.fight_id,
      fi.event_id,
      e.name AS event_name,
      e.event_date,
      fi.weight_class,
      fi.result_method,
      fi.result_method_details,
      fi.result_round,
      fi.result_time_seconds,
      fi.referee,
      -- Determine opponent
      CASE
        WHEN fi.red_fighter_id = v_actual_fighter_id THEN fi.blue_fighter_id
        ELSE fi.red_fighter_id
      END AS opponent_id,
      CASE
        WHEN fi.red_fighter_id = v_actual_fighter_id THEN fi.blue_fighter_name
        ELSE fi.red_fighter_name
      END AS opponent_name,
      -- Determine result from perspective of this fighter
      CASE
        WHEN fi.winner_fighter_id = v_actual_fighter_id THEN 'Win'
        WHEN fi.loser_fighter_id = v_actual_fighter_id THEN 'Loss'
        WHEN fi.result_method = 'Draw' THEN 'Draw'
        WHEN fi.result_method ILIKE '%no contest%' THEN 'NC'
        ELSE 'Unknown'
      END AS result,
      -- Which corner was this fighter
      CASE
        WHEN fi.red_fighter_id = v_actual_fighter_id THEN 'red'
        ELSE 'blue'
      END AS corner,
      -- Get totals stats for this fighter in this fight
      (
        SELECT json_build_object(
          'knockdowns', fs.knockdowns,
          'sig_str_landed', fs.sig_str_landed,
          'sig_str_attempted', fs.sig_str_attempted,
          'total_str_landed', fs.total_str_landed,
          'total_str_attempted', fs.total_str_attempted,
          'td_landed', fs.td_landed,
          'td_attempted', fs.td_attempted,
          'sub_attempts', fs.sub_attempts,
          'reversals', fs.reversals,
          'ctrl_time_seconds', fs.ctrl_time_seconds
        )
        FROM public.ufc_fight_stats fs
        WHERE fs.fight_id = fi.fight_id
          AND fs.fighter_id = v_actual_fighter_id
          AND fs.is_total = TRUE
        LIMIT 1
      ) AS totals
    FROM public.ufc_fights fi
    JOIN public.ufc_events e ON e.event_id = fi.event_id
    WHERE fi.red_fighter_id = v_actual_fighter_id
       OR fi.blue_fighter_id = v_actual_fighter_id
  ) history;

  -- Combine results
  v_result := json_build_object(
    'fighter', v_fighter,
    'history', v_history
  );

  RETURN v_result;
END;
$$;

-- ============================================================================
-- Also create a function to populate ESPN IDs by name matching
-- This can be run to backfill espn_fighter_id for existing fighters
-- ============================================================================
CREATE OR REPLACE FUNCTION public.map_espn_fighter_id(
  p_fighter_name TEXT,
  p_espn_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fighter_id TEXT;
  v_full_name TEXT;
BEGIN
  -- Find fighter by exact name match first
  SELECT f.fighter_id, f.full_name INTO v_fighter_id, v_full_name
  FROM public.ufc_fighters f
  WHERE LOWER(f.full_name) = LOWER(p_fighter_name)
  LIMIT 1;

  -- If not found, try partial match
  IF v_fighter_id IS NULL THEN
    SELECT f.fighter_id, f.full_name INTO v_fighter_id, v_full_name
    FROM public.ufc_fighters f
    WHERE LOWER(f.full_name) ILIKE '%' || LOWER(p_fighter_name) || '%'
    ORDER BY (f.record_wins + f.record_losses) DESC
    LIMIT 1;
  END IF;

  IF v_fighter_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Fighter not found: ' || p_fighter_name
    );
  END IF;

  -- Update the ESPN ID
  UPDATE public.ufc_fighters
  SET espn_fighter_id = p_espn_id,
      updated_at = NOW()
  WHERE fighter_id = v_fighter_id;

  RETURN json_build_object(
    'success', true,
    'fighter_id', v_fighter_id,
    'full_name', v_full_name,
    'espn_fighter_id', p_espn_id
  );
END;
$$;

-- Allow service role to map ESPN IDs
GRANT EXECUTE ON FUNCTION public.map_espn_fighter_id(TEXT, TEXT) TO service_role;
