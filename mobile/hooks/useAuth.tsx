/**
 * Authentication context with guest mode support
 * Includes guest pick migration on sign-in
 * Supports email/password, OTP, Apple, and Google authentication
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/database';
import { logger } from '../lib/logger';
import { migrateGuestDataToUser } from '../lib/guestMigration';
import { GuestPick } from './useGuestPicks';
import { useAppleAuth } from './useAppleAuth';
import { useGoogleAuth } from './useGoogleAuth';

const GUEST_PICKS_KEY = '@ufc_guest_picks';
const GUEST_MODE_KEY = '@ufc_guest_mode';
const FIRST_LAUNCH_KEY = '@ufc_first_launch_complete';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  // Guest mode
  isGuest: boolean;
  isFirstLaunch: boolean;
  // Password recovery
  isPasswordRecovery: boolean;
  clearPasswordRecovery: () => void;
  enterGuestMode: () => Promise<void>;
  exitGuestMode: () => Promise<void>;
  markFirstLaunchComplete: () => Promise<void>;
  // Migration
  migrationResult: { success: boolean; migratedCount: number } | null;
  clearMigrationResult: () => void;
  // OTP methods
  signInWithOTP: (email: string) => Promise<void>;
  verifyOTP: (email: string, token: string) => Promise<void>;
  // Password methods
  signUp: (email: string, password: string) => Promise<any>;
  signInWithPassword: (email: string, password: string) => Promise<any>;
  signInWithUsername: (username: string, password: string) => Promise<any>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  // OAuth methods
  signInWithApple: () => Promise<void>;
  isAppleAvailable: boolean;
  appleLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  isGoogleAvailable: boolean;
  googleLoading: boolean;
  // Profile
  createProfile: (username: string) => Promise<Profile>;
  updateProfile: (updates: { username?: string; bio?: string | null; avatar_url?: string | null; banner_url?: string | null }) => Promise<Profile>;
  signOut: () => Promise<void>;
  // Testing
  resetForTesting: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
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
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const migrationAttemptedRef = useRef(false);

  // OAuth hooks
  const appleAuth = useAppleAuth();
  const googleAuth = useGoogleAuth();

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

  const loadProfile = useCallback(async (userId: string) => {
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

        // Get initial session and refresh if expired
        const { data: { session }, error } = await supabase.auth.getSession();

        // If user has a valid session, always use it (even if guest mode was set)
        // This handles the case where user signs in while in guest mode
        if (session?.user) {
          if (guestMode === 'true') {
            logger.debug('Session found while in guest mode, exiting guest mode');
            await AsyncStorage.removeItem(GUEST_MODE_KEY);
          }
          setIsGuest(false);
        } else if (guestMode === 'true') {
          // Only use guest mode if there's no valid session
          logger.debug('Guest mode detected, no session');
          setIsGuest(true);
          setLoading(false);
          return;
        }

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

      if (event === 'PASSWORD_RECOVERY') {
        logger.info('Password recovery session detected');
        setIsPasswordRecovery(true);
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_OUT') {
        logger.info('User signed out');
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        migrationAttemptedRef.current = false; // Reset for next sign-in
        return;
      }

      // For other events, update session state
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        logger.debug('Loading profile after auth change', { userId: session.user.id });

        // IMPORTANT: Keep loading true until profile is loaded to prevent race condition
        // where user is set but profile is null, causing redirect to create-username
        setLoading(true);
        loadProfile(session.user.id).then(() => {
          // Migrate guest picks on sign-in (after profile is loaded)
          if (event === 'SIGNED_IN') {
            checkAndMigrateGuestPicks(session.user.id);
          }
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkAndMigrateGuestPicks, loadProfile]);

  const signInWithOTP = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: 'upset://',
      },
    });

    if (error) throw error;
  }, []);

  const verifyOTP = useCallback(async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (error) throw error;
  }, []);

  const createProfile = useCallback(async (username: string) => {
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
  }, [user]);

  const updateProfile = useCallback(async (updates: { username?: string; bio?: string | null; avatar_url?: string | null; banner_url?: string | null }) => {
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
  }, [user]);

  const signUp = useCallback(async (email: string, password: string) => {
    logger.breadcrumb('Sign up attempt', 'auth', { email });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'upset://',
      },
    });

    if (error) {
      logger.error('Sign up failed', error, { email });
      throw error;
    }

    logger.info('Sign up successful', { userId: data.user?.id });
    return data;
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
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
  }, []);

  const signInWithUsername = useCallback(async (username: string, password: string) => {
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
  }, [signInWithPassword]);

  const resetPassword = useCallback(async (email: string) => {
    logger.breadcrumb('Password reset requested', 'auth', { email });

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'upset://reset-password',
    });

    if (error) {
      logger.error('Password reset failed', error, { email });
      throw error;
    }

    logger.info('Password reset email sent', { email });
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    logger.breadcrumb('Password update attempt', 'auth');

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      logger.error('Password update failed', error);
      throw error;
    }

    logger.info('Password updated successfully');
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  // Full reset for testing - clears all auth state and simulates fresh install
  const resetForTesting = useCallback(async () => {
    logger.info('Resetting app for testing');
    await AsyncStorage.multiRemove([GUEST_MODE_KEY, FIRST_LAUNCH_KEY, GUEST_PICKS_KEY]);
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setIsGuest(false);
    setIsFirstLaunch(true);
    migrationAttemptedRef.current = false;
  }, []);

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

  // Clear password recovery flag after password is updated
  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user,
    profile,
    loading,
    // Guest mode
    isGuest,
    isFirstLaunch,
    // Password recovery
    isPasswordRecovery,
    clearPasswordRecovery,
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
    // OAuth methods
    signInWithApple: appleAuth.signInWithApple,
    isAppleAvailable: appleAuth.isAvailable,
    appleLoading: appleAuth.loading,
    signInWithGoogle: googleAuth.signInWithGoogle,
    isGoogleAvailable: googleAuth.isAvailable,
    googleLoading: googleAuth.loading,
    // Profile
    createProfile,
    updateProfile,
    signOut,
    // Testing
    resetForTesting,
  }), [
    session,
    user,
    profile,
    loading,
    isGuest,
    isFirstLaunch,
    isPasswordRecovery,
    clearPasswordRecovery,
    enterGuestMode,
    exitGuestMode,
    markFirstLaunchComplete,
    migrationResult,
    clearMigrationResult,
    signInWithOTP,
    verifyOTP,
    signUp,
    signInWithPassword,
    signInWithUsername,
    resetPassword,
    updatePassword,
    appleAuth.signInWithApple,
    appleAuth.isAvailable,
    appleAuth.loading,
    googleAuth.signInWithGoogle,
    googleAuth.isAvailable,
    googleAuth.loading,
    createProfile,
    updateProfile,
    signOut,
    resetForTesting,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
