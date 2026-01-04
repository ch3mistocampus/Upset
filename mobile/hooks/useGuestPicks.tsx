/**
 * Guest picks context and hook
 * Uses React Context to share state across all hook consumers
 * Stores picks in AsyncStorage for persistence
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../lib/logger';

const GUEST_PICKS_KEY = '@ufc_guest_picks';

export interface GuestPick {
  id: string;
  event_id: string;
  bout_id: string;
  picked_corner: 'red' | 'blue';
  created_at: string;
  updated_at: string;
}

interface GuestPicksState {
  picks: Record<string, GuestPick>; // keyed by bout_id
  eventsPicked: string[];
}

const DEFAULT_STATE: GuestPicksState = {
  picks: {},
  eventsPicked: [],
};

interface GuestPicksContextValue {
  isLoaded: boolean;
  picks: Record<string, GuestPick>;
  eventsPicked: string[];
  saveGuestPick: (pick: GuestPick) => Promise<void>;
  deleteGuestPick: (boutId: string) => Promise<void>;
  getGuestPicksForEvent: (eventId: string) => GuestPick[];
  getAllGuestPicks: () => GuestPick[];
  getGuestPickForBout: (boutId: string) => GuestPick | null;
  getTotalPickCount: () => number;
  getEventsPickedCount: () => number;
  clearGuestPicks: () => Promise<void>;
  generatePickId: () => string;
}

const GuestPicksContext = createContext<GuestPicksContextValue | null>(null);

export function GuestPicksProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GuestPicksState>(DEFAULT_STATE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load picks from storage on mount
  useEffect(() => {
    const loadPicks = async () => {
      try {
        const stored = await AsyncStorage.getItem(GUEST_PICKS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as GuestPicksState;
          setState(parsed);
          logger.debug('Guest picks loaded', { count: Object.keys(parsed.picks).length });
        }
      } catch (error) {
        logger.error('Failed to load guest picks', error as Error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadPicks();
  }, []);

  // Persist state to storage
  const persistState = useCallback(async (newState: GuestPicksState) => {
    try {
      await AsyncStorage.setItem(GUEST_PICKS_KEY, JSON.stringify(newState));
    } catch (error) {
      logger.error('Failed to persist guest picks', error as Error);
    }
  }, []);

  // Save or update a pick
  const saveGuestPick = useCallback(async (pick: GuestPick) => {
    setState((prev) => {
      const newState = {
        picks: {
          ...prev.picks,
          [pick.bout_id]: pick,
        },
        eventsPicked: prev.eventsPicked.includes(pick.event_id)
          ? prev.eventsPicked
          : [...prev.eventsPicked, pick.event_id],
      };
      persistState(newState);
      logger.debug('Guest pick saved', { boutId: pick.bout_id, corner: pick.picked_corner });
      return newState;
    });
  }, [persistState]);

  // Delete a specific pick by bout ID
  const deleteGuestPick = useCallback(async (boutId: string) => {
    setState((prev) => {
      const { [boutId]: removed, ...remainingPicks } = prev.picks;
      if (!removed) return prev; // Pick doesn't exist

      // Check if this event still has other picks
      const eventId = removed.event_id;
      const eventStillHasPicks = Object.values(remainingPicks).some(p => p.event_id === eventId);

      const newState = {
        picks: remainingPicks,
        eventsPicked: eventStillHasPicks
          ? prev.eventsPicked
          : prev.eventsPicked.filter(id => id !== eventId),
      };
      persistState(newState);
      logger.debug('Guest pick deleted', { boutId });
      return newState;
    });
  }, [persistState]);

  // Get picks for a specific event
  const getGuestPicksForEvent = useCallback((eventId: string): GuestPick[] => {
    return Object.values(state.picks).filter((pick) => pick.event_id === eventId);
  }, [state.picks]);

  // Get all picks
  const getAllGuestPicks = useCallback((): GuestPick[] => {
    return Object.values(state.picks);
  }, [state.picks]);

  // Get pick for a specific bout
  const getGuestPickForBout = useCallback((boutId: string): GuestPick | null => {
    return state.picks[boutId] || null;
  }, [state.picks]);

  // Get total pick count
  const getTotalPickCount = useCallback((): number => {
    return Object.keys(state.picks).length;
  }, [state.picks]);

  // Get events picked count
  const getEventsPickedCount = useCallback((): number => {
    return state.eventsPicked.length;
  }, [state.eventsPicked]);

  // Clear all guest picks
  const clearGuestPicks = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(GUEST_PICKS_KEY);
      setState(DEFAULT_STATE);
      logger.info('Guest picks cleared');
    } catch (error) {
      logger.error('Failed to clear guest picks', error as Error);
    }
  }, []);

  // Generate a simple UUID for local picks
  const generatePickId = useCallback((): string => {
    return 'guest_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }, []);

  const value: GuestPicksContextValue = {
    isLoaded,
    picks: state.picks,
    eventsPicked: state.eventsPicked,
    saveGuestPick,
    deleteGuestPick,
    getGuestPicksForEvent,
    getAllGuestPicks,
    getGuestPickForBout,
    getTotalPickCount,
    getEventsPickedCount,
    clearGuestPicks,
    generatePickId,
  };

  return (
    <GuestPicksContext.Provider value={value}>
      {children}
    </GuestPicksContext.Provider>
  );
}

export function useGuestPicks(): GuestPicksContextValue {
  const context = useContext(GuestPicksContext);
  if (!context) {
    throw new Error('useGuestPicks must be used within a GuestPicksProvider');
  }
  return context;
}
