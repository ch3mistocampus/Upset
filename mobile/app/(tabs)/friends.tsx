/**
 * People screen - following list, follow requests, find users
 * Uses X-style followers/following model instead of mutual friendships
 * Requires authentication - shows gate for guests
 * Theme-aware design with SurfaceCard and entrance animations
 */

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFriends } from '../../hooks/useFriends';
import { useToast } from '../../hooks/useToast';
import { useTheme } from '../../lib/theme';
import { useAuthGate } from '../../hooks/useAuthGate';
import { spacing, radius, typography } from '../../lib/tokens';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState, SurfaceCard } from '../../components/ui';
import { SkeletonCard } from '../../components/SkeletonCard';
import { AuthPromptModal } from '../../components/AuthPromptModal';
import type { Friend, FriendRequest } from '../../types/social';

type TabType = 'following' | 'requests';

// Animated friend card wrapper
function AnimatedFriendCard({ children, index }: { children: React.ReactNode; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    const delay = 60 + index * 60;
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateAnim, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [fadeAnim, translateAnim, index]);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: translateAnim }],
      }}
    >
      {children}
    </Animated.View>
  );
}

export default function Friends() {
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();
  const { showGate, closeGate, openGate, isGuest, gateContext } = useAuthGate();
  const [activeTab, setActiveTab] = useState<TabType>('following');
  const [refreshing, setRefreshing] = useState(false);
  const [gateDismissed, setGateDismissed] = useState(false);

  // Entrance animations
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const tabIndicatorPosition = useRef(new Animated.Value(0)).current;
  const fabScaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Header entrance
    Animated.timing(headerFadeAnim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // FAB entrance with spring
    setTimeout(() => {
      Animated.spring(fabScaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 15,
        useNativeDriver: true,
      }).start();
    }, 300);
  }, [headerFadeAnim, fabScaleAnim]);

  // Animate tab indicator
  useEffect(() => {
    Animated.spring(tabIndicatorPosition, {
      toValue: activeTab === 'following' ? 0 : 1,
      tension: 300,
      friction: 20,
      useNativeDriver: true,
    }).start();
  }, [activeTab, tabIndicatorPosition]);

  // All hooks must be called before any conditional returns
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

  // Show gate immediately for guests
  useEffect(() => {
    if (isGuest && !gateDismissed) {
      openGate('friends');
    }
  }, [isGuest, gateDismissed, openGate]);

  const handleCloseGate = () => {
    closeGate();
    setGateDismissed(true);
  };

  const handleSignIn = () => {
    router.push('/(auth)/sign-in');
  };

  // If guest and gate dismissed, show placeholder
  if (isGuest && gateDismissed && !showGate) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="people-outline"
          title="Friends require an account"
          message="Sign in to add friends and compare your picks."
          actionLabel="Sign In"
          onAction={handleSignIn}
        />
      </View>
    );
  }

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
    router.push(`/user/${friendUserId}`);
  };

  const handleAddFriend = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/friends/add');
  };

  const isLoading = activeTab === 'following' ? friendsLoading : requestsLoading;
  const hasError = activeTab === 'following' ? friendsError : requestsError;

  if (hasError) {
    return (
      <ErrorState
        message={`Failed to load ${activeTab}. Check your connection and try again.`}
        onRetry={() => (activeTab === 'following' ? refetchFriends() : refetchRequests())}
      />
    );
  }

  const renderFriendItem = (friend: Friend, index: number) => (
    <AnimatedFriendCard key={friend.friend_user_id} index={index}>
      <TouchableOpacity
        onPress={() => handleViewFriend(friend.friend_user_id)}
        activeOpacity={0.9}
      >
        <SurfaceCard weakWash>
          <View style={styles.friendCardRow}>
            <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
              <Text style={styles.avatarText}>
                {friend.username.charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={styles.friendInfo}>
              <Text style={[styles.friendName, { color: colors.text }]}>@{friend.username}</Text>
              <Text style={[styles.friendStats, { color: colors.textSecondary }]}>
                {friend.accuracy.toFixed(1)}% accuracy • {friend.total_picks} picks
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </View>
        </SurfaceCard>
      </TouchableOpacity>
    </AnimatedFriendCard>
  );

  const renderRequestItem = (request: FriendRequest, index: number) => (
    <AnimatedFriendCard key={request.request_id} index={index}>
      <SurfaceCard weakWash>
        <View style={styles.requestCardRow}>
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={styles.avatarText}>
              {request.username.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.requestInfo}>
            <Text style={[styles.friendName, { color: colors.text }]}>@{request.username}</Text>
            <Text style={[styles.friendStats, { color: colors.textSecondary }]}>
              {request.accuracy.toFixed(1)}% accuracy • {request.total_picks} picks
            </Text>
          </View>

          <View style={styles.requestActions}>
            <TouchableOpacity
              style={[styles.acceptButton, { backgroundColor: colors.success }]}
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
              style={[styles.declineButton, { backgroundColor: colors.surfaceAlt }]}
              onPress={() => handleDeclineRequest(request.request_id)}
              disabled={declineFriendRequestLoading}
            >
              {declineFriendRequestLoading ? (
                <ActivityIndicator size="small" color={colors.textTertiary} />
              ) : (
                <Ionicons name="close" size={20} color={colors.textTertiary} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SurfaceCard>
    </AnimatedFriendCard>
  );

  const handleTabPress = (tab: TabType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tabs */}
      <Animated.View style={[styles.tabContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border, opacity: headerFadeAnim }]}>
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => handleTabPress('following')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'following' ? colors.text : colors.textTertiary }]}>
              Following ({friends.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tab}
            onPress={() => handleTabPress('requests')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'requests' ? colors.text : colors.textTertiary }]}>
              Follow Requests
            </Text>
            {friendRequests.length > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                <Text style={styles.badgeText}>{friendRequests.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Animated tab indicator */}
        <Animated.View
          style={[
            styles.tabIndicator,
            { backgroundColor: colors.accent },
            {
              transform: [
                {
                  translateX: tabIndicatorPosition.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 180], // Approximate half-width
                  }),
                },
              ],
            },
          ]}
        />
      </Animated.View>

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
        ) : activeTab === 'following' ? (
          friends.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title="Not Following Anyone"
              message="Follow users to see their picks and compete on the leaderboard!"
              actionLabel="Find Users"
              onAction={handleAddFriend}
            />
          ) : (
            friends.map((friend, index) => renderFriendItem(friend, index))
          )
        ) : friendRequests.length === 0 ? (
          <EmptyState
            icon="mail-outline"
            title="No Follow Requests"
            message="When someone wants to follow you, their request will appear here."
          />
        ) : (
          friendRequests.map((request, index) => renderRequestItem(request, index))
        )}
      </ScrollView>

      {/* FAB with entrance animation */}
      <Animated.View
        style={[
          styles.fab,
          { backgroundColor: colors.accent },
          { transform: [{ scale: fabScaleAnim }] },
        ]}
      >
        <TouchableOpacity
          style={styles.fabTouchable}
          onPress={handleAddFriend}
          activeOpacity={0.8}
        >
          <Ionicons name="person-add" size={24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* Auth Gate Modal */}
      <AuthPromptModal
        visible={showGate}
        onClose={handleCloseGate}
        onSignIn={handleSignIn}
        context={gateContext || 'friends'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    borderBottomWidth: 1,
  },
  tabsRow: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  tabText: {
    ...typography.body,
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '50%',
    height: 2,
    borderRadius: 1,
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
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
    gap: spacing.sm,
  },
  friendCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '700',
    color: '#fff',
  },
  friendInfo: {
    flex: 1,
  },
  requestInfo: {
    flex: 1,
  },
  friendName: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  friendStats: {
    ...typography.meta,
  },
  requestActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    bottom: 120,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  fabTouchable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
