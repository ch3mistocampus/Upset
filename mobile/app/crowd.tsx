/**
 * The Crowd screen (stack version)
 * Following list with swipe-back navigation support
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
import { useFriends } from '../hooks/useFriends';
import { useTheme } from '../lib/theme';
import { useAuthGate } from '../hooks/useAuthGate';
import { spacing, typography } from '../lib/tokens';
import { ErrorState } from '../components/ErrorState';
import { EmptyState, SurfaceCard } from '../components/ui';
import { SkeletonCard } from '../components/SkeletonCard';
import { AuthPromptModal } from '../components/AuthPromptModal';
import { Avatar } from '../components/Avatar';
import type { Friend } from '../types/social';

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

export default function Crowd() {
  const router = useRouter();
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
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>The Crowd</Text>
          <View style={styles.headerSpacer} />
        </View>
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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>The Crowd</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ErrorState
          message="Failed to load following list. Check your connection and try again."
          onRetry={refetchFriends}
        />
      </View>
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
      <Animated.View style={[styles.header, { opacity: headerFadeAnim, paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          The Crowd ({friends.length})
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

        {/* Bottom padding */}
        <View style={{ height: 100 }} />
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
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -spacing.xs,
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontFamily: 'BebasNeue',
    fontSize: 24,
    letterSpacing: 0.5,
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
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
