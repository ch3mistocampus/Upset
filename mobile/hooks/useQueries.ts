/**
 * React Query hooks for data fetching
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

// ============================================================================
// BOUTS
// ============================================================================

/**
 * Get bouts for a specific event with user's picks and results
 */
export function useBoutsForEvent(eventId: string | null, userId: string | null) {
  return useQuery({
    queryKey: ['bouts', eventId, userId],
    queryFn: async (): Promise<BoutWithPick[]> => {
      if (!eventId) return [];

      // Get bouts
      const { data: bouts, error: boutsError } = await supabase
        .from('bouts')
        .select('*')
        .eq('event_id', eventId)
        .order('order_index', { ascending: true });

      if (boutsError) throw boutsError;
      if (!bouts) return [];

      // Get results for all bouts
      const boutIds = bouts.map((b) => b.id);
      const { data: results, error: resultsError } = await supabase
        .from('results')
        .select('*')
        .in('bout_id', boutIds);

      if (resultsError) throw resultsError;

      // Get user's picks if logged in
      let picks: Pick[] = [];
      if (userId) {
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
    enabled: !!eventId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
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
 * Upsert a pick (create or update)
 */
export function useUpsertPick() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pick: PickInsert) => {
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
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['picks', data.event_id] });
      queryClient.invalidateQueries({ queryKey: ['bouts', data.event_id] });
    },
  });
}

/**
 * Delete a pick
 */
export function useDeletePick() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pickId: string) => {
      const { error } = await supabase.from('picks').delete().eq('id', pickId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate picks queries
      queryClient.invalidateQueries({ queryKey: ['picks'] });
      queryClient.invalidateQueries({ queryKey: ['bouts'] });
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

      // Get recent events
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'completed')
        .order('event_date', { ascending: false })
        .limit(limit);

      if (eventsError) throw eventsError;
      if (!events || events.length === 0) return [];

      const eventIds = events.map((e) => e.id);

      // Get picks for these events
      const { data: picks, error: picksError } = await supabase
        .from('picks')
        .select('*')
        .eq('user_id', userId)
        .in('event_id', eventIds)
        .eq('status', 'graded');

      if (picksError) throw picksError;

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
