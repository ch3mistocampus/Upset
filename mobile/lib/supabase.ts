/**
 * Supabase client configuration
 * Configured for mobile with AsyncStorage
 * Uses environment variables for production security
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

// Environment variables (set via EAS secrets or .env for local dev)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://qcvsioaokjjqjhxxxvbm.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdnNpb2Fva2pqcWpoeHh4dmJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNTA3ODIsImV4cCI6MjA4MjYyNjc4Mn0.yMn5ufxtg0stbfhtoKg7AOI5bHcEXpU7Eh4jrGQHS9M';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
