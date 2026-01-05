/**
 * Social Features Type Definitions
 * Sprint 2: Friends, Privacy, and Leaderboards
 */

// Friendship Types
export type FriendshipStatus = 'pending' | 'accepted' | 'declined';

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
}

export interface Friend {
  friend_user_id: string;
  username: string;
  total_picks: number;
  correct_picks: number;
  accuracy: number;
  became_friends_at: string;
}

export interface FriendRequest {
  request_id: string;
  from_user_id: string;
  username: string;
  total_picks: number;
  correct_picks: number;
  accuracy: number;
  requested_at: string;
}

// Privacy Types
export type VisibilityLevel = 'public' | 'friends' | 'private';

export interface PrivacySettings {
  id: string;
  user_id: string;
  picks_visibility: VisibilityLevel;
  profile_visibility: VisibilityLevel;
  stats_visibility: VisibilityLevel;
  is_private: boolean;
  allow_follow_requests: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrivacySettingsUpdate {
  picks_visibility?: VisibilityLevel;
  profile_visibility?: VisibilityLevel;
  stats_visibility?: VisibilityLevel;
  is_private?: boolean;
  allow_follow_requests?: boolean;
}

// Leaderboard Types
export interface LeaderboardEntry {
  user_id: string;
  username: string;
  total_picks: number;
  correct_picks: number;
  accuracy: number;
  rank: number;
}

// Community Pick Types
export interface CommunityPickPercentages {
  total_picks: number;
  fighter_a_picks: number;
  fighter_b_picks: number;
  fighter_a_percentage: number;
  fighter_b_percentage: number;
}

// User Search Types (for add friend screen)
export interface UserSearchResult {
  user_id: string;
  username: string;
  total_picks: number;
  correct_picks: number;
  accuracy: number;
  friendship_status?: FriendshipStatus | null;
}
