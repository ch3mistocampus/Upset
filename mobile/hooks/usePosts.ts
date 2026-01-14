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
  FeedSortOption,
} from '../types/posts';

// Query keys for cache management
export const postKeys = {
  all: ['posts'] as const,
  feed: (sortBy?: FeedSortOption) => [...postKeys.all, 'feed', sortBy || 'top'] as const,
  followingFeed: (userId: string) => [...postKeys.all, 'following', userId] as const,
  detail: (id: string) => [...postKeys.all, 'detail', id] as const,
  userPosts: (userId: string) => [...postKeys.all, 'user', userId] as const,
};

const PAGE_SIZE = 20;

/**
 * Fetch posts feed with infinite pagination
 * @param sortBy - 'top' for engagement-based ranking, 'recent' for chronological
 */
export function usePostsFeed(sortBy: FeedSortOption = 'top') {
  return useInfiniteQuery({
    queryKey: postKeys.feed(sortBy),
    queryFn: async ({ pageParam = 0 }): Promise<Post[]> => {
      logger.breadcrumb('Fetching posts feed', 'posts', { offset: pageParam, sortBy });

      try {
        const { data, error } = await supabase.rpc('get_posts_feed', {
          p_limit: PAGE_SIZE,
          p_offset: pageParam,
          p_sort_by: sortBy,
        });

        if (error) {
          logger.error('Failed to fetch posts feed', error);
          return [];
        }

        logger.debug('Posts feed fetched', { count: data?.length || 0, sortBy });
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
    queryKey: postKeys.followingFeed(userId || ''),
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
      // Invalidate all post feeds to show new post
      queryClient.invalidateQueries({ queryKey: postKeys.all });
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
      // Also invalidate all feeds to update comment count
      queryClient.invalidateQueries({ queryKey: postKeys.all });
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
      // Invalidate all post queries
      queryClient.invalidateQueries({ queryKey: postKeys.all });
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
      // Invalidate all feeds to update counts
      queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}

/**
 * Helper to build comment tree from flat array
 * Optimized for large comment sets with O(n) complexity
 * @param comments - Flat array of comments
 * @param maxDepth - Maximum nesting depth to process (default 3)
 * @returns Tree structure of comments with nested replies
 */
export function buildCommentTree(comments: Comment[], maxDepth: number = 3): CommentWithReplies[] {
  // Handle empty or small arrays efficiently
  if (!comments || comments.length === 0) {
    return [];
  }

  // Use Map for O(1) lookups
  const commentMap = new Map<string, CommentWithReplies>();
  const rootComments: CommentWithReplies[] = [];

  // Pre-allocate all comment objects in a single pass
  // This is more memory-efficient than creating objects on the fly
  for (let i = 0; i < comments.length; i++) {
    const comment = comments[i];
    commentMap.set(comment.id, {
      ...comment,
      replies: [],
    });
  }

  // Build tree structure in a single pass
  // Process comments in order (assumes they're sorted by created_at)
  for (let i = 0; i < comments.length; i++) {
    const comment = comments[i];
    const commentWithReplies = commentMap.get(comment.id)!;

    // Skip comments that exceed max depth (safety check)
    if (comment.depth > maxDepth) {
      continue;
    }

    if (comment.parent_id) {
      const parent = commentMap.get(comment.parent_id);
      if (parent && parent.depth < maxDepth) {
        parent.replies.push(commentWithReplies);
      } else {
        // Parent not found or at max depth, treat as root
        rootComments.push(commentWithReplies);
      }
    } else {
      rootComments.push(commentWithReplies);
    }
  }

  return rootComments;
}

/**
 * Sort replies within a comment tree by created_at
 * Call this after buildCommentTree if replies need to be sorted
 */
export function sortCommentReplies(comments: CommentWithReplies[]): CommentWithReplies[] {
  return comments.map(comment => ({
    ...comment,
    replies: sortCommentReplies(
      comment.replies.sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    ),
  }));
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
