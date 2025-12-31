/**
 * Authentication hooks
 */

import { useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/database';
import { logger } from '../lib/logger';

// Test users that bypass normal authentication (dev only)
const TEST_USERS: Record<string, { id: string; username: string; password: string }> = {
  'alice@test.local': { id: 'test-user-alice-0001', username: 'alice', password: 'test123' },
  'bob@test.local': { id: 'test-user-bob-0002', username: 'bob', password: 'test123' },
  'charlie@test.local': { id: 'test-user-charlie-0003', username: 'charlie', password: 'test123' },
};

const TEST_SESSION_KEY = '@ufc_picks_test_session';

function isTestUser(email: string): boolean {
  return __DEV__ && email.endsWith('@test.local');
}

function createMockSession(email: string): { session: Session; user: User; profile: Profile } | null {
  const testUser = TEST_USERS[email.toLowerCase()];
  if (!testUser) return null;

  const now = new Date().toISOString();
  const user: User = {
    id: testUser.id,
    email: email,
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: { provider: 'test' },
    user_metadata: { username: testUser.username },
    created_at: now,
    updated_at: now,
    confirmed_at: now,
    email_confirmed_at: now,
    identities: [],
  };

  const session: Session = {
    access_token: `test-token-${testUser.id}`,
    refresh_token: `test-refresh-${testUser.id}`,
    expires_in: 3600 * 24 * 365, // 1 year
    expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 365,
    token_type: 'bearer',
    user,
  };

  const profile: Profile = {
    user_id: testUser.id,
    username: testUser.username,
    created_at: now,
  };

  return { session, user, profile };
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTestSession, setIsTestSession] = useState(false);

  useEffect(() => {
    // Check for test session first (dev only)
    const loadTestSession = async () => {
      if (!__DEV__) return null;
      try {
        const stored = await AsyncStorage.getItem(TEST_SESSION_KEY);
        if (stored) {
          const testData = JSON.parse(stored);
          logger.info('Test session restored', { email: testData.user?.email });
          return testData;
        }
      } catch (error) {
        logger.debug('No test session found');
      }
      return null;
    };

    // Get initial session and refresh if expired
    loadTestSession().then((testSession) => {
      if (testSession) {
        setSession(testSession.session);
        setUser(testSession.user);
        setProfile(testSession.profile);
        setIsTestSession(true);
        setLoading(false);
        return;
      }

      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
          logger.error('Failed to get session', error);
        }
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          logger.debug('Session loaded', { userId: session.user.id });
          loadProfile(session.user.id);
        } else {
          setLoading(false);
        }
      });
    });

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
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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

    // Check for test user bypass (dev only)
    if (isTestUser(email)) {
      const testUser = TEST_USERS[email.toLowerCase()];
      if (testUser && testUser.password === password) {
        const mockData = createMockSession(email);
        if (mockData) {
          logger.info('Test user sign in successful', { email, username: testUser.username });
          await AsyncStorage.setItem(TEST_SESSION_KEY, JSON.stringify(mockData));
          setSession(mockData.session);
          setUser(mockData.user);
          setProfile(mockData.profile);
          setIsTestSession(true);
          return { session: mockData.session, user: mockData.user };
        }
      }
      throw new Error('Invalid test user credentials');
    }

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

    // Check for test user by username (dev only)
    if (__DEV__) {
      const testEntry = Object.entries(TEST_USERS).find(
        ([_, user]) => user.username.toLowerCase() === username.toLowerCase()
      );
      if (testEntry) {
        const [email] = testEntry;
        return await signInWithPassword(email, password);
      }
    }

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
    // Clear test session if exists
    if (isTestSession) {
      await AsyncStorage.removeItem(TEST_SESSION_KEY);
      setSession(null);
      setUser(null);
      setProfile(null);
      setIsTestSession(false);
      logger.info('Test user signed out');
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return {
    session,
    user,
    profile,
    loading,
    isTestSession,
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
    signOut,
  };
}
