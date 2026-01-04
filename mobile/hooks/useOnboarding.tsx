/**
 * Onboarding state management hook
 * Tracks first-time user experience flags using AsyncStorage
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../lib/logger';

const ONBOARDING_STORAGE_KEY = '@ufc_picks_onboarding';

export interface OnboardingState {
  hasDismissedFirstLaunch: boolean;
  hasSeenLockExplainer: boolean;
  hasSeenFirstEventCelebration: boolean;
}

const DEFAULT_STATE: OnboardingState = {
  hasDismissedFirstLaunch: false,
  hasSeenLockExplainer: false,
  hasSeenFirstEventCelebration: false,
};

type OnboardingFlag = keyof OnboardingState;

interface OnboardingContextValue {
  state: OnboardingState;
  isLoaded: boolean;
  markSeen: (flag: OnboardingFlag) => Promise<void>;
  resetOnboarding: () => Promise<void>;
  // Computed helpers
  shouldShowFirstLaunchHero: boolean;
  shouldShowLockExplainer: boolean;
  shouldShowFirstEventCelebration: boolean;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [state, setState] = useState<OnboardingState>(DEFAULT_STATE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load persisted onboarding state on mount
  useEffect(() => {
    async function loadOnboarding() {
      try {
        const stored = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<OnboardingState>;
          setState((prev) => ({ ...prev, ...parsed }));
          logger.debug('Onboarding state loaded', { state: parsed });
        }
      } catch (error) {
        logger.warn('Failed to load onboarding state', { error });
      } finally {
        setIsLoaded(true);
      }
    }
    loadOnboarding();
  }, []);

  // Mark a flag as seen and persist
  const markSeen = useCallback(async (flag: OnboardingFlag) => {
    setState((prev) => {
      const updated = { ...prev, [flag]: true };
      // Persist async
      AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(updated)).catch((error) => {
        logger.warn('Failed to persist onboarding state', { error });
      });
      logger.info('Onboarding flag marked', { flag });
      return updated;
    });
  }, []);

  // Reset all onboarding flags (for testing)
  const resetOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
      setState(DEFAULT_STATE);
      logger.info('Onboarding state reset');
    } catch (error) {
      logger.warn('Failed to reset onboarding state', { error });
    }
  }, []);

  const value = useMemo<OnboardingContextValue>(() => ({
    state,
    isLoaded,
    markSeen,
    resetOnboarding,
    // Computed helpers - note: actual show logic will check additional conditions
    shouldShowFirstLaunchHero: !state.hasDismissedFirstLaunch,
    shouldShowLockExplainer: !state.hasSeenLockExplainer,
    shouldShowFirstEventCelebration: !state.hasSeenFirstEventCelebration,
  }), [state, isLoaded, markSeen, resetOnboarding]);

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
