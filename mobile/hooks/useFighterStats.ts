/**
 * React Query hooks for UFC Fighter Stats
 */

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import {
  UFCFighter,
  UFCFighterSearchResult,
  FighterProfileAndHistory,
} from '../types/database';

// Default page size for infinite scroll
const PAGE_SIZE = 50;

// ============================================================================
// FIGHTER QUERIES
// ============================================================================

/**
 * Search fighters by name
 */
export function useSearchFighters(query: string, limit = 20) {
  return useQuery({
    queryKey: ['ufc_fighters', 'search', query, limit],
    queryFn: async (): Promise<UFCFighterSearchResult[]> => {
      if (!query || query.trim().length < 2) {
        return [];
      }

      const { data, error } = await supabase.rpc('search_ufc_fighters', {
        p_query: query.trim(),
        p_limit: limit,
      });

      if (error) throw error;

      return data || [];
    },
    enabled: query.trim().length >= 2,
    staleTime: 1000 * 60 * 10, // 10 minutes - fighter data doesn't change often
  });
}

// Cache version - increment to bust cache after schema changes
// v4: December 2025 rankings update
const FIGHTERS_CACHE_VERSION = 4;

/**
 * Get all fighters (paginated) - legacy version
 */
export function useFighters(options: {
  limit?: number;
  offset?: number;
  sortBy?: 'full_name' | 'record_wins' | 'weight_lbs';
  sortOrder?: 'asc' | 'desc';
  weightClass?: string | null;
} = {}) {
  const { limit = 1000, offset = 0, sortBy = 'full_name', sortOrder = 'asc', weightClass = null } = options;

  return useQuery({
    queryKey: ['ufc_fighters', 'list', FIGHTERS_CACHE_VERSION, limit, offset, sortBy, sortOrder, weightClass],
    queryFn: async (): Promise<UFCFighter[]> => {
      let query = supabase
        .from('ufc_fighters')
        .select('*')
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .limit(limit);

      // Filter by weight class on server if specified
      if (weightClass) {
        query = query.eq('weight_class', weightClass);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

interface InfiniteFightersOptions {
  pageSize?: number;
  sortBy?: 'full_name' | 'record_wins' | 'weight_lbs' | 'ranking';
  sortOrder?: 'asc' | 'desc';
  weightClass?: number | null;
  weightTolerance?: number;
}

interface InfiniteFightersPage {
  fighters: UFCFighter[];
  nextCursor: number | null;
  hasMore: boolean;
}

/**
 * Get fighters with infinite scroll support
 * Efficiently fetches pages of fighters on demand
 */
export function useInfiniteFighters(options: InfiniteFightersOptions = {}) {
  const {
    pageSize = PAGE_SIZE,
    sortBy = 'full_name',
    sortOrder = 'asc',
    weightClass = null,
    weightTolerance = 10,
  } = options;

  return useInfiniteQuery({
    queryKey: ['ufc_fighters', 'infinite', pageSize, sortBy, sortOrder, weightClass, weightTolerance],
    queryFn: async ({ pageParam = 0 }): Promise<InfiniteFightersPage> => {
      let query = supabase
        .from('ufc_fighters')
        .select('*', { count: 'exact' });

      // Apply weight class filter
      if (weightClass !== null) {
        const minWeight = weightClass >= 206 ? weightClass - 50 : weightClass - weightTolerance;
        const maxWeight = weightClass >= 206 ? 400 : weightClass + weightTolerance;
        query = query.gte('weight_lbs', minWeight).lte('weight_lbs', maxWeight);
      }

      // Apply sorting
      if (sortBy === 'ranking') {
        // Custom sort: ranked fighters first (by ranking), then unranked (by wins)
        query = query
          .order('ranking', { ascending: true, nullsFirst: false })
          .order('record_wins', { ascending: false });
      } else {
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      }

      // Apply pagination
      query = query.range(pageParam, pageParam + pageSize - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      const fighters = data || [];
      const nextCursor = fighters.length === pageSize ? pageParam + pageSize : null;
      const hasMore = nextCursor !== null && (count === null || pageParam + pageSize < count);

      return { fighters, nextCursor, hasMore };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Get a single fighter by ID
 */
export function useFighter(fighterId: string | null) {
  return useQuery({
    queryKey: ['ufc_fighters', fighterId],
    queryFn: async (): Promise<UFCFighter | null> => {
      if (!fighterId) return null;

      const { data, error } = await supabase
        .from('ufc_fighters')
        .select('*')
        .eq('fighter_id', fighterId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data;
    },
    enabled: !!fighterId,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Get fighter profile with fight history
 */
export function useFighterProfile(fighterId: string | null) {
  return useQuery({
    queryKey: ['ufc_fighters', 'profile', fighterId],
    queryFn: async (): Promise<FighterProfileAndHistory | null> => {
      if (!fighterId) return null;

      const { data, error } = await supabase.rpc('get_fighter_profile_and_history', {
        p_fighter_id: fighterId,
      });

      if (error) throw error;

      return data as FighterProfileAndHistory | null;
    },
    enabled: !!fighterId,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Get fighters by weight class
 */
export function useFightersByWeightClass(weightLbs: number | null, tolerance = 10) {
  return useQuery({
    queryKey: ['ufc_fighters', 'weight_class', weightLbs, tolerance],
    queryFn: async (): Promise<UFCFighter[]> => {
      if (!weightLbs) return [];

      const minWeight = weightLbs - tolerance;
      const maxWeight = weightLbs + tolerance;

      const { data, error } = await supabase
        .from('ufc_fighters')
        .select('*')
        .gte('weight_lbs', minWeight)
        .lte('weight_lbs', maxWeight)
        .order('record_wins', { ascending: false });

      if (error) throw error;

      return data || [];
    },
    enabled: !!weightLbs,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Get ranked fighters by weight class (sorted by ranking, then wins)
 */
export function useRankedFighters(weightClass: string | null) {
  return useQuery({
    queryKey: ['ufc_fighters', 'ranked', weightClass],
    queryFn: async (): Promise<UFCFighter[]> => {
      if (!weightClass) {
        // Get all ranked fighters across all weight classes
        const { data, error } = await supabase
          .from('ufc_fighters')
          .select('*')
          .not('ranking', 'is', null)
          .order('weight_class')
          .order('ranking', { ascending: true });

        if (error) throw error;
        return data || [];
      }

      // Get ranked fighters for specific weight class
      const { data, error } = await supabase
        .from('ufc_fighters')
        .select('*')
        .eq('weight_class', weightClass)
        .not('ranking', 'is', null)
        .order('ranking', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Get top fighters by wins
 */
export function useTopFighters(limit = 20) {
  return useQuery({
    queryKey: ['ufc_fighters', 'top', limit],
    queryFn: async (): Promise<UFCFighter[]> => {
      const { data, error } = await supabase
        .from('ufc_fighters')
        .select('*')
        .order('record_wins', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    },
    staleTime: 1000 * 60 * 10,
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format height from inches to feet and inches string
 */
export function formatHeight(inches: number | null): string {
  if (!inches) return '--';
  const feet = Math.floor(inches / 12);
  const remainingInches = inches % 12;
  return `${feet}'${remainingInches}"`;
}

/**
 * Format weight in pounds
 */
export function formatWeight(lbs: number | null): string {
  if (!lbs) return '--';
  return `${lbs} lbs`;
}

/**
 * Format reach in inches
 */
export function formatReach(inches: number | null): string {
  if (!inches) return '--';
  return `${inches}"`;
}

/**
 * Format fighter record as string
 */
export function formatRecord(wins: number, losses: number, draws: number, nc?: number): string {
  let record = `${wins}-${losses}`;
  if (draws > 0) record += `-${draws}`;
  if (nc && nc > 0) record += ` (${nc} NC)`;
  return record;
}

/**
 * Format percentage stat
 */
export function formatPercentage(value: number | null): string {
  if (value === null || value === undefined) return '--';
  return `${Math.round(value)}%`;
}

/**
 * Format decimal stat (like SLpM)
 */
export function formatStat(value: number | null): string {
  if (value === null || value === undefined) return '--';
  return value.toFixed(2);
}

/**
 * Format control time from seconds
 */
export function formatControlTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get weight class name from weight in pounds
 */
export function getWeightClassName(weightLbs: number | null): string {
  if (!weightLbs) return 'Unknown';

  if (weightLbs <= 115) return 'Strawweight';
  if (weightLbs <= 125) return 'Flyweight';
  if (weightLbs <= 135) return 'Bantamweight';
  if (weightLbs <= 145) return 'Featherweight';
  if (weightLbs <= 155) return 'Lightweight';
  if (weightLbs <= 170) return 'Welterweight';
  if (weightLbs <= 185) return 'Middleweight';
  if (weightLbs <= 205) return 'Light Heavyweight';
  return 'Heavyweight';
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dob: string | null): number | null {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
