/**
 * Social Follow Hook
 *
 * Handles:
 * - Fetching following list (people you follow)
 * - Following/unfollowing users
 * - Searching for users
 *
 * Uses 'follows' table with 'accepted' status for follows
 * (one-way relationship - you follow someone, they don't auto-follow back)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import type { Friend, FriendRequest, UserSearchResult } from '../types/social';

export function useFriends() {
  const queryClient = useQueryClient();

  // Fetch people you're following
  const {
    data: friends,
    isLoading: friendsLoading,
    error: friendsError,
    refetch: refetchFriends,
  } = useQuery({
    queryKey: ['friends'],
    queryFn: async (): Promise<Friend[]> => {
      logger.breadcrumb('Fetching following list', 'friends');

      const { data, error } = await supabase.rpc('get_friends');

      if (error) {
        logger.error('Failed to fetch following', error);
        throw error;
      }

      logger.debug('Following fetched', { count: data?.length || 0 });
      return (data as Friend[]) || [];
    },
  });

  // Fetch follow requests (pending)
  const {
    data: friendRequests,
    isLoading: requestsLoading,
    error: requestsError,
    refetch: refetchRequests,
  } = useQuery({
    queryKey: ['friendRequests'],
    queryFn: async (): Promise<FriendRequest[]> => {
      logger.breadcrumb('Fetching follow requests', 'friends');

      const { data, error } = await supabase.rpc('get_friend_requests');

      if (error) {
        logger.error('Failed to fetch follow requests', error);
        throw error;
      }

      logger.debug('Follow requests fetched', { count: data?.length || 0 });
      return (data as FriendRequest[]) || [];
    },
  });

  // Follow a user (creates accepted friendship directly for follow model)
  const followUser = useMutation({
    mutationFn: async (targetUserId: string) => {
      logger.breadcrumb('Following user', 'friends', { targetUserId });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      // For follow model, we create an accepted follow directly
      const { error } = await supabase.from('follows').insert({
        user_id: user.id,
        following_id: targetUserId,
        status: 'accepted', // Direct follow, no pending state
      });

      if (error) {
        logger.error('Failed to follow user', error, { targetUserId });
        throw error;
      }

      logger.info('User followed', { targetUserId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['userSearch'] });
    },
  });

  // Unfollow a user
  const unfollowUser = useMutation({
    mutationFn: async (targetUserId: string) => {
      logger.breadcrumb('Unfollowing user', 'friends', { targetUserId });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      // Delete the follow relationship where current user is the follower
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('user_id', user.id)
        .eq('following_id', targetUserId);

      if (error) {
        logger.error('Failed to unfollow user', error, { targetUserId });
        throw error;
      }

      logger.info('User unfollowed', { targetUserId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });

  // Search for users
  const searchUsers = async (searchTerm: string): Promise<UserSearchResult[]> => {
    logger.breadcrumb('Searching users', 'friends', { searchTerm });

    // Remove @ prefix if present for search
    const cleanSearchTerm = searchTerm.replace(/^@/, '').trim();

    if (!cleanSearchTerm) {
      return [];
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    // Search profiles by username
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, username')
      .ilike('username', `%${cleanSearchTerm}%`)
      .neq('user_id', user.id) // Exclude current user
      .limit(20);

    if (profileError) {
      logger.error('Failed to search users', profileError, { searchTerm });
      throw profileError;
    }

    if (!profiles || profiles.length === 0) {
      logger.debug('No users found', { searchTerm });
      return [];
    }

    // Get user stats for each profile
    const { data: stats, error: statsError } = await supabase
      .from('user_stats')
      .select('user_id, total_picks, correct_winner')
      .in(
        'user_id',
        profiles.map((p) => p.user_id)
      );

    if (statsError) {
      logger.warn('Failed to fetch user stats for search', statsError);
    }

    // Get existing follow relationships
    const { data: followRecords, error: followError } = await supabase
      .from('follows')
      .select('user_id, following_id, status')
      .eq('user_id', user.id)
      .in('following_id', profiles.map((p) => p.user_id));

    if (followError) {
      logger.warn('Failed to fetch follow status for search', followError);
    }

    // Combine data
    const results: UserSearchResult[] = profiles.map((profile) => {
      const userStats = stats?.find((s) => s.user_id === profile.user_id);
      const followRecord = followRecords?.find((f) => f.following_id === profile.user_id);

      const totalPicks = userStats?.total_picks || 0;
      const correctPicks = userStats?.correct_winner || 0;
      const accuracy = totalPicks > 0 ? Math.round((correctPicks / totalPicks) * 100 * 10) / 10 : 0;

      return {
        user_id: profile.user_id,
        username: profile.username,
        total_picks: totalPicks,
        correct_picks: correctPicks,
        accuracy,
        friendship_status: followRecord?.status || null,
      };
    });

    logger.debug('Users search results', { count: results.length });
    return results;
  };

  // Check if current user is following a specific user
  const checkFollowing = async (targetUserId: string): Promise<boolean> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('user_id', user.id)
      .eq('following_id', targetUserId)
      .eq('status', 'accepted')
      .maybeSingle();

    return !!data;
  };

  // Get followers for a specific user (people who follow them)
  const getFollowers = async (userId: string): Promise<UserSearchResult[]> => {
    logger.breadcrumb('Fetching followers', 'follows', { userId });

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    // Get all follows where this user is the following_id (being followed)
    const { data: followRecords, error: followError } = await supabase
      .from('follows')
      .select('user_id')
      .eq('following_id', userId)
      .eq('status', 'accepted');

    if (followError) {
      logger.error('Failed to fetch followers', followError);
      throw followError;
    }

    if (!followRecords || followRecords.length === 0) {
      return [];
    }

    const followerIds = followRecords.map((f) => f.user_id);

    // Get profiles for these followers
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, username')
      .in('user_id', followerIds);

    if (profileError) {
      logger.error('Failed to fetch follower profiles', profileError);
      throw profileError;
    }

    // Get stats
    const { data: stats } = await supabase
      .from('user_stats')
      .select('user_id, total_picks, correct_winner')
      .in('user_id', followerIds);

    // Check if current user follows any of these users
    let currentUserFollowing: string[] = [];
    if (currentUser) {
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('user_id', currentUser.id)
        .eq('status', 'accepted')
        .in('following_id', followerIds);
      currentUserFollowing = following?.map((f) => f.following_id) || [];
    }

    return (profiles || []).map((profile) => {
      const userStats = stats?.find((s) => s.user_id === profile.user_id);
      const totalPicks = userStats?.total_picks || 0;
      const correctPicks = userStats?.correct_winner || 0;
      const accuracy = totalPicks > 0 ? Math.round((correctPicks / totalPicks) * 100 * 10) / 10 : 0;

      return {
        user_id: profile.user_id,
        username: profile.username,
        total_picks: totalPicks,
        correct_picks: correctPicks,
        accuracy,
        friendship_status: currentUserFollowing.includes(profile.user_id) ? 'accepted' : null,
      };
    });
  };

  // Get following for a specific user (people they follow)
  const getFollowing = async (userId: string): Promise<UserSearchResult[]> => {
    logger.breadcrumb('Fetching following', 'follows', { userId });

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    // Get all follows where this user is the user_id (follower)
    const { data: followRecords, error: followError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('user_id', userId)
      .eq('status', 'accepted');

    if (followError) {
      logger.error('Failed to fetch following', followError);
      throw followError;
    }

    if (!followRecords || followRecords.length === 0) {
      return [];
    }

    const followingIds = followRecords.map((f) => f.following_id);

    // Get profiles for these users
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, username')
      .in('user_id', followingIds);

    if (profileError) {
      logger.error('Failed to fetch following profiles', profileError);
      throw profileError;
    }

    // Get stats
    const { data: stats } = await supabase
      .from('user_stats')
      .select('user_id, total_picks, correct_winner')
      .in('user_id', followingIds);

    // Check if current user follows any of these users
    let currentUserFollowing: string[] = [];
    if (currentUser) {
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('user_id', currentUser.id)
        .eq('status', 'accepted')
        .in('following_id', followingIds);
      currentUserFollowing = following?.map((f) => f.following_id) || [];
    }

    return (profiles || []).map((profile) => {
      const userStats = stats?.find((s) => s.user_id === profile.user_id);
      const totalPicks = userStats?.total_picks || 0;
      const correctPicks = userStats?.correct_winner || 0;
      const accuracy = totalPicks > 0 ? Math.round((correctPicks / totalPicks) * 100 * 10) / 10 : 0;

      return {
        user_id: profile.user_id,
        username: profile.username,
        total_picks: totalPicks,
        correct_picks: correctPicks,
        accuracy,
        friendship_status: currentUserFollowing.includes(profile.user_id) ? 'accepted' : null,
      };
    });
  };

  return {
    // Data
    friends: friends || [],
    friendRequests: friendRequests || [],
    following: friends || [], // Alias for clarity

    // Loading states
    friendsLoading,
    requestsLoading,
    followLoading: followUser.isPending,
    unfollowLoading: unfollowUser.isPending,

    // Legacy loading state names for compatibility
    sendRequestLoading: followUser.isPending,
    acceptRequestLoading: false, // Not needed in follow model
    removeFriendLoading: unfollowUser.isPending,
    acceptFriendRequestLoading: false, // Legacy - not needed in follow model
    declineFriendRequestLoading: false, // Legacy - not needed in follow model

    // Errors
    friendsError,
    requestsError,

    // Actions - new names
    follow: followUser.mutateAsync,
    unfollow: unfollowUser.mutateAsync,

    // Legacy action names for compatibility
    sendRequest: followUser.mutateAsync,
    acceptRequest: async () => {}, // No-op in follow model
    removeFriend: unfollowUser.mutateAsync,
    acceptFriendRequest: async (_requestId: string) => {}, // Legacy - no-op in follow model
    declineFriendRequest: async (_requestId: string) => {}, // Legacy - no-op in follow model

    // Search
    searchUsers,
    checkFollowing,

    // Followers/Following lists
    getFollowers,
    getFollowing,

    // Refetch
    refetchFriends,
    refetchRequests,
  };
}
