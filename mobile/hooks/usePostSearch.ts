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
 * Falls back to direct table query if search_posts RPC doesn't exist
 */
export function useSearchPosts(query: string, sortBy: SearchSortBy = 'relevance') {
  return useInfiniteQuery({
    queryKey: searchKeys.search(query, sortBy),
    queryFn: async ({ pageParam = 0 }): Promise<SearchPost[]> => {
      if (!query || query.trim().length < 2) {
        return [];
      }

      const searchTerm = query.trim();
      logger.breadcrumb('Searching posts', 'search', { query: searchTerm, sortBy, offset: pageParam });

      // Try the RPC function first
      const { data, error } = await supabase.rpc('search_posts', {
        p_query: searchTerm,
        p_limit: 20,
        p_offset: pageParam,
        p_sort_by: sortBy,
      });

      if (error) {
        // Function doesn't exist - fall back to direct query
        if (error.code === 'PGRST202') {
          logger.debug('search_posts not available, using direct query');

          // Build base query with ilike search on title and body
          let fallbackQuery = supabase
            .from('posts')
            .select(`
              *,
              profiles:user_id (
                username,
                display_name,
                avatar_url
              )
            `)
            .or(`title.ilike.%${searchTerm}%,body.ilike.%${searchTerm}%`)
            .eq('is_public', true)
            .range(pageParam, pageParam + 19);

          // Apply sorting
          if (sortBy === 'recent') {
            fallbackQuery = fallbackQuery.order('created_at', { ascending: false });
          } else if (sortBy === 'popular') {
            fallbackQuery = fallbackQuery.order('like_count', { ascending: false });
          } else {
            // relevance - order by like_count then created_at
            fallbackQuery = fallbackQuery
              .order('like_count', { ascending: false })
              .order('created_at', { ascending: false });
          }

          const { data: fallbackData, error: fallbackError } = await fallbackQuery;

          if (fallbackError) {
            logger.error('Failed to search posts (fallback)', fallbackError);
            return [];
          }

          // Transform to match expected Post shape
          return (fallbackData || []).map((p: any) => ({
            ...p,
            author_username: p.profiles?.username || null,
            author_display_name: p.profiles?.display_name || null,
            author_avatar_url: p.profiles?.avatar_url || null,
            images: [],
            user_has_liked: false,
            user_has_bookmarked: false,
          })) as SearchPost[];
        }

        logger.error('Failed to search posts', error);
        return [];
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
 * Note: Falls back to recent popular posts if get_trending_posts function doesn't exist
 */
export function useTrendingPosts(hours = 24) {
  return useQuery({
    queryKey: searchKeys.trending(hours),
    queryFn: async (): Promise<TrendingPost[]> => {
      logger.breadcrumb('Fetching trending posts', 'search', { hours });

      // Try the trending posts function first
      const { data, error } = await supabase.rpc('get_trending_posts', {
        p_hours: hours,
        p_limit: 10,
      });

      if (error) {
        // Function doesn't exist - fall back to recent popular posts
        if (error.code === 'PGRST202') {
          logger.debug('get_trending_posts not available, falling back to recent posts');
          const { data: fallbackData } = await supabase
            .from('posts')
            .select('*')
            .order('like_count', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(10);
          return (fallbackData || []).map((p) => ({ ...p, trending_score: p.like_count })) as TrendingPost[];
        }
        logger.error('Failed to fetch trending posts', error);
        return [];
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
