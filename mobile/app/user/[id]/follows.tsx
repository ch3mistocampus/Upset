/**
 * Followers/Following list screen
 * Shows list of users who follow or are followed by a user
 */

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Easing,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFriends } from '../../../hooks/useFriends';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { useTheme } from '../../../lib/theme';
import { spacing } from '../../../lib/tokens';
import { SurfaceCard, EmptyState } from '../../../components/ui';
import type { UserSearchResult } from '../../../types/social';

type TabType = 'followers' | 'following';

// Infinity loop loader with glow effect
function InfinityLoader({ color }: { color: string }) {
  const progress = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Subtle pulsing glow on the track
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    glowAnimation.start();
    return () => {
      animation.stop();
      glowAnimation.stop();
    };
  }, [progress, glowAnim]);

  // Figure-8 path parameters
  const a = 24; // horizontal extent
  const b = 10; // vertical extent

  // Figure-8 path with smooth crossing
  const translateX = progress.interpolate({
    inputRange: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1],
    outputRange: [a, a * 0.707, 0, -a * 0.707, -a, -a * 0.707, 0, a * 0.707, a],
  });

  const translateY = progress.interpolate({
    inputRange: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1],
    outputRange: [0, b * 0.5, b, b * 0.5, 0, -b * 0.5, -b, -b * 0.5, 0],
  });

  const dotScale = progress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1.1, 1, 1.1, 1, 1.1],
  });

  const trackGlowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.3],
  });

  return (
    <View style={infinityStyles.container}>
      {/* Infinity track - two overlapping circles */}
      <View style={infinityStyles.trackContainer}>
        {/* Left loop */}
        <Animated.View
          style={[
            infinityStyles.loop,
            infinityStyles.leftLoop,
            {
              borderColor: color,
              opacity: trackGlowOpacity,
              shadowColor: color,
              shadowOpacity: 0.5,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 0 },
            },
          ]}
        />
        {/* Right loop */}
        <Animated.View
          style={[
            infinityStyles.loop,
            infinityStyles.rightLoop,
            {
              borderColor: color,
              opacity: trackGlowOpacity,
              shadowColor: color,
              shadowOpacity: 0.5,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 0 },
            },
          ]}
        />
      </View>

      {/* Animated dot with glow */}
      <Animated.View
        style={[
          infinityStyles.dot,
          {
            backgroundColor: color,
            transform: [{ translateX }, { translateY }, { scale: dotScale }],
            shadowColor: color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 8,
          },
        ]}
      />
    </View>
  );
}

const infinityStyles = StyleSheet.create({
  container: {
    width: 80,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loop: {
    width: 28,
    height: 22,
    borderWidth: 2.5,
    borderRadius: 11,
  },
  leftLoop: {
    marginRight: -6,
  },
  rightLoop: {
    marginLeft: -6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default function FollowsScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ id: string; tab?: string }>();
  const id = params.id;
  const initialTab = (params.tab as TabType) || 'followers';
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const { getFollowers, getFollowing, follow, unfollow } = useFriends();

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = activeTab === 'followers'
          ? await getFollowers(id)
          : await getFollowing(id);
        if (isMounted.current) {
          setUsers(data);
        }
      } catch (error: any) {
        if (isMounted.current) {
          toast.showError(error.message || 'Failed to load users');
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };

    fetchData();
  }, [id, activeTab]);

  const onRefresh = async () => {
    if (!id) return;
    setRefreshing(true);
    try {
      const data = activeTab === 'followers'
        ? await getFollowers(id)
        : await getFollowing(id);
      if (isMounted.current) {
        setUsers(data);
      }
    } catch (error: any) {
      if (isMounted.current) {
        toast.showError(error.message || 'Failed to refresh');
      }
    } finally {
      if (isMounted.current) {
        setRefreshing(false);
      }
    }
  };

  const handleTabChange = (newTab: TabType) => {
    if (newTab !== activeTab) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActiveTab(newTab);
      setIsLoading(true);
    }
  };

  const handleFollow = async (targetUser: UserSearchResult) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPendingActions((prev) => new Set(prev).add(targetUser.user_id));

      await follow(targetUser.user_id);

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === targetUser.user_id ? { ...u, friendship_status: 'accepted' } : u
        )
      );
      toast.showNeutral(`Following @${targetUser.username}`);
    } catch (error: any) {
      toast.showError(error.message || 'Failed to follow');
    } finally {
      setPendingActions((prev) => {
        const next = new Set(prev);
        next.delete(targetUser.user_id);
        return next;
      });
    }
  };

  const handleUnfollow = async (targetUser: UserSearchResult) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPendingActions((prev) => new Set(prev).add(targetUser.user_id));

      await unfollow(targetUser.user_id);

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === targetUser.user_id ? { ...u, friendship_status: null } : u
        )
      );
      toast.showNeutral(`Unfollowed @${targetUser.username}`);
    } catch (error: any) {
      toast.showError(error.message || 'Failed to unfollow');
    } finally {
      setPendingActions((prev) => {
        const next = new Set(prev);
        next.delete(targetUser.user_id);
        return next;
      });
    }
  };

  const handleUserPress = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/user/${userId}`);
  };

  const renderUserItem = (userItem: UserSearchResult) => {
    const isCurrentUser = user?.id === userItem.user_id;
    const isFollowing = userItem.friendship_status === 'accepted';
    const isPending = pendingActions.has(userItem.user_id);

    return (
      <SurfaceCard key={userItem.user_id} weakWash style={styles.userCard}>
        <TouchableOpacity
          style={styles.userRow}
          onPress={() => handleUserPress(userItem.user_id)}
          activeOpacity={0.7}
        >
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={styles.avatarText}>
              {userItem.username.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.userInfo}>
            <Text style={[styles.username, { color: colors.text }]}>
              @{userItem.username}
            </Text>
            <Text style={[styles.userStats, { color: colors.textSecondary }]}>
              {userItem.accuracy.toFixed(1)}% accuracy
            </Text>
          </View>

          {!isCurrentUser && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: isFollowing ? colors.surfaceAlt : colors.accent },
              ]}
              onPress={() => isFollowing ? handleUnfollow(userItem) : handleFollow(userItem)}
              disabled={isPending}
              activeOpacity={0.8}
            >
              {isPending ? (
                <ActivityIndicator size="small" color={isFollowing ? colors.text : '#fff'} />
              ) : (
                <Text
                  style={[
                    styles.actionButtonText,
                    { color: isFollowing ? colors.textSecondary : '#fff' },
                  ]}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </SurfaceCard>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {activeTab === 'followers' ? 'Followers' : 'Following'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'followers' && { borderBottomColor: colors.accent }]}
          onPress={() => handleTabChange('followers')}
        >
          <Text
            style={[
              styles.tabText,
              { color: colors.textTertiary },
              activeTab === 'followers' && { color: colors.text },
            ]}
          >
            Followers
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && { borderBottomColor: colors.accent }]}
          onPress={() => handleTabChange('following')}
        >
          <Text
            style={[
              styles.tabText,
              { color: colors.textTertiary },
              activeTab === 'following' && { color: colors.text },
            ]}
          >
            Following
          </Text>
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
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <InfinityLoader color={colors.accent} />
          </View>
        ) : users.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title={activeTab === 'followers' ? 'No Followers' : 'Not Following Anyone'}
            message={
              activeTab === 'followers'
                ? 'No one is following this user yet.'
                : 'This user is not following anyone yet.'
            }
          />
        ) : (
          users.map(renderUserItem)
        )}
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: 60,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  placeholder: {
    width: 32,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  userCard: {
    marginBottom: spacing.sm,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  userStats: {
    fontSize: 13,
  },
  actionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 14,
    minWidth: 80,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
