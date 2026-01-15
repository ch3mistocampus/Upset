/**
 * Data Source Management Hooks
 * For monitoring UFCStats data sync status
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ============================================================================
// Types
// ============================================================================

export interface DataSourceSettings {
  primary_data_source: 'ufcstats';
  fallback_enabled: boolean;
  events_cache_hours: number;
  fighters_cache_hours: number;
  last_events_sync_at: string | null;
  last_fighters_sync_at: string | null;
  last_results_sync_at: string | null;
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
