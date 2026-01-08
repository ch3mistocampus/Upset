/**
 * Global Scorecard Hooks
 *
 * React Query hooks for scorecard data fetching and mutations
 * Includes idempotency handling, retry logic, and optimized polling
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { logger } from '../lib/logger';
import type {
  FightScorecard,
  EventScorecards,
  SubmitScoreResponse,
  UpdateRoundStateResponse,
  LiveFight,
  AdminAction,
  RoundPhase,
} from '../types/scorecard';

// =============================================================================
// CONSTANTS
// =============================================================================

const PENDING_SCORES_KEY = '@scorecard_pending_scores';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

// =============================================================================
// PENDING SCORE STORAGE (for offline resilience)
// =============================================================================

interface PendingScore {
  submissionId: string;
  boutId: string;
  roundNumber: number;
  scoreRed: number;
  scoreBlue: number;
  createdAt: string;
  retryCount: number;
}

/**
 * Store a pending score for retry
 */
async function storePendingScore(score: PendingScore): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(PENDING_SCORES_KEY);
    const pending: PendingScore[] = existing ? JSON.parse(existing) : [];
    pending.push(score);
    await AsyncStorage.setItem(PENDING_SCORES_KEY, JSON.stringify(pending));
    logger.info('Stored pending score for retry', { submissionId: score.submissionId });
  } catch (error) {
    logger.error('Failed to store pending score', { error });
  }
}

/**
 * Remove a pending score after successful submission
 */
async function removePendingScore(submissionId: string): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(PENDING_SCORES_KEY);
    if (!existing) return;
    const pending: PendingScore[] = JSON.parse(existing);
    const filtered = pending.filter(s => s.submissionId !== submissionId);
    await AsyncStorage.setItem(PENDING_SCORES_KEY, JSON.stringify(filtered));
  } catch (error) {
    logger.error('Failed to remove pending score', { error });
  }
}

/**
 * Get all pending scores for retry
 */
export async function getPendingScores(): Promise<PendingScore[]> {
  try {
    const existing = await AsyncStorage.getItem(PENDING_SCORES_KEY);
    return existing ? JSON.parse(existing) : [];
  } catch (error) {
    logger.error('Failed to get pending scores', { error });
    return [];
  }
}

/**
 * Retry submitting a pending score with exponential backoff
 */
async function retrySubmitScore(
  score: PendingScore,
  attempt: number = 0
): Promise<SubmitScoreResponse> {
  try {
    const { data, error } = await supabase.rpc('submit_round_score', {
      p_submission_id: score.submissionId,
      p_bout_id: score.boutId,
      p_round_number: score.roundNumber,
      p_score_red: score.scoreRed,
      p_score_blue: score.scoreBlue,
    });

    if (error) throw error;

    // Success - remove from pending
    await removePendingScore(score.submissionId);
    return data as SubmitScoreResponse;
  } catch (error) {
    if (attempt < MAX_RETRIES - 1) {
      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
      return retrySubmitScore(score, attempt + 1);
    }
    throw error;
  }
}

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

      if (error) {
        // Return empty scorecards instead of throwing for graceful degradation
        console.warn('Failed to fetch event scorecards:', error.message);
        return { scorecards: [] } as EventScorecards;
      }
      return data as EventScorecards;
    },
    enabled: !!eventId,
    staleTime: 15000, // 15 seconds
    refetchInterval: options?.refetchInterval ?? false,
    retry: 1, // Only retry once
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
  /** Optional: reuse a submission ID for retry scenarios */
  submissionId?: string;
}

/**
 * Submit a round score with robust idempotency and offline support
 *
 * Features:
 * - Persistent submission ID for network failure recovery
 * - Automatic retry with exponential backoff
 * - Offline queue for later sync
 * - Optimistic updates
 */
export function useSubmitScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SubmitScoreParams): Promise<SubmitScoreResponse> => {
      // Check network connectivity
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        // Store for later and return optimistic response
        const submissionId = params.submissionId || crypto.randomUUID();
        await storePendingScore({
          submissionId,
          boutId: params.boutId,
          roundNumber: params.roundNumber,
          scoreRed: params.scoreRed,
          scoreBlue: params.scoreBlue,
          createdAt: new Date().toISOString(),
          retryCount: 0,
        });
        return {
          success: true,
          message: 'Score saved offline. Will sync when connected.',
          score: {
            round_number: params.roundNumber,
            score_red: params.scoreRed,
            score_blue: params.scoreBlue,
            submitted_at: new Date().toISOString(),
          },
        };
      }

      // Generate or reuse submission ID for idempotency
      const submissionId = params.submissionId || crypto.randomUUID();

      // Store pending score BEFORE making request (for crash recovery)
      const pendingScore: PendingScore = {
        submissionId,
        boutId: params.boutId,
        roundNumber: params.roundNumber,
        scoreRed: params.scoreRed,
        scoreBlue: params.scoreBlue,
        createdAt: new Date().toISOString(),
        retryCount: 0,
      };
      await storePendingScore(pendingScore);

      try {
        const { data, error } = await supabase.rpc('submit_round_score', {
          p_submission_id: submissionId,
          p_bout_id: params.boutId,
          p_round_number: params.roundNumber,
          p_score_red: params.scoreRed,
          p_score_blue: params.scoreBlue,
        });

        if (error) throw error;

        // Success - remove from pending storage
        await removePendingScore(submissionId);

        const response = data as SubmitScoreResponse;
        logger.info('Score submitted successfully', {
          boutId: params.boutId,
          round: params.roundNumber,
          idempotent: response.idempotent,
        });

        return response;
      } catch (error) {
        // Don't remove from pending - will be retried
        logger.error('Score submission failed, will retry', {
          submissionId,
          error,
        });
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        // Invalidate scorecard to refresh with new data
        queryClient.invalidateQueries({
          queryKey: scorecardKeys.fight(variables.boutId),
        });
        // Also invalidate event scorecards if available
        queryClient.invalidateQueries({
          queryKey: scorecardKeys.all,
        });
      }
    },
    retry: 2, // React Query built-in retry
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}

/**
 * Hook to sync pending scores when coming back online
 */
export function useSyncPendingScores() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ synced: number; failed: number }> => {
      const pending = await getPendingScores();
      if (pending.length === 0) return { synced: 0, failed: 0 };

      let synced = 0;
      let failed = 0;

      for (const score of pending) {
        try {
          await retrySubmitScore(score);
          synced++;
        } catch (error) {
          failed++;
          logger.error('Failed to sync pending score', { submissionId: score.submissionId, error });
        }
      }

      return { synced, failed };
    },
    onSuccess: () => {
      // Invalidate all scorecard queries to refresh
      queryClient.invalidateQueries({ queryKey: scorecardKeys.all });
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
 * More aggressive polling during active scoring windows
 */
export function getScorecardPollingInterval(phase: string | undefined): number | false {
  if (!phase) return false;

  switch (phase) {
    case 'ROUND_BREAK':
      return 3000; // 3 seconds during scoring window (most critical)
    case 'ROUND_LIVE':
      return 8000; // 8 seconds during round
    case 'PRE_FIGHT':
      return 30000; // 30 seconds before fight
    case 'FIGHT_ENDED':
    case 'ROUND_CLOSED':
      return false; // No polling needed
    default:
      return 15000; // 15 seconds default
  }
}

/**
 * Calculate optimal polling interval for event view
 * Uses the most aggressive interval among all active bouts
 */
export function getEventPollingInterval(
  phases: (string | undefined)[]
): number | false {
  if (phases.length === 0) return false;

  const intervals = phases.map(getScorecardPollingInterval);
  const activeIntervals = intervals.filter((i): i is number => typeof i === 'number');

  if (activeIntervals.length === 0) return false;

  // Return the smallest (most frequent) interval
  return Math.min(...activeIntervals);
}

/**
 * Error types for better error handling
 */
export type ScorecardError =
  | 'network_error'
  | 'authentication_required'
  | 'scoring_closed'
  | 'already_submitted'
  | 'invalid_score'
  | 'grace_period_expired'
  | 'unknown';

/**
 * Parse error from submit score response
 */
export function parseScorecardError(response: SubmitScoreResponse): ScorecardError | null {
  if (response.success) return null;

  switch (response.error) {
    case 'authentication_required':
      return 'authentication_required';
    case 'scoring_closed':
    case 'scoring_not_available':
    case 'wrong_round':
      return 'scoring_closed';
    case 'already_submitted':
      return 'already_submitted';
    case 'invalid_score':
      return 'invalid_score';
    case 'grace_period_expired':
      return 'grace_period_expired';
    default:
      return 'unknown';
  }
}

/**
 * Get user-friendly error message
 */
export function getScorecardErrorMessage(error: ScorecardError): string {
  switch (error) {
    case 'network_error':
      return 'Network error. Your score has been saved and will sync when connected.';
    case 'authentication_required':
      return 'Please sign in to submit scores.';
    case 'scoring_closed':
      return 'Scoring is currently closed for this round.';
    case 'already_submitted':
      return 'You have already submitted a score for this round.';
    case 'invalid_score':
      return 'Invalid score. Please select a valid score option.';
    case 'grace_period_expired':
      return 'The scoring window has closed.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

// =============================================================================
// CHECK BOUT LIVE STATUS
// =============================================================================

/**
 * Check if a specific bout has an active scorecard (is live or scoring)
 */
export function useBoutLiveStatus(boutId: string | undefined) {
  return useQuery({
    queryKey: [...scorecardKeys.fight(boutId || ''), 'status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('round_state')
        .select('phase, current_round, scheduled_rounds')
        .eq('bout_id', boutId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return { isLive: false, phase: null, currentRound: null, scheduledRounds: null };
      }

      const isLive = data.phase === 'ROUND_LIVE' || data.phase === 'ROUND_BREAK';
      const isActive = data.phase !== 'FIGHT_ENDED' && data.phase !== null;

      return {
        isLive,
        isActive,
        phase: data.phase,
        currentRound: data.current_round,
        scheduledRounds: data.scheduled_rounds,
      };
    },
    enabled: !!boutId,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Check live status for multiple bouts (for event view)
 */
export function useEventLiveStatus(boutIds: string[]) {
  return useQuery({
    queryKey: ['scorecard', 'event-status', boutIds.sort().join(',')],
    queryFn: async () => {
      if (boutIds.length === 0) return new Map();

      const { data, error } = await supabase
        .from('round_state')
        .select('bout_id, phase, current_round, scheduled_rounds')
        .in('bout_id', boutIds);

      if (error) throw error;

      const statusMap = new Map<string, {
        phase: string;
        currentRound: number;
        scheduledRounds: number;
        isLive: boolean;
        isScoring: boolean;
      }>();

      (data || []).forEach((row) => {
        statusMap.set(row.bout_id, {
          phase: row.phase,
          currentRound: row.current_round,
          scheduledRounds: row.scheduled_rounds,
          isLive: row.phase === 'ROUND_LIVE',
          isScoring: row.phase === 'ROUND_BREAK',
        });
      });

      return statusMap;
    },
    enabled: boutIds.length > 0,
    staleTime: 10000,
    refetchInterval: 30000,
  });
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

// =============================================================================
// REALTIME SUBSCRIPTIONS
// =============================================================================

interface RealtimeOptions {
  /** Called when round state changes (phase transitions, round changes) */
  onRoundStateChange?: (payload: { phase: string; current_round: number }) => void;
  /** Called when aggregates are updated (new scores) */
  onAggregatesUpdate?: () => void;
  /** Whether to automatically refetch on changes */
  autoRefetch?: boolean;
}

/**
 * Subscribe to realtime updates for a specific fight's scorecard
 *
 * Subscribes to:
 * - round_state table changes for phase transitions
 * - round_aggregates table changes for score updates
 *
 * @param boutId - The bout ID to subscribe to
 * @param options - Configuration options
 */
export function useScorecardRealtime(
  boutId: string | undefined,
  options: RealtimeOptions = {}
) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { autoRefetch = true, onRoundStateChange, onAggregatesUpdate } = options;

  const invalidateScorecard = useCallback(() => {
    if (!boutId) return;
    queryClient.invalidateQueries({
      queryKey: scorecardKeys.fight(boutId),
    });
  }, [boutId, queryClient]);

  useEffect(() => {
    if (!boutId) return;

    // Create unique channel name for this bout
    const channelName = `scorecard:${boutId}`;

    // Subscribe to realtime changes
    const channel = supabase
      .channel(channelName)
      // Listen for round_state changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'round_state',
          filter: `bout_id=eq.${boutId}`,
        },
        (payload: RealtimePostgresChangesPayload<{ phase: string; current_round: number }>) => {
          logger.info('Realtime: round_state change', { boutId, event: payload.eventType });

          if (payload.new && typeof payload.new === 'object') {
            onRoundStateChange?.({
              phase: (payload.new as any).phase,
              current_round: (payload.new as any).current_round,
            });
          }

          if (autoRefetch) {
            invalidateScorecard();
          }
        }
      )
      // Listen for round_aggregates changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'round_aggregates',
          filter: `bout_id=eq.${boutId}`,
        },
        (payload) => {
          logger.info('Realtime: round_aggregates change', { boutId, event: payload.eventType });

          onAggregatesUpdate?.();

          if (autoRefetch) {
            invalidateScorecard();
          }
        }
      )
      .subscribe((status) => {
        logger.info('Realtime subscription status', { boutId, status });
      });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      logger.info('Unsubscribing from realtime channel', { boutId });
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [boutId, autoRefetch, invalidateScorecard, onRoundStateChange, onAggregatesUpdate]);

  // Return method to manually trigger refetch
  return {
    refetch: invalidateScorecard,
  };
}

/**
 * Subscribe to realtime updates for all fights in an event
 * Useful for event scorecard overview screens
 */
export function useEventScorecardRealtime(
  eventId: string | undefined,
  boutIds: string[],
  options: { autoRefetch?: boolean } = {}
) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { autoRefetch = true } = options;

  useEffect(() => {
    if (!eventId || boutIds.length === 0) return;

    const channelName = `event-scorecards:${eventId}`;

    // Subscribe to changes for all bouts in the event
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'round_state',
        },
        (payload) => {
          // Check if this change is for one of our bouts
          const changedBoutId = (payload.new as any)?.bout_id;
          if (changedBoutId && boutIds.includes(changedBoutId)) {
            logger.info('Realtime: event round_state change', { eventId, boutId: changedBoutId });

            if (autoRefetch) {
              queryClient.invalidateQueries({
                queryKey: scorecardKeys.event(eventId),
              });
              queryClient.invalidateQueries({
                queryKey: ['scorecard', 'event-status'],
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'round_aggregates',
        },
        (payload) => {
          const changedBoutId = (payload.new as any)?.bout_id;
          if (changedBoutId && boutIds.includes(changedBoutId)) {
            logger.info('Realtime: event round_aggregates change', { eventId, boutId: changedBoutId });

            if (autoRefetch) {
              queryClient.invalidateQueries({
                queryKey: scorecardKeys.event(eventId),
              });
            }
          }
        }
      )
      .subscribe((status) => {
        logger.info('Event realtime subscription status', { eventId, status });
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [eventId, boutIds.join(','), autoRefetch, queryClient]);
}

/**
 * Hook to check if realtime is connected and working
 */
export function useRealtimeStatus() {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-status-check')
      .on('presence', { event: 'sync' }, () => {
        logger.info('Realtime presence sync');
      })
      .subscribe((status) => {
        logger.info('Realtime connection status', { status });
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return {
    isConnected: channelRef.current?.state === 'joined',
  };
}
