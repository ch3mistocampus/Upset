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
