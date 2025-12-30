/**
 * Authentication hooks
 */

import { useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/database';
import { logger } from '../lib/logger';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session and refresh if expired
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

  return {
    session,
    user,
    profile,
    loading,
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
