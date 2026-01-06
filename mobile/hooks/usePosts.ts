/**
 * Posts/Forum Hooks
 *
 * Handles:
 * - Fetching posts feed with pagination
 * - Fetching single post with comments
 * - Creating posts and comments
 */

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import {
  Post,
  Comment,
  PostWithComments,
  CreatePostInput,
  CreateCommentInput,
  CommentWithReplies,
} from '../types/posts';

// Query keys for cache management
export const postKeys = {
  all: ['posts'] as const,
  feed: () => [...postKeys.all, 'feed'] as const,
  detail: (id: string) => [...postKeys.all, 'detail', id] as const,
  userPosts: (userId: string) => [...postKeys.all, 'user', userId] as const,
};

const PAGE_SIZE = 20;

/**
 * Fetch posts feed with infinite pagination
 */
export function usePostsFeed() {
  return useInfiniteQuery({
    queryKey: postKeys.feed(),
    queryFn: async ({ pageParam = 0 }): Promise<Post[]> => {
      logger.breadcrumb('Fetching posts feed', 'posts', { offset: pageParam });

      try {
        const { data, error } = await supabase.rpc('get_posts_feed', {
          p_limit: PAGE_SIZE,
          p_offset: pageParam,
        });

        if (error) {
          logger.error('Failed to fetch posts feed', error);
          return [];
        }

        logger.debug('Posts feed fetched', { count: data?.length || 0 });
        return (data as Post[]) || [];
      } catch (err) {
        logger.error('Exception fetching posts feed', err);
        return [];
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) {
        return undefined; // No more pages
      }
      return allPages.length * PAGE_SIZE;
    },
    initialPageParam: 0,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Fetch posts from users the current user follows
 * @param userId - The current user's ID (required for following posts)
 */
export function useFollowingPostsFeed(userId: string | null) {
  return useInfiniteQuery({
    queryKey: [...postKeys.all, 'following', userId] as const,
    queryFn: async ({ pageParam = 0 }): Promise<Post[]> => {
      if (!userId) {
        logger.warn('No userId provided to following posts feed');
        return [];
      }

      logger.breadcrumb('Fetching following posts feed', 'posts', { offset: pageParam, userId });

      try {
        const { data, error } = await supabase.rpc('get_following_posts_feed_for_user', {
          p_user_id: userId,
          p_limit: PAGE_SIZE,
          p_offset: pageParam,
        });

        if (error) {
          logger.error('Failed to fetch following posts feed', error);
          return [];
        }

        logger.debug('Following posts feed fetched', { count: data?.length || 0, userId });
        return (data as Post[]) || [];
      } catch (err) {
        logger.error('Exception fetching following posts feed', err);
        return [];
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) {
        return undefined;
      }
      return allPages.length * PAGE_SIZE;
    },
    initialPageParam: 0,
    enabled: !!userId,
    staleTime: 30000,
  });
}

/**
 * Fetch a single post with its comments
 */
export function usePostWithComments(postId: string | null) {
  return useQuery({
    queryKey: postKeys.detail(postId || ''),
    queryFn: async (): Promise<PostWithComments | null> => {
      if (!postId) return null;

      logger.breadcrumb('Fetching post with comments', 'posts', { postId });

      const { data, error } = await supabase.rpc('get_post_with_comments', {
        p_post_id: postId,
        p_comment_limit: 100,
      });

      if (error) {
        logger.error('Failed to fetch post with comments', error);
        throw error;
      }

      logger.debug('Post with comments fetched', {
        postId,
        commentCount: (data as PostWithComments)?.comments?.length || 0
      });

      return data as PostWithComments;
    },
    enabled: !!postId,
    staleTime: 15000, // 15 seconds
  });
}

/**
 * Fetch posts for a specific user
 */
export function useUserPosts(userId: string | null) {
  return useInfiniteQuery({
    queryKey: postKeys.userPosts(userId || ''),
    queryFn: async ({ pageParam = 0 }): Promise<Post[]> => {
      if (!userId) return [];

      logger.breadcrumb('Fetching user posts', 'posts', { userId, offset: pageParam });

      const { data, error } = await supabase.rpc('get_user_posts', {
        p_user_id: userId,
        p_limit: PAGE_SIZE,
        p_offset: pageParam,
      });

      if (error) {
        logger.error('Failed to fetch user posts', error);
        throw error;
      }

      return (data as Post[]) || [];
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) {
        return undefined;
      }
      return allPages.length * PAGE_SIZE;
    },
    initialPageParam: 0,
    enabled: !!userId,
    staleTime: 30000,
  });
}

/**
 * Create a new post
 */
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePostInput): Promise<string> => {
      logger.breadcrumb('Creating post', 'posts', { title: input.title });

      const { data, error } = await supabase.rpc('create_post', {
        p_title: input.title,
        p_body: input.body || null,
        p_image_urls: input.imageUrls || [],
      });

      if (error) {
        logger.error('Failed to create post', error);
        throw error;
      }

      logger.info('Post created', { postId: data });
      return data as string;
    },
    onSuccess: () => {
      // Invalidate feed to show new post
      queryClient.invalidateQueries({ queryKey: postKeys.feed() });
    },
  });
}

/**
 * Create a comment or reply
 */
export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCommentInput): Promise<string> => {
      logger.breadcrumb('Creating comment', 'posts', {
        postId: input.postId,
        isReply: !!input.parentId
      });

      const { data, error } = await supabase.rpc('create_comment', {
        p_post_id: input.postId,
        p_body: input.body,
        p_parent_id: input.parentId || null,
      });

      if (error) {
        logger.error('Failed to create comment', error);
        throw error;
      }

      logger.info('Comment created', { commentId: data });
      return data as string;
    },
    onSuccess: (_, variables) => {
      // Invalidate post detail to show new comment
      queryClient.invalidateQueries({ queryKey: postKeys.detail(variables.postId) });
      // Also invalidate feed to update comment count
      queryClient.invalidateQueries({ queryKey: postKeys.feed() });
    },
  });
}

/**
 * Delete a post
 */
export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string): Promise<boolean> => {
      logger.breadcrumb('Deleting post', 'posts', { postId });

      const { data, error } = await supabase.rpc('delete_post', {
        p_post_id: postId,
      });

      if (error) {
        logger.error('Failed to delete post', error);
        throw error;
      }

      logger.info('Post deleted', { postId });
      return data as boolean;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.feed() });
    },
  });
}

/**
 * Delete a comment
 */
export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, postId }: { commentId: string; postId: string }): Promise<boolean> => {
      logger.breadcrumb('Deleting comment', 'posts', { commentId });

      const { data, error } = await supabase.rpc('delete_comment', {
        p_comment_id: commentId,
      });

      if (error) {
        logger.error('Failed to delete comment', error);
        throw error;
      }

      logger.info('Comment deleted', { commentId });
      return data as boolean;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: postKeys.detail(variables.postId) });
      queryClient.invalidateQueries({ queryKey: postKeys.feed() });
    },
  });
}

/**
 * Helper to build comment tree from flat array
 */
export function buildCommentTree(comments: Comment[]): CommentWithReplies[] {
  const commentMap = new Map<string, CommentWithReplies>();
  const rootComments: CommentWithReplies[] = [];

  // First pass: create map of all comments with empty replies
  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  // Second pass: build tree structure
  comments.forEach(comment => {
    const commentWithReplies = commentMap.get(comment.id)!;

    if (comment.parent_id) {
      const parent = commentMap.get(comment.parent_id);
      if (parent) {
        parent.replies.push(commentWithReplies);
      } else {
        // Parent not found, treat as root
        rootComments.push(commentWithReplies);
      }
    } else {
      rootComments.push(commentWithReplies);
    }
  });

  return rootComments;
}

/**
 * Format relative time for posts/comments
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
