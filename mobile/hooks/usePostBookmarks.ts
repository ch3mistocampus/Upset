/**
 * Post Bookmarks Hook
 *
 * Handles saving/unsaving posts for later viewing
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { Post, PostWithComments } from '../types/posts';
import { postKeys } from './usePosts';

// Query keys for bookmarks
export const bookmarkKeys = {
  all: ['bookmarks'] as const,
  list: () => [...bookmarkKeys.all, 'list'] as const,
};

interface BookmarkedPost extends Post {
  bookmarked_at: string;
}

/**
 * Fetch user's bookmarked posts with pagination
 */
export function useBookmarkedPosts() {
  return useInfiniteQuery({
    queryKey: bookmarkKeys.list(),
    queryFn: async ({ pageParam = 0 }): Promise<BookmarkedPost[]> => {
      logger.breadcrumb('Fetching bookmarked posts', 'bookmarks', { offset: pageParam });

      const { data, error } = await supabase.rpc('get_bookmarked_posts', {
        p_limit: 20,
        p_offset: pageParam,
      });

      if (error) {
        logger.error('Failed to fetch bookmarked posts', error);
        throw error;
      }

      return (data || []) as BookmarkedPost[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 20) return undefined;
      return allPages.length * 20;
    },
  });
}

/**
 * Toggle bookmark on a post
 */
export function useToggleBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string): Promise<{ bookmarked: boolean }> => {
      logger.breadcrumb('Toggling post bookmark', 'bookmarks', { postId });

      const { data, error } = await supabase.rpc('toggle_post_bookmark', {
        p_post_id: postId,
      });

      if (error) {
        logger.error('Failed to toggle bookmark', error);
        throw error;
      }

      logger.debug('Bookmark toggled', data);
      return data as { bookmarked: boolean };
    },
    // Optimistic update
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: bookmarkKeys.all });
      await queryClient.cancelQueries({ queryKey: postKeys.detail(postId) });

      const previousBookmarks = queryClient.getQueryData(bookmarkKeys.list());
      const previousDetail = queryClient.getQueryData(postKeys.detail(postId));

      // Optimistically update detail view
      queryClient.setQueryData(postKeys.detail(postId), (old: PostWithComments | undefined) => {
        if (!old?.post) return old;
        return {
          ...old,
          post: {
            ...old.post,
            user_has_bookmarked: !old.post.user_has_bookmarked,
          },
        };
      });

      return { previousBookmarks, previousDetail };
    },
    onError: (err, postId, context) => {
      if (context?.previousBookmarks) {
        queryClient.setQueryData(bookmarkKeys.list(), context.previousBookmarks);
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(postKeys.detail(postId), context.previousDetail);
      }
    },
    onSettled: (data, error, postId) => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.all });
      queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) });
    },
  });
}

/**
 * Check if a post is bookmarked
 */
export function useIsBookmarked(postId: string) {
  return useQuery({
    queryKey: [...bookmarkKeys.all, 'check', postId],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from('post_bookmarks')
        .select('id')
        .eq('post_id', postId)
        .maybeSingle();

      if (error) {
        logger.error('Failed to check bookmark status', error);
        return false;
      }

      return !!data;
    },
    staleTime: 30000, // 30 seconds
  });
}
