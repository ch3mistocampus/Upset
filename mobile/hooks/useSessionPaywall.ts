/**
 * Soft paywall on app open
 * Shows dismissable paywall after Nth session
 */

import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';
import { SESSION_CONFIG, PLACEMENTS } from '../lib/superwall';

const SESSION_COUNT_KEY = '@ufc_session_count';

export function useSessionPaywall() {
  const { isGuest } = useAuth();
  const { isPro, showPaywall } = useSubscription();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current || isGuest || isPro) return;
    hasRun.current = true;

    const checkSession = async () => {
      const raw = await AsyncStorage.getItem(SESSION_COUNT_KEY);
      const count = (parseInt(raw || '0', 10) || 0) + 1;
      await AsyncStorage.setItem(SESSION_COUNT_KEY, String(count));

      const shouldShow =
        count === SESSION_CONFIG.FIRST_SOFT_PAYWALL ||
        (count > SESSION_CONFIG.FIRST_SOFT_PAYWALL &&
          (count - SESSION_CONFIG.FIRST_SOFT_PAYWALL) % SESSION_CONFIG.REPEAT_INTERVAL === 0);

      if (shouldShow) {
        // Delay to let the app render first
        setTimeout(() => {
          showPaywall(PLACEMENTS.APP_OPEN, () => {});
        }, 2000);
      }
    };

    checkSession();
  }, [isGuest, isPro, showPaywall]);
}
