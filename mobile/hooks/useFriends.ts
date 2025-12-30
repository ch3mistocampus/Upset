/**
 * Friends Management Hook
 * Sprint 2: Social Features
 *
 * Handles:
 * - Fetching friends list
 * - Fetching friend requests
 * - Sending friend requests
 * - Accepting/declining friend requests
 * - Removing friends
 * - Searching for users
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import type { Friend, FriendRequest, UserSearchResult } from '../types/social';

export function useFriends() {
  const queryClient = useQueryClient();

  // Fetch friends list
  const {
    data: friends,
    isLoading: friendsLoading,
    error: friendsError,
    refetch: refetchFriends,
  } = useQuery({
    queryKey: ['friends'],
    queryFn: async (): Promise<Friend[]> => {
      logger.breadcrumb('Fetching friends', 'friends');

      const { data, error } = await supabase.rpc('get_friends');

      if (error) {
        logger.error('Failed to fetch friends', error);
        throw error;
      }

      logger.debug('Friends fetched', { count: data?.length || 0 });
      return (data as Friend[]) || [];
    },
  });

  // Fetch friend requests
  const {
    data: friendRequests,
    isLoading: requestsLoading,
    error: requestsError,
    refetch: refetchRequests,
  } = useQuery({
    queryKey: ['friendRequests'],
    queryFn: async (): Promise<FriendRequest[]> => {
      logger.breadcrumb('Fetching friend requests', 'friends');

      const { data, error } = await supabase.rpc('get_friend_requests');

      if (error) {
        logger.error('Failed to fetch friend requests', error);
        throw error;
      }

      logger.debug('Friend requests fetched', { count: data?.length || 0 });
      return (data as FriendRequest[]) || [];
    },
  });

  // Send friend request
  const sendFriendRequest = useMutation({
    mutationFn: async (friendUserId: string) => {
      logger.breadcrumb('Sending friend request', 'friends', { friendUserId });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase.from('friendships').insert({
        user_id: user.id,
        friend_id: friendUserId,
        status: 'pending',
      });

      if (error) {
        logger.error('Failed to send friend request', error, { friendUserId });
        throw error;
      }

      logger.info('Friend request sent', { friendUserId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['userSearch'] });
    },
  });

  // Accept friend request
  const acceptFriendRequest = useMutation({
    mutationFn: async (requestId: string) => {
      logger.breadcrumb('Accepting friend request', 'friends', { requestId });

      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) {
        logger.error('Failed to accept friend request', error, { requestId });
        throw error;
      }

      logger.info('Friend request accepted', { requestId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
    },
  });

  // Decline friend request
  const declineFriendRequest = useMutation({
    mutationFn: async (requestId: string) => {
      logger.breadcrumb('Declining friend request', 'friends', { requestId });

      const { error } = await supabase
        .from('friendships')
        .update({ status: 'declined' })
        .eq('id', requestId);

      if (error) {
        logger.error('Failed to decline friend request', error, { requestId });
        throw error;
      }

      logger.info('Friend request declined', { requestId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
    },
  });

  // Remove friend (unfriend)
  const removeFriend = useMutation({
    mutationFn: async (friendUserId: string) => {
      logger.breadcrumb('Removing friend', 'friends', { friendUserId });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      // Delete friendship (works both ways due to RLS policy)
      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(`user_id.eq.${friendUserId},friend_id.eq.${friendUserId}`);

      if (error) {
        logger.error('Failed to remove friend', error, { friendUserId });
        throw error;
      }

      logger.info('Friend removed', { friendUserId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });

  // Search for users
  const searchUsers = async (searchTerm: string): Promise<UserSearchResult[]> => {
    logger.breadcrumb('Searching users', 'friends', { searchTerm });

    if (!searchTerm.trim()) {
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
      .ilike('username', `%${searchTerm}%`)
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
      .select('user_id, total_picks, correct_picks')
      .in(
        'user_id',
        profiles.map((p) => p.user_id)
      );

    if (statsError) {
      logger.warn('Failed to fetch user stats for search', statsError);
    }

    // Get existing friendships
    const { data: friendships, error: friendshipError } = await supabase
      .from('friendships')
      .select('user_id, friend_id, status')
      .or(
        `and(user_id.eq.${user.id},friend_id.in.(${profiles.map((p) => p.user_id).join(',')})),` +
          `and(friend_id.eq.${user.id},user_id.in.(${profiles.map((p) => p.user_id).join(',')}))`
      );

    if (friendshipError) {
      logger.warn('Failed to fetch friendships for search', friendshipError);
    }

    // Combine data
    const results: UserSearchResult[] = profiles.map((profile) => {
      const userStats = stats?.find((s) => s.user_id === profile.user_id);
      const friendship = friendships?.find(
        (f) =>
          (f.user_id === user.id && f.friend_id === profile.user_id) ||
          (f.friend_id === user.id && f.user_id === profile.user_id)
      );

      const totalPicks = userStats?.total_picks || 0;
      const correctPicks = userStats?.correct_picks || 0;
      const accuracy = totalPicks > 0 ? Math.round((correctPicks / totalPicks) * 100 * 10) / 10 : 0;

      return {
        user_id: profile.user_id,
        username: profile.username,
        total_picks: totalPicks,
        correct_picks: correctPicks,
        accuracy,
        friendship_status: friendship?.status || null,
      };
    });

    logger.debug('Users search results', { count: results.length });
    return results;
  };

  return {
    // Data
    friends: friends || [],
    friendRequests: friendRequests || [],

    // Loading states
    friendsLoading,
    requestsLoading,

    // Errors
    friendsError,
    requestsError,

    // Mutations
    sendFriendRequest: sendFriendRequest.mutateAsync,
    sendFriendRequestLoading: sendFriendRequest.isPending,
    acceptFriendRequest: acceptFriendRequest.mutateAsync,
    acceptFriendRequestLoading: acceptFriendRequest.isPending,
    declineFriendRequest: declineFriendRequest.mutateAsync,
    declineFriendRequestLoading: declineFriendRequest.isPending,
    removeFriend: removeFriend.mutateAsync,
    removeFriendLoading: removeFriend.isPending,

    // Search
    searchUsers,

    // Refetch
    refetchFriends,
    refetchRequests,
  };
}
