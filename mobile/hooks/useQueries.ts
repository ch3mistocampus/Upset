/**
 * React Query hooks for data fetching
 * Supports both authenticated and guest modes
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import {
  Event,
  Bout,
  Pick,
  UserStats,
  BoutWithPick,
  PickInsert,
  Result,
} from '../types/database';
import { useAuth } from './useAuth';
import { useGuestPicks, GuestPick } from './useGuestPicks';

// ============================================================================
// EVENTS
// ============================================================================

/**
 * Get the next upcoming event
 */
export function useNextEvent() {
  return useQuery({
    queryKey: ['events', 'next'],
    queryFn: async (): Promise<Event | null> => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .neq('status', 'completed')
        .order('event_date', { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get recent completed events
 */
export function useRecentEvents(limit = 5) {
  return useQuery({
    queryKey: ['events', 'recent', limit],
    queryFn: async (): Promise<Event[]> => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'completed')
        .order('event_date', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get all upcoming events (for picks list)
 */
export function useUpcomingEvents() {
  return useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: async (): Promise<Event[]> => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .in('status', ['upcoming', 'live'])
        .order('event_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get a specific event by ID
 */
export function useEvent(eventId: string | null) {
  return useQuery({
    queryKey: ['events', eventId],
    queryFn: async (): Promise<Event | null> => {
      if (!eventId) return null;

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!eventId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get bouts count for an event
 */
export function useBoutsCount(eventId: string | null) {
  return useQuery({
    queryKey: ['bouts', 'count', eventId],
    queryFn: async (): Promise<number> => {
      if (!eventId) return 0;

      const { count, error } = await supabase
        .from('bouts')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!eventId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get user's picks count for an event
 * Supports both authenticated and guest modes
 */
export function useUserPicksCount(eventId: string | null, userId: string | null) {
  const { isGuest } = useAuth();
  const { getGuestPicksForEvent, isLoaded } = useGuestPicks();

  return useQuery({
    queryKey: ['picks', 'count', eventId, isGuest ? 'guest' : userId],
    queryFn: async (): Promise<number> => {
      if (!eventId) return 0;

      // Guest mode: count local picks
      if (isGuest) {
        const guestPicks = getGuestPicksForEvent(eventId);
        return guestPicks.length;
      }

      // Authenticated mode: count from Supabase
      if (!userId) return 0;

      const { count, error } = await supabase
        .from('picks')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('user_id', userId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!eventId && (isGuest ? isLoaded : !!userId),
    staleTime: 1000 * 30, // 30 seconds
  });
}

// ============================================================================
// BOUTS
// ============================================================================

/**
 * Get bouts for a specific event with user's picks and results
 * Supports both authenticated and guest modes
 * @param eventId - The event ID
 * @param userId - The user ID (null if not authenticated)
 * @param isGuest - Whether user is in guest mode (passed explicitly to avoid stale closures)
 */
export function useBoutsForEvent(eventId: string | null, userId: string | null, isGuest: boolean = false) {
  const { getGuestPicksForEvent, isLoaded } = useGuestPicks();

  return useQuery({
    queryKey: ['bouts', eventId, isGuest ? 'guest' : userId],
    queryFn: async (): Promise<BoutWithPick[]> => {
      if (!eventId) return [];

      // Get bouts (always from Supabase - the fight data)
      const { data: bouts, error: boutsError } = await supabase
        .from('bouts')
        .select('*')
        .eq('event_id', eventId)
        .order('order_index', { ascending: true });

      if (boutsError) throw boutsError;
      if (!bouts) return [];

      // Get results for all bouts (always from Supabase)
      const boutIds = bouts.map((b) => b.id);
      const { data: results, error: resultsError } = await supabase
        .from('results')
        .select('*')
        .in('bout_id', boutIds);

      if (resultsError) throw resultsError;

      // Get picks based on mode
      let picks: Pick[] = [];

      if (isGuest) {
        // Guest mode: get local picks and convert to Pick format
        const guestPicks = getGuestPicksForEvent(eventId);
        picks = guestPicks.map((gp) => guestPickToPick(gp));
      } else if (userId) {
        // Authenticated mode: get from Supabase
        const { data: picksData, error: picksError } = await supabase
          .from('picks')
          .select('*')
          .eq('user_id', userId)
          .in('bout_id', boutIds);

        if (picksError) throw picksError;
        picks = picksData || [];
      }

      // Combine data
      const resultsMap = new Map(results?.map((r) => [r.bout_id, r]) || []);
      const picksMap = new Map(picks.map((p) => [p.bout_id, p]));

      return bouts.map((bout) => ({
        ...bout,
        result: resultsMap.get(bout.id) || null,
        pick: picksMap.get(bout.id) || null,
      }));
    },
    enabled: !!eventId && (isGuest ? isLoaded : true),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Convert a GuestPick to the Pick type for UI consistency
 */
function guestPickToPick(guestPick: GuestPick): Pick {
  return {
    id: guestPick.id,
    user_id: 'guest',
    event_id: guestPick.event_id,
    bout_id: guestPick.bout_id,
    picked_corner: guestPick.picked_corner,
    picked_method: null,
    picked_round: null,
    status: 'active',
    locked_at: null,
    score: null,
    created_at: guestPick.created_at,
    updated_at: guestPick.updated_at,
  };
}

// ============================================================================
// PICKS
// ============================================================================

/**
 * Get user's picks for a specific event
 */
export function useUserPicksForEvent(eventId: string | null, userId: string | null) {
  return useQuery({
    queryKey: ['picks', eventId, userId],
    queryFn: async (): Promise<Pick[]> => {
      if (!eventId || !userId) return [];

      const { data, error } = await supabase
        .from('picks')
        .select('*')
        .eq('user_id', userId)
        .eq('event_id', eventId);

      if (error) throw error;

      return data || [];
    },
    enabled: !!eventId && !!userId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Input type for upsert pick mutation
 * Includes isGuest flag to avoid stale closure issues
 */
interface UpsertPickInput {
  pick: PickInsert;
  isGuest: boolean;
}

/**
 * Upsert a pick (create or update)
 * Supports both authenticated and guest modes
 */
export function useUpsertPick() {
  const queryClient = useQueryClient();
  const { saveGuestPick, generatePickId } = useGuestPicks();

  return useMutation({
    mutationFn: async ({ pick, isGuest }: UpsertPickInput): Promise<Pick> => {
      if (isGuest) {
        // Guest mode: save to local storage
        const guestPick: GuestPick = {
          id: generatePickId(),
          event_id: pick.event_id,
          bout_id: pick.bout_id,
          picked_corner: pick.picked_corner,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await saveGuestPick(guestPick);
        return guestPickToPick(guestPick);
      }

      // Authenticated mode: save to Supabase
      const { data, error } = await supabase
        .from('picks')
        .upsert(pick, {
          onConflict: 'user_id,bout_id',
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    // Optimistic update - update UI immediately before server responds
    onMutate: async ({ pick: newPick, isGuest }: UpsertPickInput) => {
      const cacheKey = isGuest ? 'guest' : newPick.user_id;

      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['bouts', newPick.event_id, cacheKey] });

      // Snapshot the previous value
      const previousBouts = queryClient.getQueryData<BoutWithPick[]>(['bouts', newPick.event_id, cacheKey]);

      // Optimistically update the cache
      if (previousBouts) {
        queryClient.setQueryData<BoutWithPick[]>(
          ['bouts', newPick.event_id, cacheKey],
          previousBouts.map((bout) =>
            bout.id === newPick.bout_id
              ? {
                  ...bout,
                  pick: {
                    id: bout.pick?.id || 'temp-id',
                    user_id: isGuest ? 'guest' : newPick.user_id,
                    event_id: newPick.event_id,
                    bout_id: newPick.bout_id,
                    picked_corner: newPick.picked_corner,
                    picked_method: null,
                    picked_round: null,
                    status: 'active' as const,
                    locked_at: null,
                    score: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                }
              : bout
          )
        );
      }

      // Return context with snapshot
      return { previousBouts, cacheKey, isGuest };
    },
    onError: (err, { pick: newPick }, context) => {
      // Rollback to previous value on error
      if (context?.previousBouts) {
        queryClient.setQueryData(['bouts', newPick.event_id, context.cacheKey], context.previousBouts);
      }
    },
    onSuccess: (data, { isGuest }) => {
      const cacheKey = isGuest ? 'guest' : data.user_id;
      // Only invalidate picks count - optimistic update already handles bouts cache
      // Don't invalidate bouts query as it can cause race conditions with guest state updates
      queryClient.invalidateQueries({ queryKey: ['picks', 'count', data.event_id, cacheKey] });
    },
  });
}

/**
 * Input type for delete pick mutation
 * Includes isGuest flag to avoid stale closure issues
 */
interface DeletePickInput {
  boutId: string;
  eventId: string;
  userId: string | null;
  isGuest: boolean;
}

/**
 * Delete a pick
 */
export function useDeletePick() {
  const queryClient = useQueryClient();
  const { deleteGuestPick } = useGuestPicks();

  return useMutation({
    mutationFn: async ({ boutId, eventId, userId, isGuest }: DeletePickInput) => {
      if (isGuest) {
        await deleteGuestPick(boutId);
        return { eventId, boutId, userId, isGuest };
      }

      if (!userId) throw new Error('User ID required for delete');

      // Delete by user_id + bout_id
      const { error } = await supabase
        .from('picks')
        .delete()
        .eq('user_id', userId)
        .eq('bout_id', boutId);

      if (error) throw error;

      return { eventId, boutId, userId, isGuest };
    },
    onMutate: async ({ boutId, eventId, userId, isGuest }: DeletePickInput) => {
      // Cache key must match useBoutsForEvent exactly: ['bouts', eventId, isGuest ? 'guest' : userId]
      const cacheKey = isGuest ? 'guest' : userId;

      await queryClient.cancelQueries({ queryKey: ['bouts', eventId, cacheKey] });

      const previousBouts = queryClient.getQueryData<BoutWithPick[]>(['bouts', eventId, cacheKey]);

      if (previousBouts) {
        const updatedBouts = previousBouts.map((bout) =>
          bout.id === boutId ? { ...bout, pick: null } : bout
        );
        queryClient.setQueryData<BoutWithPick[]>(
          ['bouts', eventId, cacheKey],
          updatedBouts
        );
      }

      return { previousBouts, cacheKey, eventId };
    },
    onError: (err, variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousBouts) {
        queryClient.setQueryData(['bouts', context.eventId, context.cacheKey], context.previousBouts);
      }
    },
    onSuccess: (data) => {
      if (data) {
        const cacheKey = data.isGuest ? 'guest' : data.userId;
        // Only invalidate picks count - don't refetch bouts as optimistic update handles UI
        queryClient.invalidateQueries({ queryKey: ['picks', 'count', data.eventId, cacheKey] });
      }
    },
  });
}

// ============================================================================
// USER STATS
// ============================================================================

/**
 * Get user statistics
 */
export function useUserStats(userId: string | null) {
  return useQuery({
    queryKey: ['user_stats', userId],
    queryFn: async (): Promise<UserStats | null> => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get picks summary for recent events
 */
export function useRecentPicksSummary(userId: string | null, limit = 5) {
  return useQuery({
    queryKey: ['picks', 'recent', userId, limit],
    queryFn: async () => {
      if (!userId) return [];

      console.log('[DEBUG] Fetching recent picks summary for user:', userId);

      // Get recent events
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'completed')
        .order('event_date', { ascending: false })
        .limit(limit);

      if (eventsError) {
        console.log('[DEBUG] Events error:', eventsError);
        throw eventsError;
      }
      console.log('[DEBUG] Completed events found:', events?.length);
      if (!events || events.length === 0) return [];

      const eventIds = events.map((e) => e.id);

      // Get picks for these events
      const { data: picks, error: picksError } = await supabase
        .from('picks')
        .select('*')
        .eq('user_id', userId)
        .in('event_id', eventIds)
        .eq('status', 'graded');

      if (picksError) {
        console.log('[DEBUG] Picks error:', picksError);
        throw picksError;
      }
      console.log('[DEBUG] User picks found:', picks?.length);

      // Group by event
      const picksByEvent = new Map<string, Pick[]>();
      (picks || []).forEach((pick) => {
        if (!picksByEvent.has(pick.event_id)) {
          picksByEvent.set(pick.event_id, []);
        }
        picksByEvent.get(pick.event_id)!.push(pick);
      });

      // Calculate summary for each event
      return events.map((event) => {
        const eventPicks = picksByEvent.get(event.id) || [];
        const correct = eventPicks.filter((p) => p.score === 1).length;
        const total = eventPicks.length;

        return {
          event,
          correct,
          total,
        };
      });
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================================================
// UTILS
// ============================================================================

/**
 * Check if an event is locked (picks can't be changed)
 */
export function isEventLocked(event: Event | null): boolean {
  if (!event) return true;
  return new Date(event.event_date) <= new Date();
}

/**
 * Get time until event starts (for countdown)
 */
export function getTimeUntilEvent(event: Event | null): number {
  if (!event) return 0;
  return new Date(event.event_date).getTime() - Date.now();
}
