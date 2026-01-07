/**
 * Post Notifications Hook
 *
 * Handles fetching and managing post-related notifications
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

// Query keys
export const notificationKeys = {
  all: ['postNotifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
  count: () => [...notificationKeys.all, 'count'] as const,
};

export type NotificationType = 'post_like' | 'post_comment' | 'comment_like' | 'comment_reply';

export interface PostNotification {
  id: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
  post_id: string;
  comment_id: string | null;
  post_title: string;
  actor: {
    user_id: string;
    username: string;
    avatar_url: string | null;
  };
}

/**
 * Get notification message based on type
 */
export function getNotificationMessage(notification: PostNotification): string {
  const username = `@${notification.actor.username}`;

  switch (notification.type) {
    case 'post_like':
      return `${username} liked your post`;
    case 'post_comment':
      return `${username} commented on your post`;
    case 'comment_like':
      return `${username} liked your comment`;
    case 'comment_reply':
      return `${username} replied to your comment`;
    default:
      return `${username} interacted with your post`;
  }
}

/**
 * Get unread notification count
 */
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.count(),
    queryFn: async (): Promise<number> => {
      try {
        const { data, error } = await supabase.rpc('get_post_notification_count');

        if (error) {
          // Silently return 0 if function doesn't exist (migration not applied)
          if (error.code === 'PGRST202') {
            return 0;
          }
          logger.error('Failed to get notification count', error);
          return 0;
        }

        return data ?? 0;
      } catch {
        return 0;
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider stale after 10 seconds
  });
}

/**
 * Fetch notifications with pagination
 */
export function usePostNotifications(unreadOnly = false) {
  return useInfiniteQuery({
    queryKey: [...notificationKeys.list(), { unreadOnly }],
    queryFn: async ({ pageParam = 0 }): Promise<PostNotification[]> => {
      logger.breadcrumb('Fetching post notifications', 'notifications', { offset: pageParam });

      try {
        const { data, error } = await supabase.rpc('get_post_notifications', {
          p_limit: 30,
          p_offset: pageParam,
          p_unread_only: unreadOnly,
        });

        if (error) {
          // Return empty array if function doesn't exist (migration not applied)
          if (error.code === 'PGRST202') {
            return [];
          }
          logger.error('Failed to fetch notifications', error);
          throw error;
        }

        return (data || []) as PostNotification[];
      } catch (err) {
        // Gracefully handle missing function
        return [];
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 30) return undefined;
      return allPages.length * 30;
    },
  });
}

/**
 * Mark notifications as read
 */
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationIds?: string[]): Promise<{ updated_count: number }> => {
      logger.breadcrumb('Marking notifications as read', 'notifications', {
        count: notificationIds?.length ?? 'all',
      });

      const { data, error } = await supabase.rpc('mark_post_notifications_read', {
        p_notification_ids: notificationIds || null,
      });

      if (error) {
        logger.error('Failed to mark notifications as read', error);
        throw error;
      }

      return data as { updated_count: number };
    },
    onSuccess: () => {
      // Invalidate both list and count
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Combined hook for notification functionality
 */
export function useNotifications() {
  const { data: unreadCount = 0, refetch: refetchCount } = useUnreadNotificationCount();
  const notifications = usePostNotifications();
  const markAsRead = useMarkNotificationsRead();

  return {
    unreadCount,
    refetchCount,
    notifications,
    markAsRead,
    hasUnread: unreadCount > 0,
  };
}
