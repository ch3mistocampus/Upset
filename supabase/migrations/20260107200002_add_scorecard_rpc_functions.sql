-- =============================================================================
-- Global Scorecard Feature - RPC Functions
-- =============================================================================
-- API functions for scorecard operations
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. GET SCORECARD
-- -----------------------------------------------------------------------------
-- Returns full scorecard data for a fight including:
-- - Round state
-- - Aggregates for all rounds
-- - Current user's submissions (if authenticated)

CREATE OR REPLACE FUNCTION public.get_fight_scorecard(
  p_bout_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_state JSONB;
  v_aggregates JSONB;
  v_user_scores JSONB;
  v_bout JSONB;
BEGIN
  -- Get bout info
  SELECT jsonb_build_object(
    'id', b.id,
    'event_id', b.event_id,
    'red_name', b.red_name,
    'blue_name', b.blue_name,
    'weight_class', b.weight_class,
    'status', b.status
  ) INTO v_bout
  FROM bouts b
  WHERE b.id = p_bout_id;

  IF v_bout IS NULL THEN
    RETURN jsonb_build_object('error', 'Bout not found');
  END IF;

  -- Get round state
  SELECT jsonb_build_object(
    'current_round', rs.current_round,
    'phase', rs.phase,
    'scheduled_rounds', rs.scheduled_rounds,
    'round_started_at', rs.round_started_at,
    'round_ends_at', rs.round_ends_at,
    'scoring_grace_seconds', rs.scoring_grace_seconds,
    'source', rs.source,
    'updated_at', rs.updated_at,
    'is_scoring_open', (
      rs.phase = 'ROUND_BREAK' AND
      (rs.round_ends_at IS NULL OR
       now() <= rs.round_ends_at + (rs.scoring_grace_seconds || ' seconds')::interval)
    )
  ) INTO v_state
  FROM round_state rs
  WHERE rs.bout_id = p_bout_id;

  -- Default state if none exists
  IF v_state IS NULL THEN
    v_state := jsonb_build_object(
      'current_round', 0,
      'phase', 'PRE_FIGHT',
      'scheduled_rounds', 3,
      'round_started_at', null,
      'round_ends_at', null,
      'scoring_grace_seconds', 90,
      'source', 'MANUAL',
      'updated_at', null,
      'is_scoring_open', false
    );
  END IF;

  -- Get aggregates for all rounds
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'round_number', ra.round_number,
      'submission_count', ra.submission_count,
      'buckets', ra.buckets,
      'mean_red', ra.mean_red,
      'mean_blue', ra.mean_blue,
      'consensus_index', ra.consensus_index
    ) ORDER BY ra.round_number
  ), '[]'::jsonb) INTO v_aggregates
  FROM round_aggregates ra
  WHERE ra.bout_id = p_bout_id;

  -- Get current user's scores (if authenticated)
  IF auth.uid() IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'round_number', rs.round_number,
        'score_red', rs.score_red,
        'score_blue', rs.score_blue,
        'submitted_at', rs.submitted_at
      ) ORDER BY rs.round_number
    ), '[]'::jsonb) INTO v_user_scores
    FROM round_scores rs
    WHERE rs.bout_id = p_bout_id AND rs.user_id = auth.uid();
  ELSE
    v_user_scores := '[]'::jsonb;
  END IF;

  -- Build final result
  v_result := jsonb_build_object(
    'bout', v_bout,
    'round_state', v_state,
    'aggregates', v_aggregates,
    'user_scores', v_user_scores
  );

  RETURN v_result;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. SUBMIT SCORE
-- -----------------------------------------------------------------------------
-- Submits a round score with idempotency support
-- Returns the submission result or existing submission if duplicate

CREATE OR REPLACE FUNCTION public.submit_round_score(
  p_submission_id UUID,
  p_bout_id UUID,
  p_round_number INT,
  p_score_red INT,
  p_score_blue INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_state round_state%ROWTYPE;
  v_existing round_scores%ROWTYPE;
  v_new_score round_scores%ROWTYPE;
  v_bucket_key TEXT;
  v_grace_end TIMESTAMPTZ;
BEGIN
  -- Must be authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'authentication_required',
      'message', 'You must be signed in to submit scores'
    );
  END IF;

  -- Validate score values
  IF p_score_red < 7 OR p_score_red > 10 OR p_score_blue < 7 OR p_score_blue > 10 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_score',
      'message', 'Scores must be between 7 and 10'
    );
  END IF;

  IF p_score_red != 10 AND p_score_blue != 10 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_score',
      'message', 'At least one fighter must have 10 points'
    );
  END IF;

  -- Check for existing submission by submission_id (idempotency)
  SELECT * INTO v_existing
  FROM round_scores
  WHERE submission_id = p_submission_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent', true,
      'message', 'Score already submitted',
      'score', jsonb_build_object(
        'round_number', v_existing.round_number,
        'score_red', v_existing.score_red,
        'score_blue', v_existing.score_blue,
        'submitted_at', v_existing.submitted_at
      )
    );
  END IF;

  -- Check for existing submission by user/round (one per user per round)
  SELECT * INTO v_existing
  FROM round_scores
  WHERE bout_id = p_bout_id
    AND round_number = p_round_number
    AND user_id = v_user_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_submitted',
      'message', 'You have already submitted a score for this round',
      'existing_score', jsonb_build_object(
        'round_number', v_existing.round_number,
        'score_red', v_existing.score_red,
        'score_blue', v_existing.score_blue,
        'submitted_at', v_existing.submitted_at
      )
    );
  END IF;

  -- Get round state
  SELECT * INTO v_state
  FROM round_state
  WHERE bout_id = p_bout_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'scoring_not_available',
      'message', 'Scoring is not yet available for this fight'
    );
  END IF;

  -- Check if scoring window is open
  IF v_state.phase != 'ROUND_BREAK' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'scoring_closed',
      'message', CASE v_state.phase
        WHEN 'PRE_FIGHT' THEN 'The fight has not started yet'
        WHEN 'ROUND_LIVE' THEN 'Scoring is only available between rounds'
        WHEN 'ROUND_CLOSED' THEN 'Scoring for this round has closed'
        WHEN 'FIGHT_ENDED' THEN 'This fight has ended'
        ELSE 'Scoring is not currently available'
      END
    );
  END IF;

  -- Check round number matches current round
  IF v_state.current_round != p_round_number THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'wrong_round',
      'message', format('Scoring is open for round %s, not round %s', v_state.current_round, p_round_number)
    );
  END IF;

  -- Check grace period
  IF v_state.round_ends_at IS NOT NULL THEN
    v_grace_end := v_state.round_ends_at + (v_state.scoring_grace_seconds || ' seconds')::interval;
    IF now() > v_grace_end THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'grace_period_expired',
        'message', 'The scoring window has closed'
      );
    END IF;
  END IF;

  -- Insert the score
  INSERT INTO round_scores (
    submission_id,
    bout_id,
    round_number,
    user_id,
    score_red,
    score_blue
  ) VALUES (
    p_submission_id,
    p_bout_id,
    p_round_number,
    v_user_id,
    p_score_red,
    p_score_blue
  )
  RETURNING * INTO v_new_score;

  -- Update aggregates atomically
  v_bucket_key := get_score_bucket(p_score_red, p_score_blue);

  INSERT INTO round_aggregates (bout_id, round_number, submission_count, buckets, mean_red, mean_blue)
  VALUES (
    p_bout_id,
    p_round_number,
    1,
    jsonb_build_object(v_bucket_key, 1),
    p_score_red,
    p_score_blue
  )
  ON CONFLICT (bout_id, round_number)
  DO UPDATE SET
    submission_count = round_aggregates.submission_count + 1,
    buckets = jsonb_set(
      round_aggregates.buckets,
      ARRAY[v_bucket_key],
      to_jsonb(COALESCE((round_aggregates.buckets->>v_bucket_key)::int, 0) + 1)
    ),
    mean_red = (
      SELECT AVG(rs.score_red)::numeric(4,2)
      FROM round_scores rs
      WHERE rs.bout_id = p_bout_id AND rs.round_number = p_round_number
    ),
    mean_blue = (
      SELECT AVG(rs.score_blue)::numeric(4,2)
      FROM round_scores rs
      WHERE rs.bout_id = p_bout_id AND rs.round_number = p_round_number
    ),
    updated_at = now();

  -- Update consensus index
  UPDATE round_aggregates
  SET consensus_index = (
    SELECT MAX(value::int)::numeric / submission_count
    FROM jsonb_each_text(buckets)
  )
  WHERE bout_id = p_bout_id AND round_number = p_round_number;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Score submitted successfully',
    'score', jsonb_build_object(
      'round_number', v_new_score.round_number,
      'score_red', v_new_score.score_red,
      'score_blue', v_new_score.score_blue,
      'submitted_at', v_new_score.submitted_at
    )
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. ADMIN UPDATE ROUND STATE
-- -----------------------------------------------------------------------------
-- Admin-only function to update round state

CREATE OR REPLACE FUNCTION public.admin_update_round_state(
  p_bout_id UUID,
  p_action TEXT, -- START_ROUND, END_ROUND, START_BREAK, END_FIGHT
  p_round_number INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
  v_state round_state%ROWTYPE;
  v_previous_phase round_phase;
  v_new_phase round_phase;
  v_new_round INT;
  v_bout bouts%ROWTYPE;
BEGIN
  -- Check admin status
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT is_admin INTO v_is_admin
  FROM profiles
  WHERE user_id = v_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- Get bout info
  SELECT * INTO v_bout FROM bouts WHERE id = p_bout_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bout not found');
  END IF;

  -- Get or create round state
  SELECT * INTO v_state FROM round_state WHERE bout_id = p_bout_id;

  IF NOT FOUND THEN
    -- Create initial state
    INSERT INTO round_state (bout_id, event_id, current_round, phase, scheduled_rounds)
    VALUES (
      p_bout_id,
      v_bout.event_id,
      0,
      'PRE_FIGHT',
      CASE
        WHEN v_bout.order_index = 0 THEN 5 -- Main event = 5 rounds
        ELSE 3
      END
    )
    RETURNING * INTO v_state;
  END IF;

  v_previous_phase := v_state.phase;
  v_new_round := v_state.current_round;

  -- Handle action
  CASE p_action
    WHEN 'START_ROUND' THEN
      -- Validate: must be PRE_FIGHT or ROUND_BREAK
      IF v_state.phase NOT IN ('PRE_FIGHT', 'ROUND_BREAK', 'ROUND_CLOSED') THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', format('Cannot start round from phase %s', v_state.phase)
        );
      END IF;

      v_new_round := COALESCE(p_round_number, v_state.current_round + 1);
      IF v_new_round > v_state.scheduled_rounds THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', format('Round %s exceeds scheduled rounds (%s)', v_new_round, v_state.scheduled_rounds)
        );
      END IF;

      v_new_phase := 'ROUND_LIVE';

      UPDATE round_state
      SET current_round = v_new_round,
          phase = v_new_phase,
          round_started_at = now(),
          round_ends_at = now() + (round_duration_seconds || ' seconds')::interval
      WHERE bout_id = p_bout_id;

    WHEN 'END_ROUND', 'START_BREAK' THEN
      -- Validate: must be ROUND_LIVE
      IF v_state.phase != 'ROUND_LIVE' THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', format('Cannot end round from phase %s', v_state.phase)
        );
      END IF;

      v_new_phase := 'ROUND_BREAK';

      UPDATE round_state
      SET phase = v_new_phase,
          round_ends_at = now()
      WHERE bout_id = p_bout_id;

    WHEN 'CLOSE_SCORING' THEN
      -- Validate: must be ROUND_BREAK
      IF v_state.phase != 'ROUND_BREAK' THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', format('Cannot close scoring from phase %s', v_state.phase)
        );
      END IF;

      v_new_phase := 'ROUND_CLOSED';

      UPDATE round_state
      SET phase = v_new_phase
      WHERE bout_id = p_bout_id;

    WHEN 'END_FIGHT' THEN
      v_new_phase := 'FIGHT_ENDED';

      UPDATE round_state
      SET phase = v_new_phase
      WHERE bout_id = p_bout_id;

    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Unknown action: %s', p_action)
      );
  END CASE;

  -- Log the state change
  INSERT INTO round_state_log (
    bout_id,
    admin_user_id,
    action,
    round_number,
    previous_phase,
    new_phase
  ) VALUES (
    p_bout_id,
    v_admin_id,
    p_action,
    v_new_round,
    v_previous_phase,
    v_new_phase
  );

  -- Return updated state
  SELECT * INTO v_state FROM round_state WHERE bout_id = p_bout_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', format('Round state updated: %s', p_action),
    'state', jsonb_build_object(
      'current_round', v_state.current_round,
      'phase', v_state.phase,
      'round_started_at', v_state.round_started_at,
      'round_ends_at', v_state.round_ends_at,
      'scheduled_rounds', v_state.scheduled_rounds
    )
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. GET SCORECARDS FOR EVENT
-- -----------------------------------------------------------------------------
-- Get all scorecards for bouts in an event (for event overview)

CREATE OR REPLACE FUNCTION public.get_event_scorecards(
  p_event_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'bout_id', b.id,
      'red_name', b.red_name,
      'blue_name', b.blue_name,
      'order_index', b.order_index,
      'weight_class', b.weight_class,
      'round_state', (
        SELECT jsonb_build_object(
          'current_round', rs.current_round,
          'phase', rs.phase,
          'scheduled_rounds', rs.scheduled_rounds,
          'is_scoring_open', (
            rs.phase = 'ROUND_BREAK' AND
            (rs.round_ends_at IS NULL OR
             now() <= rs.round_ends_at + (rs.scoring_grace_seconds || ' seconds')::interval)
          )
        )
        FROM round_state rs
        WHERE rs.bout_id = b.id
      ),
      'total_scores', (
        SELECT jsonb_build_object(
          'red', SUM(score_red),
          'blue', SUM(score_blue),
          'submission_count', (SELECT SUM(submission_count) FROM round_aggregates WHERE bout_id = b.id)
        )
        FROM round_aggregates ra
        WHERE ra.bout_id = b.id
      ),
      'user_total', (
        SELECT jsonb_build_object(
          'red', SUM(score_red),
          'blue', SUM(score_blue)
        )
        FROM round_scores rs
        WHERE rs.bout_id = b.id AND rs.user_id = auth.uid()
      )
    ) ORDER BY b.order_index
  ), '[]'::jsonb) INTO v_result
  FROM bouts b
  WHERE b.event_id = p_event_id
    AND b.status != 'canceled';

  RETURN jsonb_build_object(
    'event_id', p_event_id,
    'scorecards', v_result
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. ADMIN GET LIVE FIGHTS
-- -----------------------------------------------------------------------------
-- Get all fights with active scorecards (for admin dashboard)

CREATE OR REPLACE FUNCTION public.admin_get_live_fights()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Check admin status
  SELECT is_admin INTO v_is_admin
  FROM profiles
  WHERE user_id = auth.uid();

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('error', 'Admin access required');
  END IF;

  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'bout_id', rs.bout_id,
        'event_id', rs.event_id,
        'event_name', e.name,
        'red_name', b.red_name,
        'blue_name', b.blue_name,
        'current_round', rs.current_round,
        'phase', rs.phase,
        'scheduled_rounds', rs.scheduled_rounds,
        'round_started_at', rs.round_started_at,
        'round_ends_at', rs.round_ends_at,
        'submission_counts', (
          SELECT jsonb_agg(
            jsonb_build_object(
              'round', ra.round_number,
              'count', ra.submission_count
            ) ORDER BY ra.round_number
          )
          FROM round_aggregates ra
          WHERE ra.bout_id = rs.bout_id
        ),
        'updated_at', rs.updated_at
      )
    ), '[]'::jsonb)
    FROM round_state rs
    JOIN bouts b ON b.id = rs.bout_id
    JOIN events e ON e.id = rs.event_id
    WHERE rs.phase NOT IN ('PRE_FIGHT', 'FIGHT_ENDED')
    ORDER BY rs.updated_at DESC
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. RECOMPUTE AGGREGATES (ADMIN UTILITY)
-- -----------------------------------------------------------------------------
-- Rebuild aggregates from raw scores (for recovery)

CREATE OR REPLACE FUNCTION public.admin_recompute_aggregates(
  p_bout_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_round RECORD;
BEGIN
  -- Check admin status
  SELECT is_admin INTO v_is_admin
  FROM profiles
  WHERE user_id = auth.uid();

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('error', 'Admin access required');
  END IF;

  -- Delete existing aggregates for this bout
  DELETE FROM round_aggregates WHERE bout_id = p_bout_id;

  -- Rebuild from raw scores
  FOR v_round IN
    SELECT DISTINCT round_number FROM round_scores WHERE bout_id = p_bout_id ORDER BY round_number
  LOOP
    INSERT INTO round_aggregates (bout_id, round_number, submission_count, buckets, mean_red, mean_blue, consensus_index)
    SELECT
      p_bout_id,
      v_round.round_number,
      COUNT(*),
      (
        SELECT jsonb_object_agg(bucket, cnt)
        FROM (
          SELECT get_score_bucket(score_red, score_blue) as bucket, COUNT(*) as cnt
          FROM round_scores
          WHERE bout_id = p_bout_id AND round_number = v_round.round_number
          GROUP BY get_score_bucket(score_red, score_blue)
        ) buckets
      ),
      AVG(score_red)::numeric(4,2),
      AVG(score_blue)::numeric(4,2),
      (
        SELECT MAX(cnt)::numeric / COUNT(*)
        FROM (
          SELECT get_score_bucket(score_red, score_blue), COUNT(*) as cnt
          FROM round_scores
          WHERE bout_id = p_bout_id AND round_number = v_round.round_number
          GROUP BY get_score_bucket(score_red, score_blue)
        ) buckets
      )
    FROM round_scores
    WHERE bout_id = p_bout_id AND round_number = v_round.round_number;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Aggregates recomputed',
    'rounds_processed', (SELECT COUNT(DISTINCT round_number) FROM round_scores WHERE bout_id = p_bout_id)
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 7. GRANT EXECUTE PERMISSIONS
-- -----------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.get_fight_scorecard(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.submit_round_score(UUID, UUID, INT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_round_state(UUID, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_scorecards(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_live_fights() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_recompute_aggregates(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_scoring_open(UUID, INT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_score_bucket(INT, INT) TO authenticated, anon;
