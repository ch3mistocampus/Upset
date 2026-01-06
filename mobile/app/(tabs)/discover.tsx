/**
 * Discover Screen
 *
 * Activity feed for user discovery with:
 * - Discover tab (engagement-ranked public activities)
 * - Following tab (activities from people you follow)
 * - Trending users section
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
import { useUserSuggestions, getSuggestionReasonText, UserSuggestion } from '../../hooks/useSuggestions';
import { usePostsFeed, useFollowingPostsFeed } from '../../hooks/usePosts';
import { useAuth } from '../../hooks/useAuth';
import { PostCard } from '../../components/posts';
import { Post } from '../../types/posts';

type FeedTab = 'discover' | 'following';

// Union type for feed items (either activity or post)
type FeedItem =
  | { type: 'activity'; data: ActivityItem }
  | { type: 'post'; data: Post };

export default function DiscoverScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<FeedTab>('discover');
  const [lastRefreshTime, setLastRefreshTime] = useState<string | null>(null);
  const newPostsAnim = useRef(new Animated.Value(0)).current;

  const discoverFeed = useDiscoverFeed();
  const followingFeed = useFollowingFeed();
  const discoverPosts = usePostsFeed();
  const followingPosts = useFollowingPostsFeed(user?.id ?? null);
  const { data: trendingUsers, refetch: refetchTrending } = useTrendingUsers();
  const { data: suggestions } = useUserSuggestions(5);
  const { follow, followLoading } = useFriends();
  const { toggleLike, isToggling } = useLike();

  // Track new posts since last refresh
  const { data: newPostsCount } = useNewActivityCount(lastRefreshTime);

  const activeFeed = activeTab === 'discover' ? discoverFeed : followingFeed;
  const activePostsFeed = activeTab === 'discover' ? discoverPosts : followingPosts;
  const activities = activeFeed.data?.pages.flat() || [];
  const posts = activePostsFeed.data?.pages.flat() || [];

  // Combine activities and posts into a single feed, sorted by created_at
  const combinedFeed: FeedItem[] = useMemo(() => {
    const activityItems: FeedItem[] = activities.map(a => ({ type: 'activity' as const, data: a }));
    const postItems: FeedItem[] = posts.map(p => ({ type: 'post' as const, data: p }));

    return [...activityItems, ...postItems].sort((a, b) => {
      const dateA = new Date(a.data.created_at).getTime();
      const dateB = new Date(b.data.created_at).getTime();
      return dateB - dateA; // Most recent first
    });
  }, [activities, posts]);

  // Set initial refresh time on mount
  useEffect(() => {
    if (!lastRefreshTime && activities.length > 0) {
      setLastRefreshTime(activities[0]?.created_at || new Date().toISOString());
    }
  }, [activities, lastRefreshTime]);

  // Refetch data when tab changes
  useEffect(() => {
    activeFeed.refetch();
    activePostsFeed.refetch();
  }, [activeTab]);

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
    activePostsFeed.refetch();
    setLastRefreshTime(new Date().toISOString());
    if (activeTab === 'discover') {
      refetchTrending();
    }
  }, [activeFeed, activePostsFeed, activeTab, refetchTrending]);

  const handleNewPostsTap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    handleRefresh();
  }, [handleRefresh]);

  const handleLoadMore = useCallback(() => {
    if (activeFeed.hasNextPage && !activeFeed.isFetchingNextPage) {
      activeFeed.fetchNextPage();
    }
    if (activePostsFeed.hasNextPage && !activePostsFeed.isFetchingNextPage) {
      activePostsFeed.fetchNextPage();
    }
  }, [activeFeed, activePostsFeed]);

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

  // Render combined feed item (either activity or post)
  const renderFeedItem = ({ item }: { item: FeedItem }) => {
    if (item.type === 'post') {
      return (
        <View style={styles.postWrapper}>
          <PostCard post={item.data} />
        </View>
      );
    }
    return renderActivityItem({ item: item.data });
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
              style={[
                styles.likeButton,
                isToggling && styles.likeButtonDisabled,
              ]}
              onPress={() => handleLike(item.id)}
              disabled={isToggling}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={item.is_liked ? 'Unlike this activity' : 'Like this activity'}
              accessibilityState={{ disabled: isToggling }}
            >
              <Ionicons
                name={item.is_liked ? 'heart' : 'heart-outline'}
                size={18}
                color={isToggling ? colors.textTertiary : (item.is_liked ? colors.danger : colors.textTertiary)}
                style={isToggling ? { opacity: 0.5 } : undefined}
              />
              {item.like_count > 0 && (
                <Text
                  style={[
                    styles.likeCount,
                    { color: item.is_liked ? colors.danger : colors.textTertiary },
                    isToggling && { opacity: 0.5 },
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

  const renderSuggestion = ({ item }: { item: UserSuggestion }) => (
    <TouchableOpacity
      style={[styles.suggestionCard, { backgroundColor: colors.card }]}
      onPress={() => handleUserPress(item.user_id)}
      activeOpacity={0.7}
    >
      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={styles.suggestionAvatar} />
      ) : (
        <View style={[styles.suggestionAvatarPlaceholder, { backgroundColor: colors.border }]}>
          <Ionicons name="person" size={20} color={colors.textSecondary} />
        </View>
      )}
      <View style={styles.suggestionInfo}>
        <Text style={[styles.suggestionUsername, { color: colors.text }]} numberOfLines={1}>
          @{item.username}
        </Text>
        <Text style={[styles.suggestionReason, { color: colors.textSecondary }]} numberOfLines={1}>
          {getSuggestionReasonText(item)}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.suggestionFollowButton, { backgroundColor: colors.primary }]}
        onPress={() => handleFollow(item.user_id)}
        disabled={followLoading}
      >
        <Ionicons name="add" size={18} color="#fff" />
      </TouchableOpacity>
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

      {/* User Suggestions Section */}
      {activeTab === 'following' && suggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            👋 People You May Know
          </Text>
          <FlatList
            data={suggestions}
            renderItem={renderSuggestion}
            keyExtractor={(item) => item.user_id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsList}
          />
        </View>
      )}

      {/* Feed Section Header */}
      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.lg }]}>
        {activeTab === 'discover' ? '✨ Activity & Posts' : '👥 From People You Follow'}
      </Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer} accessibilityRole="alert">
      <Ionicons
        name={activeTab === 'discover' ? 'compass-outline' : 'people-outline'}
        size={64}
        color={colors.textTertiary}
        accessibilityLabel={activeTab === 'discover' ? 'No activities' : 'No following activity'}
      />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {activeTab === 'discover' ? 'No activities yet' : 'Follow some pickers!'}
      </Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {activeTab === 'discover'
          ? 'Be the first to make some picks'
          : 'Find and follow people to see their activity here'}
      </Text>
      {activeTab === 'following' && (
        <TouchableOpacity
          style={[styles.emptyActionButton, { backgroundColor: colors.primary }]}
          onPress={() => setActiveTab('discover')}
          accessibilityRole="button"
          accessibilityLabel="Go to Discover tab to find people to follow"
        >
          <Text style={styles.emptyActionText}>Discover People</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFooter = () => {
    // Show error state if pagination failed
    if (activeFeed.isError && !activeFeed.isFetchingNextPage) {
      return (
        <TouchableOpacity
          style={[styles.paginationError, { backgroundColor: colors.card }]}
          onPress={() => activeFeed.fetchNextPage()}
          accessibilityRole="button"
          accessibilityLabel="Failed to load more, tap to retry"
        >
          <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
          <Text style={[styles.paginationErrorText, { color: colors.textSecondary }]}>
            Failed to load more
          </Text>
          <Text style={[styles.paginationRetryText, { color: colors.primary }]}>
            Tap to retry
          </Text>
        </TouchableOpacity>
      );
    }

    if (!activeFeed.isFetchingNextPage) return null;
    return (
      <View style={styles.loadingFooter} accessibilityLabel="Loading more activities">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tab Selector */}
      <View style={[styles.tabContainer, { backgroundColor: colors.card }]} accessibilityRole="tablist">
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'discover' && [styles.activeTab, { borderBottomColor: colors.primary }],
          ]}
          onPress={() => setActiveTab('discover')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'discover' }}
          accessibilityLabel="Discover tab - Browse all public activity"
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
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'following' }}
          accessibilityLabel="Following tab - Activity from people you follow"
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
      {newPostsCount != null && newPostsCount > 0 && (
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

      {/* Content */}
      {(activeFeed.isLoading || activePostsFeed.isLoading) ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={combinedFeed}
          renderItem={renderFeedItem}
          keyExtractor={(item) => `${item.type}-${item.data.id}`}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={activeFeed.isRefetching || activePostsFeed.isRefetching}
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

  // Suggestions Section
  suggestionsSection: {
    marginBottom: spacing.md,
  },
  suggestionsList: {
    paddingRight: spacing.md,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.lg,
    marginRight: spacing.sm,
    minWidth: 200,
  },
  suggestionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  suggestionAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionInfo: {
    flex: 1,
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
  },
  suggestionUsername: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as '600',
  },
  suggestionReason: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  suggestionFollowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
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

  // Post wrapper (for PostCard in feed)
  postWrapper: {
    marginBottom: spacing.sm,
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
  emptyActionButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold as '600',
  },

  // Like button states
  likeButtonDisabled: {
    opacity: 0.5,
  },

  // Pagination error
  paginationError: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  paginationErrorText: {
    fontSize: typography.sizes.sm,
  },
  paginationRetryText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as '600',
  },
});
