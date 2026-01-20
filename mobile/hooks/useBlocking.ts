/**
 * Blocking and Reporting Hook
 *
 * Handles:
 * - Blocking/unblocking users
 * - Reporting users
 * - Getting blocked users list
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export interface BlockedUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  blocked_at: string;
}

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'inappropriate_username'
  | 'impersonation'
  | 'cheating'
  | 'other';

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: ReportReason;
  details: string | null;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  created_at: string;
}

export function useBlocking() {
  const queryClient = useQueryClient();

  // Fetch blocked users
  const {
    data: blockedUsers,
    isLoading: blockedLoading,
    error: blockedError,
    refetch: refetchBlocked,
  } = useQuery({
    queryKey: ['blockedUsers'],
    queryFn: async (): Promise<BlockedUser[]> => {
      logger.breadcrumb('Fetching blocked users', 'blocking');

      const { data, error } = await supabase.rpc('get_blocked_users');

      if (error) {
        logger.error('Failed to fetch blocked users', error);
        throw error;
      }

      logger.debug('Blocked users fetched', { count: data?.length || 0 });
      return (data as BlockedUser[]) || [];
    },
  });

  // Block a user
  const blockUser = useMutation({
    mutationFn: async (userId: string) => {
      logger.breadcrumb('Blocking user', 'blocking', { userId });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase.from('blocks').insert({
        blocker_id: user.id,
        blocked_id: userId,
      });

      if (error) {
        logger.error('Failed to block user', error, { userId });
        throw error;
      }

      // Also unfollow the user if following
      await (supabase as any)
        .from('follows')
        .delete()
        .or(`user_id.eq.${user.id},following_id.eq.${user.id}`)
        .or(`user_id.eq.${userId},following_id.eq.${userId}`);

      logger.info('User blocked', { userId });
    },
    onSuccess: () => {
      // Invalidate all social queries
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['userSearch'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  // Unblock a user
  const unblockUser = useMutation({
    mutationFn: async (userId: string) => {
      logger.breadcrumb('Unblocking user', 'blocking', { userId });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId);

      if (error) {
        logger.error('Failed to unblock user', error, { userId });
        throw error;
      }

      logger.info('User unblocked', { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] });
    },
  });

  // Report a user
  const reportUser = useMutation({
    mutationFn: async ({
      userId,
      reason,
      details,
    }: {
      userId: string;
      reason: ReportReason;
      details?: string;
    }) => {
      logger.breadcrumb('Reporting user', 'blocking', { userId, reason });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        reported_user_id: userId,
        reason,
        details: details || null,
        status: 'pending',
      });

      if (error) {
        logger.error('Failed to report user', error, { userId, reason });
        throw error;
      }

      logger.info('User reported', { userId, reason });
    },
  });

  // Check if a specific user is blocked
  const checkBlocked = async (userId: string): Promise<boolean> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    const { data } = await supabase
      .from('blocks')
      .select('id')
      .or(
        `and(blocker_id.eq.${user.id},blocked_id.eq.${userId}),and(blocker_id.eq.${userId},blocked_id.eq.${user.id})`
      )
      .maybeSingle();

    return !!data;
  };

  return {
    // Data
    blockedUsers: blockedUsers || [],

    // Loading states
    blockedLoading,
    blockLoading: blockUser.isPending,
    unblockLoading: unblockUser.isPending,
    reportLoading: reportUser.isPending,

    // Errors
    blockedError,

    // Actions
    block: blockUser.mutateAsync,
    unblock: unblockUser.mutateAsync,
    report: reportUser.mutateAsync,

    // Helpers
    checkBlocked,
    refetchBlocked,
  };
}
