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

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return {
    session,
    user,
    profile,
    loading,
    signInWithOTP,
    verifyOTP,
    createProfile,
    signOut,
  };
}
