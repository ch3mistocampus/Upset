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
  display_name: string | null;
  created_at: string;
}

export interface ProfileInsert {
  user_id: string;
  username: string;
  display_name?: string | null;
  created_at?: string;
}

export interface ProfileUpdate {
  username?: string;
  display_name?: string | null;
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

// ============================================================================
// SOCIAL FEATURES
// ============================================================================

// Friendship
export type FriendshipStatus = 'pending' | 'accepted' | 'declined' | 'blocked';

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
  status?: FriendshipStatus;
  created_at?: string;
  updated_at?: string;
}

export interface FriendshipUpdate {
  status?: FriendshipStatus;
  updated_at?: string;
}

// League
export interface League {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  owner_id: string;
  is_public: boolean;
  max_members: number;
  created_at: string;
}

export interface LeagueInsert {
  id?: string;
  name: string;
  description?: string | null;
  invite_code: string;
  owner_id: string;
  is_public?: boolean;
  max_members?: number;
  created_at?: string;
}

export interface LeagueUpdate {
  name?: string;
  description?: string | null;
  is_public?: boolean;
  max_members?: number;
}

// League Membership
export type LeagueRole = 'admin' | 'member';

export interface LeagueMembership {
  id: string;
  league_id: string;
  user_id: string;
  role: LeagueRole;
  joined_at: string;
}

export interface LeagueMembershipInsert {
  id?: string;
  league_id: string;
  user_id: string;
  role?: LeagueRole;
  joined_at?: string;
}

export interface LeagueMembershipUpdate {
  role?: LeagueRole;
}

// Privacy Settings
export type ProfileVisibility = 'public' | 'friends' | 'private';

export interface PrivacySettings {
  user_id: string;
  profile_visibility: ProfileVisibility;
  show_on_leaderboards: boolean;
  allow_friend_requests: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrivacySettingsInsert {
  user_id: string;
  profile_visibility?: ProfileVisibility;
  show_on_leaderboards?: boolean;
  allow_friend_requests?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PrivacySettingsUpdate {
  profile_visibility?: ProfileVisibility;
  show_on_leaderboards?: boolean;
  allow_friend_requests?: boolean;
  updated_at?: string;
}

// Extended types for social features
export interface FriendWithProfile extends Friendship {
  friend_profile?: Profile;
  user_profile?: Profile;
}

export interface LeagueWithMembers extends League {
  members: LeagueMembershipWithProfile[];
  member_count: number;
}

export interface LeagueMembershipWithProfile extends LeagueMembership {
  profile: Profile;
  user_stats?: UserStats;
}

export interface LeagueLeaderboardEntry {
  league_id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  total_picks: number;
  correct_winner: number;
  accuracy_pct: number;
  current_streak: number;
  best_streak: number;
  joined_at: string;
  role: LeagueRole;
}

export interface CommunityPickStats {
  bout_id: string;
  red_count: number;
  blue_count: number;
  total_picks: number;
  red_percentage: number;
  blue_percentage: number;
}
