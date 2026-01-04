/**
 * Authentication hooks with guest mode support
 * Includes guest pick migration on sign-in
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/database';
import { logger } from '../lib/logger';
import { migrateGuestDataToUser } from '../lib/guestMigration';
import { GuestPick } from './useGuestPicks';

const GUEST_PICKS_KEY = '@ufc_guest_picks';

const GUEST_MODE_KEY = '@ufc_guest_mode';
const FIRST_LAUNCH_KEY = '@ufc_first_launch_complete';

// Test users for development - these are REAL Supabase auth users created by setup script
// Use these credentials to test the app with proper RLS enforcement:
//   alice@test.com / Password123 (alice_ufc)
//   bob@test.com / Password123 (bob_fighter)
//   charlie@test.com / Password123 (charlie_picks)
//
// These users go through normal Supabase authentication, so picks save correctly.

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{
    success: boolean;
    migratedCount: number;
  } | null>(null);
  const migrationAttemptedRef = useRef(false);

  // Check and migrate guest picks when user signs in
  const checkAndMigrateGuestPicks = useCallback(async (userId: string) => {
    if (migrationAttemptedRef.current) return;
    migrationAttemptedRef.current = true;

    try {
      // Always clear guest mode on sign-in
      await AsyncStorage.removeItem(GUEST_MODE_KEY);
      setIsGuest(false);

      const guestPicksData = await AsyncStorage.getItem(GUEST_PICKS_KEY);
      if (!guestPicksData) {
        logger.debug('No guest picks to migrate');
        return;
      }

      const { picks } = JSON.parse(guestPicksData) as { picks: Record<string, GuestPick> };
      const guestPicks = Object.values(picks);

      if (guestPicks.length === 0) {
        logger.debug('Guest picks empty, nothing to migrate');
        await AsyncStorage.removeItem(GUEST_PICKS_KEY);
        return;
      }

      logger.info('Migrating guest picks', { count: guestPicks.length });
      const result = await migrateGuestDataToUser(userId, guestPicks);

      if (result.success) {
        // Clear guest picks after successful migration
        await AsyncStorage.removeItem(GUEST_PICKS_KEY);
        setMigrationResult({
          success: true,
          migratedCount: result.migratedCount,
        });
        logger.info('Guest picks migrated successfully', { count: result.migratedCount });
      } else {
        // Keep guest data on failure for retry
        setMigrationResult({ success: false, migratedCount: 0 });
        logger.error('Guest migration failed', new Error(result.errors.join(', ')));
      }
    } catch (error) {
      logger.error('Error during guest migration', error as Error);
    }
  }, []);

  useEffect(() => {
    // Check guest mode and first launch status first
    const initAuth = async () => {
      try {
        const [guestMode, firstLaunchComplete] = await Promise.all([
          AsyncStorage.getItem(GUEST_MODE_KEY),
          AsyncStorage.getItem(FIRST_LAUNCH_KEY),
        ]);

        // Check if this is a first launch (no previous session or guest mode)
        const isFirst = !firstLaunchComplete;
        setIsFirstLaunch(isFirst);

        if (guestMode === 'true') {
          logger.debug('Guest mode detected, skipping auth check');
          setIsGuest(true);
          setLoading(false);
          return;
        }

        // Get initial session and refresh if expired
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          logger.error('Failed to get session', error);
        }
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          logger.debug('Session loaded', { userId: session.user.id });
          await loadProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        logger.error('Auth initialization failed', error as Error);
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes and token refresh
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      logger.breadcrumb(`Auth state changed: ${event}`, 'auth', {
        event,
        hasSession: !!session,
      });

      if (event === 'TOKEN_REFRESHED') {
        logger.info('Session token refreshed successfully');
      }

      if (event === 'SIGNED_OUT') {
        logger.info('User signed out');
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      // For other events, update session state
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        logger.debug('Loading profile after auth change', { userId: session.user.id });
        loadProfile(session.user.id);

        // Migrate guest picks on sign-in
        if (event === 'SIGNED_IN') {
          checkAndMigrateGuestPicks(session.user.id);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkAndMigrateGuestPicks]);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned (profile doesn't exist yet)
        logger.error('Error loading profile', error, { userId });
      }

      setProfile(data);
      if (data) {
        logger.debug('Profile loaded', { username: data.username });
      }
    } catch (error) {
      logger.error('Error loading profile', error as Error, { userId });
    } finally {
      setLoading(false);
    }
  };

  const signInWithOTP = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: 'ufcpicks://',
      },
    });

    if (error) throw error;
  };

  const verifyOTP = async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (error) throw error;
  };

  const createProfile = async (username: string) => {
    if (!user) throw new Error('No user logged in');

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        user_id: user.id,
        username,
      })
      .select()
      .single();

    if (error) throw error;

    setProfile(data);
    return data;
  };

  const updateProfile = async (updates: { bio?: string | null; avatar_url?: string | null; banner_url?: string | null }) => {
    if (!user) throw new Error('No user logged in');

    logger.breadcrumb('Updating profile', 'profile', { updates });

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update profile', error);
      throw error;
    }

    setProfile(data);
    logger.info('Profile updated successfully');
    return data;
  };

  const signUp = async (email: string, password: string) => {
    logger.breadcrumb('Sign up attempt', 'auth', { email });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'ufcpicks://',
      },
    });

    if (error) {
      logger.error('Sign up failed', error, { email });
      throw error;
    }

    logger.info('Sign up successful', { userId: data.user?.id });
    return data;
  };

  const signInWithPassword = async (email: string, password: string) => {
    logger.breadcrumb('Sign in with password', 'auth', { email });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.error('Sign in failed', error, { email });
      throw error;
    }

    logger.info('Sign in successful', { userId: data.user?.id });
    return data;
  };

  const signInWithUsername = async (username: string, password: string) => {
    logger.breadcrumb('Sign in with username', 'auth', { username });

    try {
      // Look up email by username using RPC function
      const { data: email, error: rpcError } = await supabase
        .rpc('get_email_by_username', { username_input: username });

      if (rpcError || !email) {
        logger.warn('Username not found', { username });
        throw new Error('Invalid username or password');
      }

      // Now sign in with the email and password
      logger.debug('Username resolved to email, attempting sign in');
      return await signInWithPassword(email, password);
    } catch (error) {
      logger.error('Username sign in failed', error as Error, { username });
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    logger.breadcrumb('Password reset requested', 'auth', { email });

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'ufcpicks://reset-password',
    });

    if (error) {
      logger.error('Password reset failed', error, { email });
      throw error;
    }

    logger.info('Password reset email sent', { email });
  };

  const updatePassword = async (newPassword: string) => {
    logger.breadcrumb('Password update attempt', 'auth');

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      logger.error('Password update failed', error);
      throw error;
    }

    logger.info('Password updated successfully');
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  // Guest mode methods
  const enterGuestMode = useCallback(async () => {
    logger.info('Entering guest mode');
    await AsyncStorage.setItem(GUEST_MODE_KEY, 'true');
    await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'true');
    setIsGuest(true);
    setIsFirstLaunch(false);
  }, []);

  const exitGuestMode = useCallback(async () => {
    logger.info('Exiting guest mode');
    await AsyncStorage.removeItem(GUEST_MODE_KEY);
    setIsGuest(false);
  }, []);

  const markFirstLaunchComplete = useCallback(async () => {
    await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'true');
    setIsFirstLaunch(false);
  }, []);

  // Clear migration result after it's been displayed
  const clearMigrationResult = useCallback(() => {
    setMigrationResult(null);
  }, []);

  return {
    session,
    user,
    profile,
    loading,
    // Guest mode
    isGuest,
    isFirstLaunch,
    enterGuestMode,
    exitGuestMode,
    markFirstLaunchComplete,
    // Migration
    migrationResult,
    clearMigrationResult,
    // OTP methods
    signInWithOTP,
    verifyOTP,
    // Password methods
    signUp,
    signInWithPassword,
    signInWithUsername,
    resetPassword,
    updatePassword,
    // Profile
    createProfile,
    updateProfile,
    signOut,
  };
}
