/**
 * Post Edit Hook
 *
 * Handles editing posts and comments after creation
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { postKeys } from './usePosts';

interface UpdatePostInput {
  postId: string;
  title: string;
  body?: string;
}

interface UpdateCommentInput {
  commentId: string;
  postId: string; // Needed for cache invalidation
  body: string;
}

interface UpdateResult {
  success: boolean;
}

/**
 * Update a post
 */
export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, title, body }: UpdatePostInput): Promise<UpdateResult> => {
      logger.breadcrumb('Updating post', 'posts', { postId });

      const { data, error } = await supabase.rpc('update_post', {
        p_post_id: postId,
        p_title: title,
        p_body: body || null,
      });

      if (error) {
        logger.error('Failed to update post', error);
        throw error;
      }

      logger.info('Post updated', { postId });
      return data as UpdateResult;
    },
    onSuccess: (_, variables) => {
      // Invalidate post detail to refresh with new content
      queryClient.invalidateQueries({ queryKey: postKeys.detail(variables.postId) });
      // Invalidate feeds to update title/preview
      queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}

/**
 * Update a comment
 */
export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, body }: UpdateCommentInput): Promise<UpdateResult> => {
      logger.breadcrumb('Updating comment', 'posts', { commentId });

      const { data, error } = await supabase.rpc('update_comment', {
        p_comment_id: commentId,
        p_body: body,
      });

      if (error) {
        logger.error('Failed to update comment', error);
        throw error;
      }

      logger.info('Comment updated', { commentId });
      return data as UpdateResult;
    },
    onSuccess: (_, variables) => {
      // Invalidate post detail to refresh comments
      queryClient.invalidateQueries({ queryKey: postKeys.detail(variables.postId) });
    },
  });
}

/**
 * Combined hook for edit functionality
 */
export function usePostEditing() {
  const updatePost = useUpdatePost();
  const updateComment = useUpdateComment();

  return {
    updatePost,
    updateComment,
    isLoading: updatePost.isPending || updateComment.isPending,
  };
}
