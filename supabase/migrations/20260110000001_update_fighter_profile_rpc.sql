-- ============================================================================
-- Update Fighter Profile RPC to include ranking, weight_class, and ufcstats_url
-- ============================================================================

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
BEGIN
  -- Get fighter profile (now includes ranking, weight_class, and ufcstats_url)
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
  WHERE f.fighter_id = p_fighter_id;

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
        WHEN fi.red_fighter_id = p_fighter_id THEN fi.blue_fighter_id
        ELSE fi.red_fighter_id
      END AS opponent_id,
      CASE
        WHEN fi.red_fighter_id = p_fighter_id THEN fi.blue_fighter_name
        ELSE fi.red_fighter_name
      END AS opponent_name,
      -- Determine result from perspective of this fighter
      CASE
        WHEN fi.winner_fighter_id = p_fighter_id THEN 'Win'
        WHEN fi.loser_fighter_id = p_fighter_id THEN 'Loss'
        WHEN fi.result_method = 'Draw' THEN 'Draw'
        WHEN fi.result_method ILIKE '%no contest%' THEN 'NC'
        ELSE 'Unknown'
      END AS result,
      -- Which corner was this fighter
      CASE
        WHEN fi.red_fighter_id = p_fighter_id THEN 'red'
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
          AND fs.fighter_id = p_fighter_id
          AND fs.is_total = TRUE
        LIMIT 1
      ) AS totals
    FROM public.ufc_fights fi
    JOIN public.ufc_events e ON e.event_id = fi.event_id
    WHERE fi.red_fighter_id = p_fighter_id
       OR fi.blue_fighter_id = p_fighter_id
  ) history;

  -- Combine results
  v_result := json_build_object(
    'fighter', v_fighter,
    'history', v_history
  );

  RETURN v_result;
END;
$$;
