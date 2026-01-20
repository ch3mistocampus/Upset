/**
 * Google Sign-In hook using native SDK
 * Provides a native sign-in UI instead of web-based OAuth redirect
 *
 * NOTE: This requires a native build (not Expo Go) to work.
 * In Expo Go, isAvailable will be false and signInWithGoogle will throw.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

// Get client IDs from environment
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS;
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB;

// Try to import Google Sign-In - will fail in Expo Go
let GoogleSignin: any = null;
let isSuccessResponse: any = null;
let isErrorWithCode: any = null;
let statusCodes: any = null;
let nativeModuleAvailable = false;

try {
  // Dynamic require to prevent crash when native module isn't available
  const googleSignIn = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleSignIn.GoogleSignin;
  isSuccessResponse = googleSignIn.isSuccessResponse;
  isErrorWithCode = googleSignIn.isErrorWithCode;
  statusCodes = googleSignIn.statusCodes;
  nativeModuleAvailable = true;
} catch (error) {
  // Native module not available (running in Expo Go)
  logger.debug('Google Sign-In native module not available (likely Expo Go)');
  nativeModuleAvailable = false;
}

export function useGoogleAuth() {
  const [loading, setLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  // Configure Google Sign-In on mount
  useEffect(() => {
    if (!nativeModuleAvailable) {
      logger.debug('Google Sign-In not available - native module missing');
      setIsAvailable(false);
      return;
    }

    const configure = async () => {
      try {
        // Configure with iOS client ID for native sign-in
        // Web client ID is needed for Supabase to verify the token
        GoogleSignin.configure({
          iosClientId: IOS_CLIENT_ID,
          webClientId: WEB_CLIENT_ID,
          offlineAccess: false,
        });

        setIsAvailable(true);
        logger.debug('Google Sign-In configured', {
          hasIosClientId: !!IOS_CLIENT_ID,
          hasWebClientId: !!WEB_CLIENT_ID
        });
      } catch (error) {
        logger.error('Failed to configure Google Sign-In', error);
        setIsAvailable(false);
      }
    };

    configure();
  }, []);

  const signInWithGoogle = async () => {
    if (!nativeModuleAvailable) {
      throw new Error('Google Sign-In requires a native build. Please use a development or production build instead of Expo Go.');
    }

    // Prevent race condition from double-tap
    if (loading) {
      logger.warn('Google Sign-In already in progress');
      throw new Error('Sign-in already in progress');
    }

    setLoading(true);
    logger.breadcrumb('Starting native Google Sign-In', 'auth');

    try {
      // Check if Play Services are available (Android) or just proceed (iOS)
      await GoogleSignin.hasPlayServices();

      // Trigger native Google Sign-In UI
      const response = await GoogleSignin.signIn();

      if (isSuccessResponse(response)) {
        const { idToken } = response.data;

        if (!idToken) {
          throw new Error('No ID token returned from Google Sign-In');
        }

        logger.debug('Got Google ID token, authenticating with Supabase');

        // Sign in to Supabase with the Google ID token
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
        });

        if (error) {
          logger.error('Supabase signInWithIdToken failed', error);
          throw error;
        }

        logger.info('Google Sign-In successful', { userId: data.user?.id });
      } else {
        // User cancelled the sign-in
        logger.debug('Google Sign-In cancelled by user');
        throw new Error('Sign-in cancelled');
      }
    } catch (error: any) {
      if (isErrorWithCode && isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            logger.debug('Google Sign-In cancelled by user');
            throw new Error('Sign-in cancelled');
          case statusCodes.IN_PROGRESS:
            logger.warn('Google Sign-In already in progress');
            throw new Error('Sign-in already in progress');
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            logger.error('Play Services not available');
            throw new Error('Google Play Services not available');
          default:
            logger.error('Google Sign-In error', error);
            throw error;
        }
      } else {
        logger.error('Google Sign-In failed', error);
        throw error;
      }
    } finally {
      setLoading(false);
    }
  };

  // Sign out from Google (call this when signing out of the app)
  const signOutFromGoogle = async () => {
    if (!nativeModuleAvailable || !GoogleSignin) {
      return; // No-op in Expo Go
    }

    try {
      await GoogleSignin.signOut();
      logger.debug('Signed out from Google');
    } catch (error) {
      logger.error('Failed to sign out from Google', error);
    }
  };

  return {
    isAvailable,
    loading,
    signInWithGoogle,
    signOutFromGoogle,
  };
}
