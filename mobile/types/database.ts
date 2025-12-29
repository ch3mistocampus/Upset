/**
 * TypeScript types for UFC Picks Tracker
 * Matches Supabase database schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Database types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      events: {
        Row: Event;
        Insert: EventInsert;
        Update: EventUpdate;
      };
      bouts: {
        Row: Bout;
        Insert: BoutInsert;
        Update: BoutUpdate;
      };
      results: {
        Row: Result;
        Insert: ResultInsert;
        Update: ResultUpdate;
      };
      picks: {
        Row: Pick;
        Insert: PickInsert;
        Update: PickUpdate;
      };
      user_stats: {
        Row: UserStats;
        Insert: UserStatsInsert;
        Update: UserStatsUpdate;
      };
    };
  };
}

// Profile
export interface Profile {
  user_id: string;
  username: string;
  created_at: string;
}

export interface ProfileInsert {
  user_id: string;
  username: string;
  created_at?: string;
}

export interface ProfileUpdate {
  username?: string;
}

// Event
export interface Event {
  id: string;
  ufcstats_event_id: string;
  name: string;
  event_date: string;
  location: string | null;
  status: 'upcoming' | 'in_progress' | 'completed';
  last_synced_at: string | null;
  created_at: string;
}

export interface EventInsert {
  id?: string;
  ufcstats_event_id: string;
  name: string;
  event_date: string;
  location?: string | null;
  status?: 'upcoming' | 'in_progress' | 'completed';
  last_synced_at?: string | null;
  created_at?: string;
}

export interface EventUpdate {
  name?: string;
  event_date?: string;
  location?: string | null;
  status?: 'upcoming' | 'in_progress' | 'completed';
  last_synced_at?: string | null;
}

// Bout
export interface Bout {
  id: string;
  ufcstats_fight_id: string;
  event_id: string;
  order_index: number;
  weight_class: string | null;
  red_fighter_ufcstats_id: string;
  blue_fighter_ufcstats_id: string;
  red_name: string;
  blue_name: string;
  status: 'scheduled' | 'completed' | 'canceled' | 'replaced';
  card_snapshot: number;
  last_synced_at: string | null;
  created_at: string;
}

export interface BoutInsert {
  id?: string;
  ufcstats_fight_id: string;
  event_id: string;
  order_index: number;
  weight_class?: string | null;
  red_fighter_ufcstats_id: string;
  blue_fighter_ufcstats_id: string;
  red_name: string;
  blue_name: string;
  status?: 'scheduled' | 'completed' | 'canceled' | 'replaced';
  card_snapshot?: number;
  last_synced_at?: string | null;
  created_at?: string;
}

export interface BoutUpdate {
  order_index?: number;
  weight_class?: string | null;
  red_name?: string;
  blue_name?: string;
  status?: 'scheduled' | 'completed' | 'canceled' | 'replaced';
  last_synced_at?: string | null;
}

// Result
export interface Result {
  bout_id: string;
  winner_corner: 'red' | 'blue' | 'draw' | 'nc' | null;
  method: string | null;
  round: number | null;
  time: string | null;
  details: string | null;
  synced_at: string;
}

export interface ResultInsert {
  bout_id: string;
  winner_corner?: 'red' | 'blue' | 'draw' | 'nc' | null;
  method?: string | null;
  round?: number | null;
  time?: string | null;
  details?: string | null;
  synced_at?: string;
}

export interface ResultUpdate {
  winner_corner?: 'red' | 'blue' | 'draw' | 'nc' | null;
  method?: string | null;
  round?: number | null;
  time?: string | null;
  details?: string | null;
  synced_at?: string;
}

// Pick
export interface Pick {
  id: string;
  user_id: string;
  event_id: string;
  bout_id: string;
  picked_corner: 'red' | 'blue';
  picked_method: string | null;
  picked_round: number | null;
  created_at: string;
  locked_at: string | null;
  status: 'active' | 'graded' | 'voided';
  score: number | null;
}

export interface PickInsert {
  id?: string;
  user_id: string;
  event_id: string;
  bout_id: string;
  picked_corner: 'red' | 'blue';
  picked_method?: string | null;
  picked_round?: number | null;
  created_at?: string;
  locked_at?: string | null;
  status?: 'active' | 'graded' | 'voided';
  score?: number | null;
}

export interface PickUpdate {
  picked_corner?: 'red' | 'blue';
  picked_method?: string | null;
  picked_round?: number | null;
  status?: 'active' | 'graded' | 'voided';
  score?: number | null;
}

// UserStats
export interface UserStats {
  user_id: string;
  total_picks: number;
  correct_winner: number;
  accuracy_pct: number;
  current_streak: number;
  best_streak: number;
  updated_at: string;
}

export interface UserStatsInsert {
  user_id: string;
  total_picks?: number;
  correct_winner?: number;
  accuracy_pct?: number;
  current_streak?: number;
  best_streak?: number;
  updated_at?: string;
}

export interface UserStatsUpdate {
  total_picks?: number;
  correct_winner?: number;
  accuracy_pct?: number;
  current_streak?: number;
  best_streak?: number;
  updated_at?: string;
}

// Extended types for app usage
export interface BoutWithResult extends Bout {
  result: Result | null;
}

export interface BoutWithPick extends Bout {
  pick: Pick | null;
  result: Result | null;
}

export interface EventWithBouts extends Event {
  bouts: BoutWithPick[];
}
