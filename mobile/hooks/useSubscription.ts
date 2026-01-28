/**
 * Central premium gating hook
 * Manages subscription status, usage tracking, and paywall triggers
 *
 * When Superwall is not configured (no API key), the hook operates in
 * "free mode" - all premium features are unlocked and paywall triggers are no-ops.
 */

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { FREE_LIMITS, SUPERWALL_API_KEYS } from '../lib/superwall';

// Check if Superwall is configured
const SUPERWALL_ENABLED = Boolean(SUPERWALL_API_KEYS.ios);

// Conditionally import Superwall hooks only when enabled
// This prevents crashes when SuperwallProvider isn't mounted
let useUser: any = () => ({
  subscriptionStatus: null,
  setSubscriptionStatus: () => {},
  identify: () => {},
  signOut: () => {},
});
let usePlacement: any = () => ({
  registerPlacement: async () => {},
});

if (SUPERWALL_ENABLED) {
  try {
    const superwall = require('expo-superwall');
    useUser = superwall.useUser;
    usePlacement = superwall.usePlacement;
  } catch {
    // Superwall not available
  }
}

interface UsageData {
  events_picked_count: number;
  posts_created_count: number;
  events_picked_ids: string[];
}

interface ShowPaywallOptions {
  params?: Record<string, string>;
}

export function useSubscription() {
  const { user, isGuest } = useAuth();
  const queryClient = useQueryClient();
  const { subscriptionStatus, setSubscriptionStatus, identify, signOut: swSignOut } = useUser();

  // When Superwall is not configured, treat all users as Pro (no restrictions)
  // This allows the app to function normally until monetization is set up
  const isPro = !SUPERWALL_ENABLED || subscriptionStatus?.status === 'ACTIVE';

  // Fetch usage data from DB (only for non-Pro authenticated users)
  const { data: usage } = useQuery<UsageData | null>({
    queryKey: ['usage_tracking', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('usage_tracking')
        .select('events_picked_count, posts_created_count, events_picked_ids')
        .eq('user_id', user.id)
        .single();
      if (error) {
        // Row might not exist yet (new user before trigger fires)
        if (error.code === 'PGRST116') return { events_picked_count: 0, posts_created_count: 0, events_picked_ids: [] };
        throw error;
      }
      return data as UsageData;
    },
    enabled: !!user?.id && !isGuest && !isPro,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Placement hook for triggering paywalls
  const { registerPlacement } = usePlacement({
    onDismiss: (_info, result) => {
      if (result.type === 'purchased' || result.type === 'restored') {
        queryClient.invalidateQueries({ queryKey: ['usage_tracking'] });
      }
    },
  });

  const canPickEvent = useCallback(
    (eventId: string): boolean => {
      if (isPro || isGuest) return true;
      if (!usage) return true; // Loading state - allow optimistically
      // Already counted this event
      if (usage.events_picked_ids.includes(eventId)) return true;
      return usage.events_picked_count < FREE_LIMITS.EVENTS_PICKED;
    },
    [isPro, isGuest, usage]
  );

  const canCreatePost = useMemo(() => {
    if (isPro || isGuest) return true;
    if (!usage) return true;
    return usage.posts_created_count < FREE_LIMITS.POSTS_CREATED;
  }, [isPro, isGuest, usage]);

  const canAttachImages = isPro;

  const canSeeRank = isPro;

  const showPaywall = useCallback(
    async (placement: string, onFeature: () => void, options?: ShowPaywallOptions) => {
      await registerPlacement({
        placement,
        params: options?.params,
        feature: onFeature,
      });
    },
    [registerPlacement]
  );

  const recordEventPick = useCallback(
    async (eventId: string) => {
      if (isPro || isGuest || !user?.id) return;
      const { error } = await supabase.rpc('increment_event_usage', { p_event_id: eventId });
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ['usage_tracking', user.id] });
      }
    },
    [isPro, isGuest, user?.id, queryClient]
  );

  const recordPostCreated = useCallback(async () => {
    if (isPro || isGuest || !user?.id) return;
    const { error } = await supabase.rpc('increment_post_usage');
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['usage_tracking', user.id] });
    }
  }, [isPro, isGuest, user?.id, queryClient]);

  const remainingEvents = useMemo(() => {
    if (isPro) return null;
    if (!usage) return null;
    return Math.max(0, FREE_LIMITS.EVENTS_PICKED - usage.events_picked_count);
  }, [isPro, usage]);

  const remainingPosts = useMemo(() => {
    if (isPro) return null;
    if (!usage) return null;
    return Math.max(0, FREE_LIMITS.POSTS_CREATED - usage.posts_created_count);
  }, [isPro, usage]);

  return {
    isPro,
    usage,
    canPickEvent,
    canCreatePost,
    canAttachImages,
    canSeeRank,
    showPaywall,
    recordEventPick,
    recordPostCreated,
    remainingEvents,
    remainingPosts,
    // Expose for SuperwallIdentifier and dev tools
    identify,
    swSignOut,
    setSubscriptionStatus,
  };
}
