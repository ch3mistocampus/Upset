/**
 * Discover Screen
 *
 * Activity feed for user discovery with:
 * - Discover tab (engagement-ranked public activities)
 * - Following tab (activities from people you follow)
 * - Trending users section
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import {
  useDiscoverFeed,
  useFollowingFeed,
  useTrendingUsers,
  useNewActivityCount,
  ActivityItem,
  TrendingUser,
  formatActivityDescription,
  getActivityIcon,
} from '../../hooks/useFeed';
import { useFriends } from '../../hooks/useFriends';
import { useLike } from '../../hooks/useLikes';
import { useUserSuggestions, getSuggestionReasonText } from '../../hooks/useSuggestions';

type FeedTab = 'discover' | 'following';

export default function DiscoverScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FeedTab>('discover');
  const [lastRefreshTime, setLastRefreshTime] = useState<string | null>(null);
  const newPostsAnim = useRef(new Animated.Value(0)).current;

  const discoverFeed = useDiscoverFeed();
  const followingFeed = useFollowingFeed();
  const { data: trendingUsers, refetch: refetchTrending } = useTrendingUsers();
  const { data: suggestions } = useUserSuggestions(5);
  const { follow, followLoading } = useFriends();
  const { toggleLike, isToggling } = useLike();

  // Track new posts since last refresh
  const { data: newPostsCount } = useNewActivityCount(lastRefreshTime);

  const activeFeed = activeTab === 'discover' ? discoverFeed : followingFeed;
  const activities = activeFeed.data?.pages.flat() || [];

  // Set initial refresh time on mount
  useEffect(() => {
    if (!lastRefreshTime && activities.length > 0) {
      setLastRefreshTime(activities[0]?.created_at || new Date().toISOString());
    }
  }, [activities, lastRefreshTime]);

  // Animate new posts banner
  useEffect(() => {
    if (newPostsCount && newPostsCount > 0) {
      Animated.spring(newPostsAnim, {
        toValue: 1,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }).start();
    } else {
      newPostsAnim.setValue(0);
    }
  }, [newPostsCount, newPostsAnim]);

  const handleRefresh = useCallback(() => {
    activeFeed.refetch();
    setLastRefreshTime(new Date().toISOString());
    if (activeTab === 'discover') {
      refetchTrending();
    }
  }, [activeFeed, activeTab, refetchTrending]);

  const handleNewPostsTap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    handleRefresh();
  }, [handleRefresh]);

  const handleLoadMore = useCallback(() => {
    if (activeFeed.hasNextPage && !activeFeed.isFetchingNextPage) {
      activeFeed.fetchNextPage();
    }
  }, [activeFeed]);

  const handleUserPress = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/user/${userId}`);
  };

  const handleFollow = async (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await follow(userId);
    } catch {
      // Error handled in hook
    }
  };

  const handleLike = async (activityId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await toggleLike(activityId);
    } catch {
      // Error handled in hook
    }
  };

  const renderActivityItem = ({ item }: { item: ActivityItem }) => (
    <TouchableOpacity
      style={[styles.activityCard, { backgroundColor: colors.card }]}
      onPress={() => handleUserPress(item.user_id)}
      activeOpacity={0.7}
    >
      <View style={styles.activityHeader}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
            <Ionicons name="person" size={20} color={colors.textSecondary} />
          </View>
        )}
        <View style={styles.activityContent}>
          <Text style={[styles.username, { color: colors.text }]}>
            @{item.username}
          </Text>
          <Text style={[styles.activityText, { color: colors.textSecondary }]}>
            {getActivityIcon(item.activity_type)} {formatActivityDescription(item)}
          </Text>
          <View style={styles.activityFooter}>
            <Text style={[styles.timestamp, { color: colors.textTertiary }]}>
              {formatTimeAgo(item.created_at)}
            </Text>
            <TouchableOpacity
              style={styles.likeButton}
              onPress={() => handleLike(item.id)}
              disabled={isToggling}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={item.is_liked ? 'heart' : 'heart-outline'}
                size={18}
                color={item.is_liked ? colors.danger : colors.textTertiary}
              />
              {item.like_count > 0 && (
                <Text
                  style={[
                    styles.likeCount,
                    { color: item.is_liked ? colors.danger : colors.textTertiary },
                  ]}
                >
                  {item.like_count}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderTrendingUser = ({ item }: { item: TrendingUser }) => (
    <TouchableOpacity
      style={[styles.trendingCard, { backgroundColor: colors.card }]}
      onPress={() => handleUserPress(item.user_id)}
      activeOpacity={0.7}
    >
      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={styles.trendingAvatar} />
      ) : (
        <View style={[styles.trendingAvatarPlaceholder, { backgroundColor: colors.border }]}>
          <Ionicons name="person" size={24} color={colors.textSecondary} />
        </View>
      )}
      <Text style={[styles.trendingUsername, { color: colors.text }]} numberOfLines={1}>
        @{item.username}
      </Text>
      <Text style={[styles.trendingStats, { color: colors.textSecondary }]}>
        {item.accuracy}% · {item.current_streak}🔥
      </Text>
      {!item.is_following && (
        <TouchableOpacity
          style={[styles.followButton, { backgroundColor: colors.primary }]}
          onPress={() => handleFollow(item.user_id)}
          disabled={followLoading}
        >
          <Text style={styles.followButtonText}>Follow</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View>
      {/* Trending Section */}
      {activeTab === 'discover' && trendingUsers && trendingUsers.length > 0 && (
        <View style={styles.trendingSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            🔥 Trending Pickers
          </Text>
          <FlatList
            data={trendingUsers.slice(0, 10)}
            renderItem={renderTrendingUser}
            keyExtractor={(item) => item.user_id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingList}
          />
        </View>
      )}

      {/* Activity Section Header */}
      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.lg }]}>
        {activeTab === 'discover' ? '✨ Recent Activity' : '👥 From People You Follow'}
      </Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name={activeTab === 'discover' ? 'compass-outline' : 'people-outline'}
        size={64}
        color={colors.textTertiary}
      />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {activeTab === 'discover' ? 'No activities yet' : 'Follow some pickers!'}
      </Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {activeTab === 'discover'
          ? 'Be the first to make some picks'
          : 'Switch to Discover to find people to follow'}
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!activeFeed.isFetchingNextPage) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tab Selector */}
      <View style={[styles.tabContainer, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'discover' && [styles.activeTab, { borderBottomColor: colors.primary }],
          ]}
          onPress={() => setActiveTab('discover')}
        >
          <Ionicons
            name="compass"
            size={20}
            color={activeTab === 'discover' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'discover' ? colors.primary : colors.textSecondary },
            ]}
          >
            Discover
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'following' && [styles.activeTab, { borderBottomColor: colors.primary }],
          ]}
          onPress={() => setActiveTab('following')}
        >
          <Ionicons
            name="people"
            size={20}
            color={activeTab === 'following' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'following' ? colors.primary : colors.textSecondary },
            ]}
          >
            Following
          </Text>
        </TouchableOpacity>
      </View>

      {/* New Posts Banner */}
      {newPostsCount && newPostsCount > 0 && (
        <Animated.View
          style={[
            styles.newPostsBanner,
            {
              backgroundColor: colors.primary,
              transform: [
                {
                  translateY: newPostsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-50, 0],
                  }),
                },
              ],
              opacity: newPostsAnim,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.newPostsButton}
            onPress={handleNewPostsTap}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-up" size={16} color="#FFFFFF" />
            <Text style={styles.newPostsText}>
              {newPostsCount} new {newPostsCount === 1 ? 'post' : 'posts'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Activity Feed */}
      {activeFeed.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={activities}
          renderItem={renderActivityItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={activeFeed.isRefetching}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// Helper function to format time ago
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold as '600',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingFooter: {
    paddingVertical: spacing.lg,
  },

  // Trending Section
  trendingSection: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as '700',
    marginBottom: spacing.md,
  },
  trendingList: {
    paddingRight: spacing.md,
  },
  trendingCard: {
    width: 120,
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  trendingAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: spacing.sm,
  },
  trendingAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingUsername: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as '600',
    marginBottom: spacing.xs,
  },
  trendingStats: {
    fontSize: typography.sizes.xs,
    marginBottom: spacing.sm,
  },
  followButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold as '600',
  },

  // Activity Items
  activityCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: spacing.md,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  username: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold as '600',
    marginBottom: spacing.xs,
  },
  activityText: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  timestamp: {
    fontSize: typography.sizes.xs,
  },
  activityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeCount: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium as '500',
  },

  // New Posts Banner
  newPostsBanner: {
    position: 'absolute',
    top: 60,
    left: spacing.md,
    right: spacing.md,
    zIndex: 100,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  newPostsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  newPostsText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as '600',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold as '600',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
