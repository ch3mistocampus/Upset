/**
 * Post Search Hook
 *
 * Handles searching posts by title/content and getting trending posts
 */

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { Post } from '../types/posts';

// Query keys
export const searchKeys = {
  all: ['postSearch'] as const,
  search: (query: string, sortBy: string) => [...searchKeys.all, 'search', query, sortBy] as const,
  trending: (hours: number) => [...searchKeys.all, 'trending', hours] as const,
};

export type SearchSortBy = 'relevance' | 'recent' | 'popular';

interface SearchPost extends Post {
  relevance_score?: number;
}

interface TrendingPost extends Post {
  trending_score: number;
}

/**
 * Search posts by query
 */
export function useSearchPosts(query: string, sortBy: SearchSortBy = 'relevance') {
  return useInfiniteQuery({
    queryKey: searchKeys.search(query, sortBy),
    queryFn: async ({ pageParam = 0 }): Promise<SearchPost[]> => {
      if (!query || query.trim().length < 2) {
        return [];
      }

      logger.breadcrumb('Searching posts', 'search', { query, sortBy, offset: pageParam });

      const { data, error } = await supabase.rpc('search_posts', {
        p_query: query.trim(),
        p_limit: 20,
        p_offset: pageParam,
        p_sort_by: sortBy,
      });

      if (error) {
        logger.error('Failed to search posts', error);
        throw error;
      }

      return (data || []) as SearchPost[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 20) return undefined;
      return allPages.length * 20;
    },
    enabled: query.trim().length >= 2,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get trending posts
 */
export function useTrendingPosts(hours = 24) {
  return useQuery({
    queryKey: searchKeys.trending(hours),
    queryFn: async (): Promise<TrendingPost[]> => {
      logger.breadcrumb('Fetching trending posts', 'search', { hours });

      const { data, error } = await supabase.rpc('get_trending_posts', {
        p_hours: hours,
        p_limit: 10,
      });

      if (error) {
        logger.error('Failed to fetch trending posts', error);
        throw error;
      }

      return (data || []) as TrendingPost[];
    },
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Record a post view
 */
export function useRecordPostView() {
  return async (postId: string): Promise<void> => {
    try {
      await supabase.rpc('record_post_view', { p_post_id: postId });
    } catch (error) {
      // Silently fail - view tracking is not critical
      logger.debug('Failed to record post view', { postId });
    }
  };
}
