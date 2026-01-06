/**
 * Global Scorecard Hooks
 *
 * React Query hooks for scorecard data fetching and mutations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type {
  FightScorecard,
  EventScorecards,
  SubmitScoreResponse,
  UpdateRoundStateResponse,
  LiveFight,
  AdminAction,
} from '../types/scorecard';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const scorecardKeys = {
  all: ['scorecard'] as const,
  fight: (boutId: string) => [...scorecardKeys.all, 'fight', boutId] as const,
  event: (eventId: string) => [...scorecardKeys.all, 'event', eventId] as const,
  live: () => [...scorecardKeys.all, 'live'] as const,
};

// =============================================================================
// GET FIGHT SCORECARD
// =============================================================================

/**
 * Fetch scorecard data for a specific fight
 * Includes round state, aggregates, and user's submissions
 */
export function useFightScorecard(boutId: string | undefined, options?: { refetchInterval?: number }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: scorecardKeys.fight(boutId || ''),
    queryFn: async (): Promise<FightScorecard> => {
      const { data, error } = await supabase.rpc('get_fight_scorecard', {
        p_bout_id: boutId,
      });

      if (error) throw error;

      // Handle error response from function
      if (data?.error) {
        throw new Error(data.error);
      }

      return data as FightScorecard;
    },
    enabled: !!boutId,
    staleTime: 10000, // 10 seconds - refresh frequently during live fights
    refetchInterval: options?.refetchInterval ?? false,
  });
}

// =============================================================================
// GET EVENT SCORECARDS
// =============================================================================

/**
 * Fetch scorecard summaries for all fights in an event
 */
export function useEventScorecards(eventId: string | undefined, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: scorecardKeys.event(eventId || ''),
    queryFn: async (): Promise<EventScorecards> => {
      const { data, error } = await supabase.rpc('get_event_scorecards', {
        p_event_id: eventId,
      });

      if (error) throw error;
      return data as EventScorecards;
    },
    enabled: !!eventId,
    staleTime: 15000, // 15 seconds
    refetchInterval: options?.refetchInterval ?? false,
  });
}

// =============================================================================
// SUBMIT SCORE
// =============================================================================

interface SubmitScoreParams {
  boutId: string;
  roundNumber: number;
  scoreRed: number;
  scoreBlue: number;
}

/**
 * Submit a round score
 * Handles idempotency via client-generated submission_id
 */
export function useSubmitScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SubmitScoreParams): Promise<SubmitScoreResponse> => {
      // Generate idempotent submission ID
      const submissionId = crypto.randomUUID();

      const { data, error } = await supabase.rpc('submit_round_score', {
        p_submission_id: submissionId,
        p_bout_id: params.boutId,
        p_round_number: params.roundNumber,
        p_score_red: params.scoreRed,
        p_score_blue: params.scoreBlue,
      });

      if (error) throw error;
      return data as SubmitScoreResponse;
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        // Invalidate scorecard to refresh with new data
        queryClient.invalidateQueries({
          queryKey: scorecardKeys.fight(variables.boutId),
        });
      }
    },
  });
}

// =============================================================================
// ADMIN: UPDATE ROUND STATE
// =============================================================================

interface UpdateRoundStateParams {
  boutId: string;
  action: AdminAction;
  roundNumber?: number;
}

/**
 * Admin function to update round state
 */
export function useAdminUpdateRoundState() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateRoundStateParams): Promise<UpdateRoundStateResponse> => {
      const { data, error } = await supabase.rpc('admin_update_round_state', {
        p_bout_id: params.boutId,
        p_action: params.action,
        p_round_number: params.roundNumber ?? null,
      });

      if (error) throw error;
      return data as UpdateRoundStateResponse;
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        // Invalidate relevant queries
        queryClient.invalidateQueries({
          queryKey: scorecardKeys.fight(variables.boutId),
        });
        queryClient.invalidateQueries({
          queryKey: scorecardKeys.live(),
        });
      }
    },
  });
}

// =============================================================================
// ADMIN: GET LIVE FIGHTS
// =============================================================================

/**
 * Admin function to get all fights with active scorecards
 */
export function useAdminLiveFights() {
  return useQuery({
    queryKey: scorecardKeys.live(),
    queryFn: async (): Promise<LiveFight[]> => {
      const { data, error } = await supabase.rpc('admin_get_live_fights');

      if (error) throw error;

      // Handle error response
      if (data?.error) {
        throw new Error(data.error);
      }

      return (data as LiveFight[]) || [];
    },
    staleTime: 5000, // 5 seconds - refresh frequently for admin
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });
}

// =============================================================================
// ADMIN: RECOMPUTE AGGREGATES
// =============================================================================

/**
 * Admin function to recompute aggregates from raw scores
 */
export function useAdminRecomputeAggregates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (boutId: string) => {
      const { data, error } = await supabase.rpc('admin_recompute_aggregates', {
        p_bout_id: boutId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, boutId) => {
      queryClient.invalidateQueries({
        queryKey: scorecardKeys.fight(boutId),
      });
    },
  });
}

// =============================================================================
// POLLING HELPER
// =============================================================================

/**
 * Determine the appropriate polling interval based on fight phase
 */
export function getScorecardPollingInterval(phase: string | undefined): number | false {
  if (!phase) return false;

  switch (phase) {
    case 'ROUND_BREAK':
      return 5000; // 5 seconds during scoring window
    case 'ROUND_LIVE':
      return 10000; // 10 seconds during round
    case 'PRE_FIGHT':
      return 30000; // 30 seconds before fight
    case 'FIGHT_ENDED':
    case 'ROUND_CLOSED':
      return false; // No polling needed
    default:
      return 15000; // 15 seconds default
  }
}

// =============================================================================
// OPTIMISTIC UPDATE HELPER
// =============================================================================

/**
 * Create optimistic update data for score submission
 */
export function createOptimisticScore(
  currentData: FightScorecard | undefined,
  params: SubmitScoreParams
): FightScorecard | undefined {
  if (!currentData) return undefined;

  // Add optimistic user score
  const existingScoreIndex = currentData.user_scores.findIndex(
    (s) => s.round_number === params.roundNumber
  );

  const newUserScores = [...currentData.user_scores];
  const newScore = {
    round_number: params.roundNumber,
    score_red: params.scoreRed,
    score_blue: params.scoreBlue,
    submitted_at: new Date().toISOString(),
  };

  if (existingScoreIndex >= 0) {
    newUserScores[existingScoreIndex] = newScore;
  } else {
    newUserScores.push(newScore);
    newUserScores.sort((a, b) => a.round_number - b.round_number);
  }

  return {
    ...currentData,
    user_scores: newUserScores,
  };
}
