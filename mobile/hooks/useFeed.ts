/**
 * Activity Feed Hook
 *
 * Handles:
 * - Fetching discover feed (engagement-ranked public activities)
 * - Fetching following feed (activities from people you follow)
 * - Fetching trending users
 */

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

// Export feed keys for cache invalidation from other hooks
export const feedKeys = {
  all: ['feed'] as const,
  discover: () => [...feedKeys.all, 'discover'] as const,
  following: () => [...feedKeys.all, 'following'] as const,
  trending: () => [...feedKeys.all, 'trending'] as const,
  newCount: (since: string) => [...feedKeys.all, 'newCount', since] as const,
};

export type ActivityType =
  | 'made_picks'
  | 'picks_graded'
  | 'new_user'
  | 'streak_milestone'
  | 'accuracy_milestone'
  | 'followed_user'
  | 'event_winner';

export interface ActivityItem {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  activity_type: ActivityType;
  title: string;
  description: string;
  metadata: {
    correct?: number;
    total?: number;
    accuracy?: number;
    streak?: number;
    milestone?: string;
    total_picks?: number;
    event_id?: string;
    event_name?: string;
    target_username?: string;
  };
  engagement_score: number;
  like_count: number;
  is_liked: boolean;
  created_at: string;
}

export interface TrendingUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_picks: number;
  correct_picks: number;
  accuracy: number;
  current_streak: number;
  recent_score: number;
  is_following: boolean;
}

const PAGE_SIZE = 20;

export function useDiscoverFeed() {
  return useInfiniteQuery({
    queryKey: feedKeys.discover(),
    queryFn: async ({ pageParam = 0 }): Promise<ActivityItem[]> => {
      logger.breadcrumb('Fetching discover feed', 'feed', { offset: pageParam });

      const { data, error } = await supabase.rpc('get_discover_feed', {
        limit_count: PAGE_SIZE,
        offset_count: pageParam,
      });

      if (error) {
        logger.error('Failed to fetch discover feed', error);
        throw error;
      }

      logger.debug('Discover feed fetched', { count: data?.length || 0 });
      return (data as ActivityItem[]) || [];
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

export function useFollowingFeed() {
  return useInfiniteQuery({
    queryKey: feedKeys.following(),
    queryFn: async ({ pageParam = 0 }): Promise<ActivityItem[]> => {
      logger.breadcrumb('Fetching following feed', 'feed', { offset: pageParam });

      const { data, error } = await supabase.rpc('get_following_feed', {
        limit_count: PAGE_SIZE,
        offset_count: pageParam,
      });

      if (error) {
        logger.error('Failed to fetch following feed', error);
        throw error;
      }

      logger.debug('Following feed fetched', { count: data?.length || 0 });
      return (data as ActivityItem[]) || [];
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) {
        return undefined;
      }
      return allPages.length * PAGE_SIZE;
    },
    initialPageParam: 0,
    staleTime: 30000,
  });
}

export function useTrendingUsers() {
  return useQuery({
    queryKey: feedKeys.trending(),
    queryFn: async (): Promise<TrendingUser[]> => {
      logger.breadcrumb('Fetching trending users', 'feed');

      const { data, error } = await supabase.rpc('get_trending_users', {
        limit_count: 20,
      });

      if (error) {
        logger.error('Failed to fetch trending users', error);
        throw error;
      }

      logger.debug('Trending users fetched', { count: data?.length || 0 });
      return (data as TrendingUser[]) || [];
    },
    staleTime: 60000, // 1 minute
  });
}

// Helper function to format activity description
export function formatActivityDescription(activity: ActivityItem): string {
  const { type, metadata, event_name, target_username } = activity;

  switch (type) {
    case 'made_picks':
      return `made ${metadata.total_picks || 0} picks for ${event_name || 'an event'}`;

    case 'picks_graded':
      const correct = metadata.correct || 0;
      const total = metadata.total || 0;
      const accuracy = metadata.accuracy || 0;
      return `got ${correct}/${total} correct (${accuracy}%) at ${event_name || 'an event'}`;

    case 'new_user':
      return 'joined UFC Picks Tracker';

    case 'streak_milestone':
      return `hit a ${metadata.streak}-pick winning streak! 🔥`;

    case 'accuracy_milestone':
      return `reached ${metadata.accuracy}% accuracy! 🎯`;

    case 'followed_user':
      return `started following @${target_username}`;

    case 'event_winner':
      return `was the top predictor at ${event_name}! 🏆`;

    default:
      return 'had some activity';
  }
}

// Helper to get activity icon
export function getActivityIcon(type: ActivityType): string {
  switch (type) {
    case 'made_picks':
      return '✅';
    case 'picks_graded':
      return '📊';
    case 'new_user':
      return '👋';
    case 'streak_milestone':
      return '🔥';
    case 'accuracy_milestone':
      return '🎯';
    case 'followed_user':
      return '👥';
    case 'event_winner':
      return '🏆';
    default:
      return '📌';
  }
}

/**
 * Hook to check for new activities since a timestamp
 * Used for "X new posts" indicator
 */
export function useNewActivityCount(sinceTimestamp: string | null) {
  return useQuery({
    queryKey: feedKeys.newCount(sinceTimestamp || ''),
    queryFn: async (): Promise<number> => {
      if (!sinceTimestamp) return 0;

      const { data, error } = await supabase.rpc('get_new_activity_count', {
        since_timestamp: sinceTimestamp,
      });

      if (error) {
        logger.error('Failed to get new activity count', error);
        return 0;
      }

      return data || 0;
    },
    enabled: !!sinceTimestamp,
    refetchInterval: 30000, // Check every 30 seconds
  });
}
