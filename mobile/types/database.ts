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

// Friendship status type
export type FriendshipStatus = 'pending' | 'accepted' | 'declined';

// Visibility level type
export type VisibilityLevel = 'public' | 'friends' | 'private';

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
      friendships: {
        Row: Friendship;
        Insert: FriendshipInsert;
        Update: FriendshipUpdate;
      };
      privacy_settings: {
        Row: PrivacySettingsRow;
        Insert: PrivacySettingsInsert;
        Update: PrivacySettingsUpdate;
      };
    };
    Functions: {
      get_friends: {
        Args: Record<string, never>;
        Returns: FriendRow[];
      };
      get_friend_requests: {
        Args: Record<string, never>;
        Returns: FriendRequestRow[];
      };
      get_global_leaderboard: {
        Args: { limit_count?: number };
        Returns: LeaderboardRow[];
      };
      get_friends_leaderboard: {
        Args: Record<string, never>;
        Returns: LeaderboardRow[];
      };
      get_community_pick_percentages: {
        Args: { fight_id_input: string };
        Returns: CommunityPercentagesRow[];
      };
      get_email_by_username: {
        Args: { username_input: string };
        Returns: string | null;
      };
    };
  };
}

// Profile
export interface Profile {
  user_id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  user_id: string;
  username: string;
  bio?: string | null;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProfileUpdate {
  username?: string;
  bio?: string | null;
  avatar_url?: string | null;
  updated_at?: string;
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
  updated_at: string;
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
  updated_at?: string;
}

export interface PickUpdate {
  picked_corner?: 'red' | 'blue';
  picked_method?: string | null;
  picked_round?: number | null;
  status?: 'active' | 'graded' | 'voided';
  score?: number | null;
  updated_at?: string;
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

// Friendship
export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
}

export interface FriendshipInsert {
  id?: string;
  user_id: string;
  friend_id: string;
  status: FriendshipStatus;
  created_at?: string;
  updated_at?: string;
}

export interface FriendshipUpdate {
  status?: FriendshipStatus;
  updated_at?: string;
}

// Privacy Settings
export interface PrivacySettingsRow {
  id: string;
  user_id: string;
  picks_visibility: VisibilityLevel;
  profile_visibility: VisibilityLevel;
  stats_visibility: VisibilityLevel;
  created_at: string;
  updated_at: string;
}

export interface PrivacySettingsInsert {
  id?: string;
  user_id: string;
  picks_visibility?: VisibilityLevel;
  profile_visibility?: VisibilityLevel;
  stats_visibility?: VisibilityLevel;
  created_at?: string;
  updated_at?: string;
}

export interface PrivacySettingsUpdate {
  picks_visibility?: VisibilityLevel;
  profile_visibility?: VisibilityLevel;
  stats_visibility?: VisibilityLevel;
  updated_at?: string;
}

// RPC Return Types
export interface FriendRow {
  friend_user_id: string;
  username: string;
  total_picks: number;
  correct_picks: number;
  accuracy: number;
  became_friends_at: string;
}

export interface FriendRequestRow {
  request_id: string;
  from_user_id: string;
  username: string;
  total_picks: number;
  correct_picks: number;
  accuracy: number;
  requested_at: string;
}

export interface LeaderboardRow {
  user_id: string;
  username: string;
  total_picks: number;
  correct_picks: number;
  accuracy: number;
  rank: number;
}

export interface CommunityPercentagesRow {
  total_picks: number;
  fighter_a_picks: number;
  fighter_b_picks: number;
  fighter_a_percentage: number;
  fighter_b_percentage: number;
}
