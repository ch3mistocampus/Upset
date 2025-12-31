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
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonCard } from '../../components/SkeletonCard';
import type { Friend, FriendRequest } from '../../types/social';

type TabType = 'friends' | 'requests';

export default function Friends() {
  const router = useRouter();
  const toast = useToast();
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
      style={styles.friendCard}
      onPress={() => handleViewFriend(friend.friend_user_id)}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {friend.username.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{friend.username}</Text>
        <Text style={styles.friendStats}>
          {friend.accuracy.toFixed(1)}% accuracy • {friend.total_picks} picks
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  const renderRequestItem = (request: FriendRequest) => (
    <View key={request.request_id} style={styles.requestCard}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {request.username.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.requestInfo}>
        <Text style={styles.friendName}>{request.username}</Text>
        <Text style={styles.friendStats}>
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
          style={styles.declineButton}
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
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
            Friends ({friends.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
            Requests ({friendRequests.length})
          </Text>
          {friendRequests.length > 0 && (
            <View style={styles.badge}>
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
            tintColor="#d4202a"
            colors={['#d4202a']}
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
      <TouchableOpacity style={styles.fab} onPress={handleAddFriend} activeOpacity={0.8}>
        <Ionicons name="person-add" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#d4202a',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#fff',
  },
  badge: {
    marginLeft: 6,
    backgroundColor: '#d4202a',
    borderRadius: 10,
    paddingHorizontal: 6,
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
    padding: 16,
    paddingBottom: 100,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#d4202a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
    color: '#fff',
    marginBottom: 4,
  },
  friendStats: {
    fontSize: 13,
    color: '#999',
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
    backgroundColor: '#666',
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
    backgroundColor: '#d4202a',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
