/**
 * Friends screen - friends list, friend requests, add friends
 */

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFriends } from '../../hooks/useFriends';
import { useToast } from '../../hooks/useToast';
import { useTheme } from '../../lib/theme';
import { spacing, radius } from '../../lib/tokens';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/ui';
import { SkeletonCard } from '../../components/SkeletonCard';
import type { Friend, FriendRequest } from '../../types/social';

type TabType = 'friends' | 'requests';

export default function Friends() {
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [refreshing, setRefreshing] = useState(false);

  const {
    friends,
    friendRequests,
    friendsLoading,
    requestsLoading,
    friendsError,
    requestsError,
    refetchFriends,
    refetchRequests,
    acceptFriendRequest,
    acceptFriendRequestLoading,
    declineFriendRequest,
    declineFriendRequestLoading,
  } = useFriends();

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchFriends(), refetchRequests()]);
    setRefreshing(false);
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await acceptFriendRequest(requestId);
      toast.showSuccess('Friend request accepted!');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      toast.showError(error.message || 'Failed to accept request');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await declineFriendRequest(requestId);
      toast.showSuccess('Friend request declined');
    } catch (error: any) {
      toast.showError(error.message || 'Failed to decline request');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleViewFriend = (friendUserId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/friends/${friendUserId}`);
  };

  const handleAddFriend = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/friends/add');
  };

  const isLoading = activeTab === 'friends' ? friendsLoading : requestsLoading;
  const hasError = activeTab === 'friends' ? friendsError : requestsError;

  if (hasError) {
    return (
      <ErrorState
        message={`Failed to load ${activeTab}. Check your connection and try again.`}
        onRetry={() => (activeTab === 'friends' ? refetchFriends() : refetchRequests())}
      />
    );
  }

  const renderFriendItem = (friend: Friend) => (
    <TouchableOpacity
      key={friend.friend_user_id}
      style={[styles.friendCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => handleViewFriend(friend.friend_user_id)}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
        <Text style={styles.avatarText}>
          {friend.username.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.friendInfo}>
        <Text style={[styles.friendName, { color: colors.text }]}>{friend.username}</Text>
        <Text style={[styles.friendStats, { color: colors.textSecondary }]}>
          {friend.accuracy.toFixed(1)}% accuracy • {friend.total_picks} picks
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );

  const renderRequestItem = (request: FriendRequest) => (
    <View key={request.request_id} style={[styles.requestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
        <Text style={styles.avatarText}>
          {request.username.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.requestInfo}>
        <Text style={[styles.friendName, { color: colors.text }]}>{request.username}</Text>
        <Text style={[styles.friendStats, { color: colors.textSecondary }]}>
          {request.accuracy.toFixed(1)}% accuracy • {request.total_picks} picks
        </Text>
      </View>

      <View style={styles.requestActions}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAcceptRequest(request.request_id)}
          disabled={acceptFriendRequestLoading}
        >
          {acceptFriendRequestLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="checkmark" size={20} color="#fff" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.declineButton, { backgroundColor: colors.textMuted }]}
          onPress={() => handleDeclineRequest(request.request_id)}
          disabled={declineFriendRequestLoading}
        >
          {declineFriendRequestLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="close" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && { borderBottomColor: colors.accent }]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, { color: colors.textMuted }, activeTab === 'friends' && { color: colors.text }]}>
            Friends ({friends.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && { borderBottomColor: colors.accent }]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, { color: colors.textMuted }, activeTab === 'requests' && { color: colors.text }]}>
            Requests ({friendRequests.length})
          </Text>
          {friendRequests.length > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.accent }]}>
              <Text style={styles.badgeText}>{friendRequests.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : activeTab === 'friends' ? (
          friends.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title="No Friends Yet"
              message="Add friends to see their picks and compete on the leaderboard!"
              actionLabel="Add Friends"
              onAction={handleAddFriend}
            />
          ) : (
            friends.map(renderFriendItem)
          )
        ) : friendRequests.length === 0 ? (
          <EmptyState
            icon="mail-outline"
            title="No Pending Requests"
            message="When someone sends you a friend request, it will appear here."
          />
        ) : (
          friendRequests.map(renderRequestItem)
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={handleAddFriend}
        activeOpacity={0.8}
      >
        <Ionicons name="person-add" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  badge: {
    marginLeft: spacing.xs,
    borderRadius: 10,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  friendInfo: {
    flex: 1,
  },
  requestInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  friendStats: {
    fontSize: 13,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
