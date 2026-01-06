/**
 * Post and Comment Like Hooks
 *
 * Handles:
 * - Toggling likes on posts
 * - Toggling likes on comments
 * - Optimistic updates for instant UI feedback
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { LikeToggleResult, Post, PostWithComments, Comment } from '../types/posts';
import { postKeys } from './usePosts';

// Type for paginated post data from infinite queries
interface PaginatedPosts {
  pages: Post[][];
  pageParams: unknown[];
}

/**
 * Toggle like on a post
 */
export function useTogglePostLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string): Promise<LikeToggleResult> => {
      logger.breadcrumb('Toggling post like', 'posts', { postId });

      const { data, error } = await supabase.rpc('toggle_post_like', {
        p_post_id: postId,
      });

      if (error) {
        logger.error('Failed to toggle post like', error);
        throw error;
      }

      logger.debug('Post like toggled', data);
      return data as LikeToggleResult;
    },
    // Optimistic update for instant feedback
    onMutate: async (postId) => {
      // Cancel outgoing refetches for all post queries
      await queryClient.cancelQueries({ queryKey: postKeys.all });

      // Snapshot current data
      const previousFeed = queryClient.getQueryData(postKeys.feed());
      const previousDetail = queryClient.getQueryData(postKeys.detail(postId));

      // Helper function to update a post in paginated data
      const updatePostInPages = (old: PaginatedPosts | undefined) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) =>
            page.map((post) => {
              if (post.id === postId) {
                return {
                  ...post,
                  user_has_liked: !post.user_has_liked,
                  like_count: post.user_has_liked
                    ? post.like_count - 1
                    : post.like_count + 1,
                };
              }
              return post;
            })
          ),
        };
      };

      // Optimistically update main feed
      queryClient.setQueryData(postKeys.feed(), updatePostInPages);

      // Optimistically update all following feeds (they all start with ['posts', 'following'])
      queryClient.setQueriesData(
        { queryKey: [...postKeys.all, 'following'], exact: false },
        updatePostInPages
      );

      // Optimistically update user posts feeds
      queryClient.setQueriesData(
        { queryKey: [...postKeys.all, 'user'], exact: false },
        updatePostInPages
      );

      // Optimistically update detail
      queryClient.setQueryData(postKeys.detail(postId), (old: PostWithComments | null) => {
        if (!old?.post) return old;
        return {
          ...old,
          post: {
            ...old.post,
            user_has_liked: !old.post.user_has_liked,
            like_count: old.post.user_has_liked
              ? old.post.like_count - 1
              : old.post.like_count + 1,
          },
        };
      });

      return { previousFeed, previousDetail };
    },
    // Rollback on error
    onError: (err, postId, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(postKeys.feed(), context.previousFeed);
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(postKeys.detail(postId), context.previousDetail);
      }
      // Also invalidate all to ensure consistency
      queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
    // Always refetch after mutation to ensure consistency
    onSettled: (_, __, postId) => {
      // Invalidate all post-related queries to update like counts everywhere
      queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}

/**
 * Toggle like on a comment
 */
export function useToggleCommentLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      postId,
    }: {
      commentId: string;
      postId: string;
    }): Promise<LikeToggleResult> => {
      logger.breadcrumb('Toggling comment like', 'posts', { commentId });

      const { data, error } = await supabase.rpc('toggle_comment_like', {
        p_comment_id: commentId,
      });

      if (error) {
        logger.error('Failed to toggle comment like', error);
        throw error;
      }

      logger.debug('Comment like toggled', data);
      return data as LikeToggleResult;
    },
    // Optimistic update
    onMutate: async ({ commentId, postId }) => {
      await queryClient.cancelQueries({ queryKey: postKeys.detail(postId) });

      const previousDetail = queryClient.getQueryData(postKeys.detail(postId));

      queryClient.setQueryData(postKeys.detail(postId), (old: PostWithComments | null) => {
        if (!old?.comments) return old;
        return {
          ...old,
          comments: old.comments.map((comment: Comment) => {
            if (comment.id === commentId) {
              return {
                ...comment,
                user_has_liked: !comment.user_has_liked,
                like_count: comment.user_has_liked
                  ? comment.like_count - 1
                  : comment.like_count + 1,
              };
            }
            return comment;
          }),
        };
      });

      return { previousDetail };
    },
    onError: (err, { postId }, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(postKeys.detail(postId), context.previousDetail);
      }
    },
    onSettled: (_, __, { postId }) => {
      queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) });
    },
  });
}

/**
 * Combined hook for convenient access to both like functions
 */
export function usePostLikes() {
  const togglePostLike = useTogglePostLike();
  const toggleCommentLike = useToggleCommentLike();

  return {
    togglePostLike,
    toggleCommentLike,
    isLoading: togglePostLike.isPending || toggleCommentLike.isPending,
  };
}
