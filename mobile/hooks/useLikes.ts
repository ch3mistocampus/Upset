/**
 * useLikes Hook
 *
 * Manage likes on activity feed items.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { feedKeys } from './useFeed';

export const likeKeys = {
  all: ['likes'] as const,
};

interface ToggleLikeResult {
  liked: boolean;
  like_count: number;
}

/**
 * Toggle like on an activity
 */
export function useToggleLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activityId: string): Promise<ToggleLikeResult> => {
      const { data, error } = await supabase.rpc('toggle_activity_like', {
        p_activity_id: activityId,
      });

      if (error) throw error;
      return data as unknown as ToggleLikeResult;
    },
    onMutate: async (activityId) => {
      // Optimistic update - we'll toggle the like state immediately
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: feedKeys.all });

      return { activityId };
    },
    onSuccess: (result, activityId) => {
      // Update the cache with the new like state
      // This will be reflected in the UI immediately
      queryClient.invalidateQueries({ queryKey: feedKeys.all });
    },
    onError: (error, activityId, context) => {
      // Revert on error
      queryClient.invalidateQueries({ queryKey: feedKeys.all });
    },
  });
}

/**
 * Hook for liking activities with optimistic updates
 */
export function useLike() {
  const toggleLike = useToggleLike();

  return {
    toggleLike: toggleLike.mutateAsync,
    isToggling: toggleLike.isPending,
  };
}
