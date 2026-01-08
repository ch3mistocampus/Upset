/**
 * Apple Sign-In hook for Supabase authentication
 * Uses expo-apple-authentication for native Apple Sign-In
 */

import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export function useAppleAuth() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Apple Sign-In is only available on iOS 13+
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setIsAvailable);
    }
  }, []);

  const signInWithApple = async () => {
    if (!isAvailable) {
      throw new Error('Apple Sign-In is not available on this device');
    }

    setLoading(true);
    logger.breadcrumb('Starting Apple Sign-In', 'auth');

    try {
      // Request Apple credentials
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      logger.debug('Apple credential received', {
        hasIdentityToken: !!credential.identityToken,
        hasEmail: !!credential.email,
      });

      if (!credential.identityToken) {
        throw new Error('No identity token received from Apple');
      }

      // Sign in with Supabase using the Apple ID token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) {
        logger.error('Supabase Apple sign-in failed', error);
        throw error;
      }

      logger.info('Apple Sign-In successful', { userId: data.user?.id });
      return data;
    } catch (error: any) {
      // Handle user cancellation gracefully
      if (error.code === 'ERR_REQUEST_CANCELED') {
        logger.debug('Apple Sign-In cancelled by user');
        throw new Error('Sign-in cancelled');
      }

      logger.error('Apple Sign-In failed', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    isAvailable,
    loading,
    signInWithApple,
  };
}
