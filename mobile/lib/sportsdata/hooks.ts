/**
 * React Query Hooks for SportsData.io MMA API
 *
 * These hooks provide cached, typed access to the SportsData.io API.
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import {
  sportsDataClient,
  getCurrentSeason,
  isUnauthorizedError,
} from './client';
import {
  SportsDataLeague,
  SportsDataEvent,
  SportsDataEventWithFights,
  SportsDataFighterBasic,
  SportsDataFighter,
  SportsDataFightWithStats,
  SportsDataEventOdds,
} from './types';

// ============================================================================
// Query Key Factory
// ============================================================================

export const sportsDataKeys = {
  all: ['sportsdata'] as const,

  // Leagues
  leagues: () => [...sportsDataKeys.all, 'leagues'] as const,

  // Schedule
  schedule: (league: string, season: number) =>
    [...sportsDataKeys.all, 'schedule', league, season] as const,

  // Events
  events: () => [...sportsDataKeys.all, 'events'] as const,
  event: (eventId: number) => [...sportsDataKeys.events(), eventId] as const,

  // Fighters
  fighters: () => [...sportsDataKeys.all, 'fighters'] as const,
  fightersBasic: () => [...sportsDataKeys.fighters(), 'basic'] as const,
  fighter: (fighterId: number) => [...sportsDataKeys.fighters(), fighterId] as const,

  // Fight Stats
  fights: () => [...sportsDataKeys.all, 'fights'] as const,
  fightStats: (fightId: number) => [...sportsDataKeys.fights(), fightId, 'stats'] as const,

  // Odds
  odds: () => [...sportsDataKeys.all, 'odds'] as const,
  eventOdds: (eventId: number) => [...sportsDataKeys.odds(), eventId] as const,
};

// ============================================================================
// Default Query Options
// ============================================================================

const defaultQueryOptions = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
  retry: (failureCount: number, error: unknown) => {
    // Don't retry on unauthorized errors (need paid subscription)
    if (isUnauthorizedError(error)) return false;
    return failureCount < 2;
  },
};

// ============================================================================
// League Hooks
// ============================================================================

export function useSportsDataLeagues(
  options?: Partial<UseQueryOptions<SportsDataLeague[], Error>>
) {
  return useQuery({
    queryKey: sportsDataKeys.leagues(),
    queryFn: sportsDataClient.getLeagues,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - leagues rarely change
    ...options,
  });
}

// ============================================================================
// Schedule Hooks
// ============================================================================

export function useSportsDataSchedule(
  season?: number,
  options?: Partial<UseQueryOptions<SportsDataEvent[], Error>>
) {
  const year = season || getCurrentSeason();

  return useQuery({
    queryKey: sportsDataKeys.schedule('UFC', year),
    queryFn: () => sportsDataClient.getSchedule('UFC', year),
    ...defaultQueryOptions,
    staleTime: 60 * 60 * 1000, // 1 hour for schedule
    ...options,
  });
}

/**
 * Get upcoming events from the schedule
 */
export function useUpcomingSportsDataEvents(
  limit: number = 10,
  options?: Partial<UseQueryOptions<SportsDataEvent[], Error>>
) {
  return useQuery({
    queryKey: [...sportsDataKeys.schedule('UFC', getCurrentSeason()), 'upcoming', limit],
    queryFn: async () => {
      const schedule = await sportsDataClient.getSchedule('UFC', getCurrentSeason());
      const now = new Date();

      return schedule
        .filter(event => new Date(event.DateTime) > now && event.Active)
        .sort((a, b) => new Date(a.DateTime).getTime() - new Date(b.DateTime).getTime())
        .slice(0, limit);
    },
    ...defaultQueryOptions,
    ...options,
  });
}

// ============================================================================
// Event Hooks
// ============================================================================

export function useSportsDataEvent(
  eventId: number | undefined,
  options?: Partial<UseQueryOptions<SportsDataEventWithFights, Error>>
) {
  return useQuery({
    queryKey: sportsDataKeys.event(eventId!),
    queryFn: () => sportsDataClient.getEvent(eventId!),
    enabled: eventId !== undefined,
    ...defaultQueryOptions,
    ...options,
  });
}

// ============================================================================
// Fighter Hooks
// ============================================================================

/**
 * Get all fighters (basic info)
 * This works with the trial API key
 */
export function useSportsDataFightersBasic(
  options?: Partial<UseQueryOptions<SportsDataFighterBasic[], Error>>
) {
  return useQuery({
    queryKey: sportsDataKeys.fightersBasic(),
    queryFn: sportsDataClient.getFightersBasic,
    ...defaultQueryOptions,
    staleTime: 60 * 60 * 1000, // 1 hour - fighter roster doesn't change often
    ...options,
  });
}

/**
 * Get full fighter profiles (requires paid subscription)
 */
export function useSportsDataFighters(
  options?: Partial<UseQueryOptions<SportsDataFighter[], Error>>
) {
  return useQuery({
    queryKey: sportsDataKeys.fighters(),
    queryFn: sportsDataClient.getFighters,
    ...defaultQueryOptions,
    ...options,
  });
}

/**
 * Get individual fighter (requires paid subscription)
 */
export function useSportsDataFighter(
  fighterId: number | undefined,
  options?: Partial<UseQueryOptions<SportsDataFighter, Error>>
) {
  return useQuery({
    queryKey: sportsDataKeys.fighter(fighterId!),
    queryFn: () => sportsDataClient.getFighter(fighterId!),
    enabled: fighterId !== undefined,
    ...defaultQueryOptions,
    ...options,
  });
}

/**
 * Search fighters by name
 */
export function useSportsDataFighterSearch(
  searchTerm: string,
  options?: Partial<UseQueryOptions<SportsDataFighterBasic[], Error>>
) {
  return useQuery({
    queryKey: [...sportsDataKeys.fightersBasic(), 'search', searchTerm],
    queryFn: async () => {
      const fighters = await sportsDataClient.getFightersBasic();
      const term = searchTerm.toLowerCase().trim();

      if (!term) return [];

      return fighters.filter(fighter => {
        const fullName = `${fighter.FirstName} ${fighter.LastName}`.toLowerCase();
        const nickname = fighter.Nickname?.toLowerCase() || '';
        return fullName.includes(term) || nickname.includes(term);
      });
    },
    enabled: searchTerm.length >= 2,
    ...defaultQueryOptions,
    ...options,
  });
}

// ============================================================================
// Fight Stats Hooks
// ============================================================================

export function useSportsDataFightStats(
  fightId: number | undefined,
  options?: Partial<UseQueryOptions<SportsDataFightWithStats, Error>>
) {
  return useQuery({
    queryKey: sportsDataKeys.fightStats(fightId!),
    queryFn: () => sportsDataClient.getFightStats(fightId!),
    enabled: fightId !== undefined,
    ...defaultQueryOptions,
    ...options,
  });
}

// ============================================================================
// Odds Hooks (require paid subscription)
// ============================================================================

export function useSportsDataEventOdds(
  eventId: number | undefined,
  options?: Partial<UseQueryOptions<SportsDataEventOdds, Error>>
) {
  return useQuery({
    queryKey: sportsDataKeys.eventOdds(eventId!),
    queryFn: () => sportsDataClient.getEventOdds(eventId!),
    enabled: eventId !== undefined,
    ...defaultQueryOptions,
    staleTime: 30 * 1000, // 30 seconds for odds - they change frequently
    ...options,
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Check if SportsData.io API is accessible with current key
 */
export function useSportsDataHealth() {
  return useQuery({
    queryKey: [...sportsDataKeys.all, 'health'],
    queryFn: async () => {
      try {
        await sportsDataClient.getLeagues();
        return { connected: true, error: null };
      } catch (error) {
        return {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          requiresSubscription: isUnauthorizedError(error),
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}
