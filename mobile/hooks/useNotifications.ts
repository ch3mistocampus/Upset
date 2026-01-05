/**
 * Push Notifications Hook
 *
 * Handles:
 * - Registering push tokens
 * - Managing notification preferences
 * - Viewing notification history
 */

import { useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

// Types
export interface NotificationPreferences {
  user_id: string;
  new_follower: boolean;
  picks_graded: boolean;
  event_reminder_24h: boolean;
  event_reminder_1h: boolean;
  friend_activity: boolean;
  weekly_recap: boolean;
  streak_at_risk: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string;
}

export interface NotificationLogItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  sent_at: string;
  read_at: string | null;
  clicked_at: string | null;
}

// Check if Expo notifications are available
let Notifications: typeof import('expo-notifications') | null = null;
try {
  // Dynamic import to avoid crash if not installed
  Notifications = require('expo-notifications');
} catch {
  logger.debug('expo-notifications not installed');
}

/**
 * Handle deep linking from notification data
 */
function getDeepLinkFromNotification(data: Record<string, unknown>): string | null {
  const type = data.type as string;
  const eventId = data.event_id as string | undefined;
  const userId = data.user_id as string | undefined;
  const notificationId = data.notification_id as string | undefined;

  switch (type) {
    case 'picks_graded':
    case 'event_reminder':
      return eventId ? `/event/${eventId}` : null;
    case 'new_follower':
    case 'friend_activity':
      return userId ? `/user/${userId}` : null;
    case 'weekly_recap':
      return '/profile';
    case 'streak_at_risk':
      return '/pick';
    default:
      return null;
  }
}

export function useNotifications() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  // Set up notification response handler (when user taps notification)
  useEffect(() => {
    if (!Notifications) return;

    // Handle notification received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      logger.debug('Notification received', { id: notification.request.identifier });
    });

    // Handle notification tap (deep linking)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data || {};
      logger.info('Notification tapped', { data });

      const deepLink = getDeepLinkFromNotification(data);
      if (deepLink) {
        logger.info('Navigating to deep link', { deepLink });
        router.push(deepLink as any);
      }

      // Mark notification as clicked in the log
      const notificationId = data.notification_id as string | undefined;
      if (notificationId) {
        supabase
          .from('notification_log')
          .update({ clicked_at: new Date().toISOString() })
          .eq('id', notificationId)
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['notificationHistory'] });
          });
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [router, queryClient]);

  // Register push token
  const registerToken = useCallback(async () => {
    if (!Notifications) {
      logger.debug('Notifications not available');
      return null;
    }

    try {
      // Get permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        logger.info('Push notification permission denied');
        return null;
      }

      // Get token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
      });

      const token = tokenData.data;
      logger.info('Got push token', { token: token.substring(0, 20) + '...' });

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        logger.debug('No user, skipping token registration');
        return token;
      }

      // Save token to database
      const { error } = await supabase.from('push_tokens').upsert(
        {
          user_id: user.id,
          token,
          platform: Platform.OS as 'ios' | 'android',
          is_active: true,
          last_used_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,token',
        }
      );

      if (error) {
        logger.error('Failed to save push token', error);
      } else {
        logger.info('Push token registered');
      }

      return token;
    } catch (error) {
      logger.error('Error registering push token', error as Error);
      return null;
    }
  }, []);

  // Unregister token (on logout)
  const unregisterToken = useCallback(async () => {
    if (!Notifications) return;

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      const token = tokenData.data;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from('push_tokens')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('token', token);

        logger.info('Push token unregistered');
      }
    } catch (error) {
      logger.error('Error unregistering push token', error as Error);
    }
  }, []);

  // Fetch notification preferences
  const {
    data: preferences,
    isLoading: preferencesLoading,
    error: preferencesError,
    refetch: refetchPreferences,
  } = useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: async (): Promise<NotificationPreferences | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return null;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        logger.error('Failed to fetch notification preferences', error);
        throw error;
      }

      return data as NotificationPreferences | null;
    },
  });

  // Update notification preferences
  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notification_preferences')
        .upsert(
          {
            user_id: user.id,
            ...updates,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        logger.error('Failed to update notification preferences', error);
        throw error;
      }

      logger.info('Notification preferences updated');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
    },
  });

  // Fetch notification history
  const {
    data: notificationHistory,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['notificationHistory'],
    queryFn: async (): Promise<NotificationLogItem[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return [];

      const { data, error } = await supabase
        .from('notification_log')
        .select('*')
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) {
        logger.error('Failed to fetch notification history', error);
        throw error;
      }

      return (data as NotificationLogItem[]) || [];
    },
  });

  // Mark notification as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notification_log')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        logger.error('Failed to mark notification as read', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationHistory'] });
    },
  });

  // Get unread count
  const unreadCount =
    notificationHistory?.filter((n) => !n.read_at).length || 0;

  return {
    // Token management
    registerToken,
    unregisterToken,

    // Preferences
    preferences,
    preferencesLoading,
    preferencesError,
    updatePreferences: updatePreferences.mutateAsync,
    updatePreferencesLoading: updatePreferences.isPending,
    refetchPreferences,

    // History
    notificationHistory: notificationHistory || [],
    historyLoading,
    refetchHistory,
    markAsRead: markAsRead.mutateAsync,
    unreadCount,

    // Check if notifications are available
    isAvailable: !!Notifications,
  };
}
