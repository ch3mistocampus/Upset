/**
 * useSuggestions Hook
 *
 * Get user suggestions based on:
 * - Mutual follows (friends of friends)
 * - Top predictors by accuracy
 * - Popular users
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export const suggestionKeys = {
  all: ['suggestions'] as const,
  users: (limit?: number) => [...suggestionKeys.all, 'users', limit] as const,
};

export interface UserSuggestion {
  user_id: string;
  username: string;
  avatar_url: string | null;
  accuracy_pct: number;
  total_picks: number;
  mutual_follows: number;
  reason: 'mutual_follows' | 'top_predictor' | 'popular';
}

/**
 * Get user suggestions for "People you may want to follow"
 */
export function useUserSuggestions(limit: number = 10) {
  const { user } = useAuth();

  return useQuery({
    queryKey: suggestionKeys.users(limit),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_suggestions', {
        limit_count: limit,
      });

      if (error) throw error;
      return data as UserSuggestion[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Get reason text for suggestion
 */
export function getSuggestionReasonText(suggestion: UserSuggestion): string {
  switch (suggestion.reason) {
    case 'mutual_follows':
      return suggestion.mutual_follows === 1
        ? '1 mutual follow'
        : `${suggestion.mutual_follows} mutual follows`;
    case 'top_predictor':
      return `${suggestion.accuracy_pct.toFixed(0)}% accuracy`;
    case 'popular':
      return 'Popular predictor';
    default:
      return '';
  }
}
