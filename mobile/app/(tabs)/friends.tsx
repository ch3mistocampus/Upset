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
  Animated,
  Easing,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { Avatar } from '../../components/Avatar';
import type { Friend } from '../../types/social';

// Note: Follow requests tab removed - using X-style instant follow model

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
  const insets = useSafeAreaInsets();
  const { showGate, closeGate, openGate, isGuest, gateContext } = useAuthGate();
  const [refreshing, setRefreshing] = useState(false);
  const [gateDismissed, setGateDismissed] = useState(false);

  // Entrance animations
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
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

  // All hooks must be called before any conditional returns
  const {
    friends,
    friendsLoading,
    friendsError,
    refetchFriends,
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
    await refetchFriends();
    setRefreshing(false);
  };

  const handleViewFriend = (friendUserId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/user/${friendUserId}`);
  };

  const handleAddFriend = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/friends/add');
  };

  if (friendsError) {
    return (
      <ErrorState
        message="Failed to load following list. Check your connection and try again."
        onRetry={refetchFriends}
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
            <View style={styles.avatarContainer}>
              <Avatar
                imageUrl={friend.avatar_url}
                username={friend.username}
                size="small"
              />
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Animated.View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, opacity: headerFadeAnim, paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.replace('/(tabs)/discover');
          }}
          style={styles.backButton}
          accessibilityLabel="Go back to Discover"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Following ({friends.length})
        </Text>
        <View style={styles.headerSpacer} />
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
        {friendsLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : friends.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="Not Following Anyone"
            message="Follow users to see their picks and compete on the leaderboard!"
            actionLabel="Find Users"
            onAction={handleAddFriend}
            secondaryActionLabel="View Leaderboard"
            secondaryOnAction={() => router.push('/(tabs)/leaderboards')}
          />
        ) : (
          friends.map((friend, index) => renderFriendItem(friend, index))
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  backButton: {
    marginRight: spacing.sm,
    marginLeft: -spacing.xs,
    padding: spacing.xs,
  },
  headerSpacer: {
    width: 36,
  },
  headerTitle: {
    fontFamily: 'BebasNeue',
    fontSize: 22,
    letterSpacing: 0.3,
    flex: 1,
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
  avatarContainer: {
    marginRight: spacing.sm,
  },
  friendInfo: {
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
