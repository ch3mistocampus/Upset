/**
 * Google Sign-In hook for Supabase authentication
 * Uses expo-auth-session for OAuth flow
 */

import { useState, useEffect } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

// Complete auth session for web browser redirects
WebBrowser.maybeCompleteAuthSession();

// Google OAuth client IDs - these should be configured in your Google Cloud Console
// and match your Supabase Google provider configuration
const GOOGLE_CLIENT_ID_WEB = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB;
const GOOGLE_CLIENT_ID_IOS = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS;
const GOOGLE_CLIENT_ID_ANDROID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID;

export function useGoogleAuth() {
  const [loading, setLoading] = useState(false);

  // Configure Google OAuth request
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_CLIENT_ID_WEB,
    iosClientId: GOOGLE_CLIENT_ID_IOS,
    androidClientId: GOOGLE_CLIENT_ID_ANDROID,
    scopes: ['openid', 'profile', 'email'],
  });

  // Handle the OAuth response
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;

      if (id_token) {
        handleGoogleSignIn(id_token);
      }
    } else if (response?.type === 'error') {
      logger.error('Google OAuth error', new Error(response.error?.message || 'Unknown error'));
      setLoading(false);
    } else if (response?.type === 'dismiss') {
      logger.debug('Google Sign-In dismissed by user');
      setLoading(false);
    }
  }, [response]);

  const handleGoogleSignIn = async (idToken: string) => {
    try {
      logger.breadcrumb('Signing in with Google ID token', 'auth');

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) {
        logger.error('Supabase Google sign-in failed', error);
        throw error;
      }

      logger.info('Google Sign-In successful', { userId: data.user?.id });
      return data;
    } catch (error) {
      logger.error('Google Sign-In failed', error as Error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    if (!request) {
      throw new Error('Google Sign-In is not configured');
    }

    setLoading(true);
    logger.breadcrumb('Starting Google Sign-In', 'auth');

    try {
      const result = await promptAsync();

      if (result.type === 'cancel') {
        setLoading(false);
        throw new Error('Sign-in cancelled');
      }

      // The actual sign-in is handled in the useEffect above
      // when response.type === 'success'
    } catch (error: any) {
      setLoading(false);
      logger.error('Google Sign-In prompt failed', error);
      throw error;
    }
  };

  // Google Sign-In is available if the request is ready
  const isAvailable = !!request;

  return {
    isAvailable,
    loading,
    signInWithGoogle,
  };
}
