/**
 * Google Sign-In hook for Supabase authentication
 * Uses Supabase OAuth flow (more reliable than expo-auth-session proxy)
 */

import { useState, useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import Constants from 'expo-constants';

// Complete auth session for web browser redirects
WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const [loading, setLoading] = useState(false);

  // Listen for deep links to handle OAuth callback
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      logger.debug('Deep link received', { url: event.url });

      if (event.url.includes('access_token') || event.url.includes('code')) {
        // Extract tokens from URL fragment and set session
        const url = new URL(event.url.replace('#', '?')); // Convert fragment to query params
        const accessToken = url.searchParams.get('access_token');
        const refreshToken = url.searchParams.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            logger.error('Failed to set session from OAuth', error);
          } else {
            logger.info('Google Sign-In successful via deep link');
          }
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    logger.breadcrumb('Starting Google Sign-In via Supabase', 'auth');

    try {
      // Get the redirect URL - use custom scheme for better compatibility
      // Using upset:// scheme which is configured in app.json
      const redirectUrl = 'upset://auth/callback';
      logger.debug('OAuth redirect URL', { redirectUrl });

      // Start OAuth flow via Supabase
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: {
            // Force account selection even if already logged in to Google
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        logger.error('Failed to start Google OAuth', error);
        throw error;
      }

      if (!data.url) {
        throw new Error('No OAuth URL returned from Supabase');
      }

      logger.debug('Opening OAuth URL', { url: data.url });

      // Open the OAuth URL in the browser
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl,
        {
          showInRecents: true,
          preferEphemeralSession: true, // Don't persist cookies between sessions
        }
      );

      logger.debug('Browser result', { type: result.type });

      if (result.type === 'success' && result.url) {
        logger.debug('OAuth callback received', { url: result.url });

        // Parse the URL to get the tokens from the fragment
        // Supabase returns tokens in the URL fragment like: #access_token=...&refresh_token=...
        const urlObj = new URL(result.url);
        const fragment = urlObj.hash.substring(1); // Remove the #
        const params = new URLSearchParams(fragment);

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            logger.error('Failed to set session from OAuth', sessionError);
            throw sessionError;
          }

          logger.info('Google Sign-In successful');
        } else {
          // Maybe tokens are in query params instead
          const queryAccessToken = urlObj.searchParams.get('access_token');
          const queryRefreshToken = urlObj.searchParams.get('refresh_token');

          if (queryAccessToken && queryRefreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: queryAccessToken,
              refresh_token: queryRefreshToken,
            });

            if (sessionError) {
              logger.error('Failed to set session from OAuth', sessionError);
              throw sessionError;
            }

            logger.info('Google Sign-In successful');
          } else {
            logger.warn('No tokens found in callback URL', { url: result.url });
          }
        }
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        logger.debug('Google Sign-In cancelled by user');
        throw new Error('Sign-in cancelled');
      }
    } catch (error: any) {
      logger.error('Google Sign-In failed', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In is always available when using Supabase OAuth
  const isAvailable = true;

  return {
    isAvailable,
    loading,
    signInWithGoogle,
  };
}
