/**
 * Leaderboard Hook
 * Sprint 2: Social Features
 *
 * Handles:
 * - Fetching global leaderboard
 * - Fetching friends leaderboard
 * - Fetching community pick percentages for fights
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import type { LeaderboardEntry, CommunityPickPercentages } from '../types/social';

export function useLeaderboard() {
  // Fetch global leaderboard
  const {
    data: globalLeaderboard,
    isLoading: globalLoading,
    error: globalError,
    refetch: refetchGlobal,
  } = useQuery({
    queryKey: ['leaderboard', 'global'],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      logger.breadcrumb('Fetching global leaderboard', 'leaderboard');

      const { data, error } = await supabase.rpc('get_global_leaderboard', {
        limit_count: 100,
      });

      if (error) {
        logger.error('Failed to fetch global leaderboard', error);
        throw error;
      }

      logger.debug('Global leaderboard fetched', { count: data?.length || 0 });
      return (data as LeaderboardEntry[]) || [];
    },
    staleTime: 60000, // 1 minute
  });

  // Fetch friends leaderboard
  const {
    data: friendsLeaderboard,
    isLoading: friendsLoading,
    error: friendsError,
    refetch: refetchFriends,
  } = useQuery({
    queryKey: ['leaderboard', 'friends'],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      logger.breadcrumb('Fetching friends leaderboard', 'leaderboard');

      const { data, error } = await supabase.rpc('get_friends_leaderboard');

      if (error) {
        logger.error('Failed to fetch friends leaderboard', error);
        throw error;
      }

      logger.debug('Friends leaderboard fetched', { count: data?.length || 0 });
      return (data as LeaderboardEntry[]) || [];
    },
    staleTime: 60000, // 1 minute
  });

  return {
    // Global leaderboard
    globalLeaderboard: globalLeaderboard || [],
    globalLoading,
    globalError,
    refetchGlobal,

    // Friends leaderboard
    friendsLeaderboard: friendsLeaderboard || [],
    friendsLoading,
    friendsError,
    refetchFriends,
  };
}

/**
 * Hook for fetching community pick percentages for a specific fight
 */
export function useCommunityPickPercentages(fightId: string | undefined) {
  return useQuery({
    queryKey: ['communityPickPercentages', fightId],
    queryFn: async (): Promise<CommunityPickPercentages | null> => {
      if (!fightId) {
        return null;
      }

      logger.breadcrumb('Fetching community pick percentages', 'leaderboard', { fightId });

      const { data, error } = await supabase.rpc('get_community_pick_percentages', {
        fight_id_input: fightId,
      });

      if (error) {
        logger.error('Failed to fetch community pick percentages', error, { fightId });
        throw error;
      }

      // RPC returns array with single row or empty array
      const result = Array.isArray(data) && data.length > 0 ? data[0] : null;

      logger.debug('Community pick percentages fetched', {
        fightId,
        totalPicks: result?.total_picks || 0,
      });

      return result as CommunityPickPercentages | null;
    },
    enabled: !!fightId,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook for fetching community pick percentages for all bouts in an event
 * Uses optimized batch RPC to fetch all percentages in a single query
 */
export function useEventCommunityPercentages(boutIds: string[]) {
  return useQuery({
    queryKey: ['eventCommunityPercentages', boutIds],
    queryFn: async (): Promise<Map<string, CommunityPickPercentages>> => {
      if (!boutIds || boutIds.length === 0) {
        return new Map();
      }

      logger.breadcrumb('Fetching event community percentages', 'leaderboard', {
        boutCount: boutIds.length,
      });

      // Fetch all percentages in a single batch query
      const { data, error } = await supabase.rpc('get_batch_community_pick_percentages', {
        fight_ids: boutIds,
      });

      if (error) {
        logger.warn('Failed to fetch batch community percentages, returning empty', error);
        return new Map(); // Graceful degradation instead of throwing
      }

      const percentagesMap = new Map<string, CommunityPickPercentages>();

      // Build the map from batch results
      if (Array.isArray(data)) {
        data.forEach((row: {
          fight_id: string;
          total_picks: number;
          fighter_a_picks: number;
          fighter_b_picks: number;
          fighter_a_percentage: number;
          fighter_b_percentage: number;
        }) => {
          percentagesMap.set(row.fight_id, {
            total_picks: row.total_picks,
            fighter_a_picks: row.fighter_a_picks,
            fighter_b_picks: row.fighter_b_picks,
            fighter_a_percentage: row.fighter_a_percentage,
            fighter_b_percentage: row.fighter_b_percentage,
          } as CommunityPickPercentages);
        });
      }

      logger.debug('Event community percentages fetched', {
        boutCount: boutIds.length,
        fetchedCount: percentagesMap.size,
      });

      return percentagesMap;
    },
    enabled: boutIds.length > 0,
    staleTime: 30000, // 30 seconds
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}
