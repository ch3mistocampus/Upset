/**
 * useMute Hook
 *
 * Manage muted users. Muting is softer than blocking:
 * - Muted users don't appear in your feed
 * - They can still follow you and see your content
 * - They don't know they're muted
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { logger } from '../lib/logger';

export const muteKeys = {
  all: ['mutes'] as const,
  list: () => [...muteKeys.all, 'list'] as const,
  check: (userId: string) => [...muteKeys.all, 'check', userId] as const,
};

export interface MutedUser {
  id: string;
  muted_user_id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
}

/**
 * Get list of muted users
 */
export function useMutedUsers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: muteKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_muted_users');

      if (error) throw error;
      return data as MutedUser[];
    },
    enabled: !!user,
  });
}

/**
 * Check if a specific user is muted
 */
export function useIsMuted(targetUserId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: muteKeys.check(targetUserId || ''),
    queryFn: async () => {
      if (!targetUserId) return false;

      const { data, error } = await supabase.rpc('is_muted', {
        check_user_id: targetUserId,
        by_user_id: user!.id,
      });

      if (error) {
        logger.error('Error checking mute status', error);
        return false;
      }

      return data === true;
    },
    enabled: !!user && !!targetUserId && targetUserId !== user?.id,
  });
}

/**
 * Mute a user
 */
export function useMuteUser() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('mutes')
        .insert({ user_id: user.id, muted_user_id: targetUserId });

      if (error) throw error;
      return true;
    },
    onSuccess: (_, targetUserId) => {
      queryClient.invalidateQueries({ queryKey: muteKeys.all });
      // Invalidate feed queries to remove muted user's content
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

/**
 * Unmute a user
 */
export function useUnmuteUser() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('mutes')
        .delete()
        .eq('user_id', user.id)
        .eq('muted_user_id', targetUserId);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: muteKeys.all });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

/**
 * Combined hook for mute operations
 */
export function useMute() {
  const { data: mutedUsers, isLoading: mutedUsersLoading } = useMutedUsers();
  const muteUser = useMuteUser();
  const unmuteUser = useUnmuteUser();

  return {
    mutedUsers,
    mutedUsersLoading,
    mute: muteUser.mutateAsync,
    unmute: unmuteUser.mutateAsync,
    isMuting: muteUser.isPending,
    isUnmuting: unmuteUser.isPending,
  };
}
