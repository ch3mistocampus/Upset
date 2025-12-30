/**
 * Privacy Settings Hook
 * Sprint 2: Social Features
 *
 * Handles:
 * - Fetching user privacy settings
 * - Updating privacy settings
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import type { PrivacySettings, PrivacySettingsUpdate } from '../types/social';

export function usePrivacy() {
  const queryClient = useQueryClient();

  // Fetch privacy settings
  const {
    data: privacySettings,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['privacySettings'],
    queryFn: async (): Promise<PrivacySettings | null> => {
      logger.breadcrumb('Fetching privacy settings', 'privacy');

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('privacy_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // If privacy settings don't exist, create default ones
        if (error.code === 'PGRST116') {
          logger.info('Creating default privacy settings');

          const { data: newSettings, error: insertError } = await supabase
            .from('privacy_settings')
            .insert({
              user_id: user.id,
              picks_visibility: 'public',
              profile_visibility: 'public',
              stats_visibility: 'public',
            })
            .select()
            .single();

          if (insertError) {
            logger.error('Failed to create privacy settings', insertError);
            throw insertError;
          }

          logger.info('Default privacy settings created');
          return newSettings as PrivacySettings;
        }

        logger.error('Failed to fetch privacy settings', error);
        throw error;
      }

      logger.debug('Privacy settings fetched');
      return data as PrivacySettings;
    },
  });

  // Update privacy settings
  const updatePrivacySettings = useMutation({
    mutationFn: async (updates: PrivacySettingsUpdate) => {
      logger.breadcrumb('Updating privacy settings', 'privacy', updates);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase
        .from('privacy_settings')
        .update(updates)
        .eq('user_id', user.id);

      if (error) {
        logger.error('Failed to update privacy settings', error, updates);
        throw error;
      }

      logger.info('Privacy settings updated', updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privacySettings'] });
    },
  });

  return {
    // Data
    privacySettings,

    // Loading
    isLoading,
    updateLoading: updatePrivacySettings.isPending,

    // Error
    error,

    // Mutations
    updatePrivacySettings: updatePrivacySettings.mutateAsync,

    // Refetch
    refetch,
  };
}
