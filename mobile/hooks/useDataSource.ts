/**
 * Data Source Management Hooks
 * For admin control of which data source is used (UFCStats scraper vs MMA API)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ============================================================================
// Types
// ============================================================================

export type DataSourceType = 'ufcstats' | 'mma-api';

export interface DataSourceSettings {
  primary_data_source: DataSourceType;
  fallback_enabled: boolean;
  events_cache_hours: number;
  fighters_cache_hours: number;
  last_events_sync_at: string | null;
  last_fighters_sync_at: string | null;
  last_results_sync_at: string | null;
}

export interface ApiUsageSummary {
  month: string;
  by_provider: Record<string, number> | null;
  total_requests: number;
  mma_api_limit: number;
  mma_api_used: number;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Get current data source settings
 */
export function useDataSourceSettings() {
  return useQuery({
    queryKey: ['data-source-settings'],
    queryFn: async (): Promise<DataSourceSettings | null> => {
      const { data, error } = await supabase.rpc('get_data_source_settings');

      if (error) {
        console.error('Error fetching data source settings:', error);
        throw error;
      }

      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Update the primary data source
 */
export function useSetDataSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (source: DataSourceType) => {
      const { data, error } = await supabase.rpc('set_primary_data_source', {
        p_source: source,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-source-settings'] });
    },
  });
}

/**
 * Get API usage summary for current month
 */
export function useApiUsage() {
  return useQuery({
    queryKey: ['api-usage-summary'],
    queryFn: async (): Promise<ApiUsageSummary | null> => {
      const { data, error } = await supabase.rpc('get_api_usage_summary');

      if (error) {
        console.error('Error fetching API usage:', error);
        throw error;
      }

      return data;
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Check if a sync operation should run
 */
export function useShouldSync(syncType: 'events' | 'fighters' | 'results') {
  return useQuery({
    queryKey: ['should-sync', syncType],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.rpc('should_sync', {
        p_sync_type: syncType,
      });

      if (error) {
        console.error('Error checking sync status:', error);
        return true; // Default to syncing on error
      }

      return data ?? true;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format time since last sync
 */
export function formatTimeSinceSync(lastSync: string | null): string {
  if (!lastSync) return 'Never';

  const syncDate = new Date(lastSync);
  const now = new Date();
  const diffMs = now.getTime() - syncDate.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

/**
 * Get data source display info
 */
export function getDataSourceInfo(source: DataSourceType) {
  switch (source) {
    case 'mma-api':
      return {
        name: 'MMA API (RapidAPI)',
        description: 'Live data from ESPN via RapidAPI',
        icon: 'cloud-outline' as const,
        color: '#3B82F6',
        limitInfo: '80 requests/month (free tier)',
      };
    case 'ufcstats':
    default:
      return {
        name: 'UFCStats Scraper',
        description: 'Data scraped from UFCStats.com',
        icon: 'code-slash-outline' as const,
        color: '#10B981',
        limitInfo: 'Unlimited (but less reliable)',
      };
  }
}
