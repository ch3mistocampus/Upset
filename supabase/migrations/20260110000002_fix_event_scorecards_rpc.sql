-- =============================================================================
-- Fix get_event_scorecards RPC to include round-by-round data
-- =============================================================================
-- The original RPC only returned total_scores without round breakdown
-- This update adds the rounds array with per-round aggregates for the event view
-- =============================================================================

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
      -- Round-by-round aggregates for event card display
      'rounds', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'round_number', ra.round_number,
            'submission_count', ra.submission_count,
            'mean_red', ra.mean_red,
            'mean_blue', ra.mean_blue,
            'consensus_index', ra.consensus_index,
            'buckets', ra.buckets
          ) ORDER BY ra.round_number
        ), '[]'::jsonb)
        FROM round_aggregates ra
        WHERE ra.bout_id = b.id
      ),
      -- Total submissions across all rounds (convenience field)
      'total_submissions', (
        SELECT COALESCE(SUM(ra.submission_count), 0)
        FROM round_aggregates ra
        WHERE ra.bout_id = b.id
      ),
      -- Legacy total_scores for backwards compatibility
      'total_scores', (
        SELECT jsonb_build_object(
          'red', COALESCE(SUM(mean_red), 0),
          'blue', COALESCE(SUM(mean_blue), 0),
          'submission_count', COALESCE(SUM(submission_count), 0)
        )
        FROM round_aggregates ra
        WHERE ra.bout_id = b.id
      ),
      'user_total', (
        SELECT jsonb_build_object(
          'red', COALESCE(SUM(score_red), 0),
          'blue', COALESCE(SUM(score_blue), 0)
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

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION public.get_event_scorecards(UUID) TO authenticated, anon;
