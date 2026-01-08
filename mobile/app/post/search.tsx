/**
 * Search Screen
 * Search for posts and users with tab switching
 */

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Image,
} from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { useSearchPosts, useTrendingPosts, SearchSortBy } from '../../hooks/usePostSearch';
import { FeedPostRow, PostErrorBoundary } from '../../components/posts';
import { EmptyState } from '../../components/EmptyState';
import { Post } from '../../types/posts';
import { useFriends } from '../../hooks/useFriends';
import { UserSearchResult } from '../../types/social';

const SORT_OPTIONS: { value: SearchSortBy; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'recent', label: 'Most Recent' },
  { value: 'popular', label: 'Most Popular' },
];

type SearchTab = 'posts' | 'people';

export default function SearchScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { searchUsers, follow, followLoading } = useFriends();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortBy, setSortBy] = useState<SearchSortBy>('relevance');
  const [searchTab, setSearchTab] = useState<SearchTab>('posts');
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const searchResults = useSearchPosts(debouncedQuery, sortBy);
  const { data: trending } = useTrendingPosts(24);

  const posts = searchResults.data?.pages.flat() ?? [];
  const isSearching = debouncedQuery.length >= 2;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Search for users when on people tab
  useEffect(() => {
    if (searchTab === 'people' && debouncedQuery.length >= 2) {
      let cancelled = false;
      setUsersLoading(true);
      searchUsers(debouncedQuery)
        .then((results) => {
          if (!cancelled) setUserResults(results);
        })
        .catch(() => {
          if (!cancelled) setUserResults([]);
        })
        .finally(() => {
          if (!cancelled) setUsersLoading(false);
        });
      return () => { cancelled = true; };
    } else if (searchTab === 'people') {
      setUserResults([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, searchTab]);

  const handleLoadMore = useCallback(() => {
    if (searchTab === 'posts' && searchResults.hasNextPage && !searchResults.isFetchingNextPage) {
      searchResults.fetchNextPage();
    }
  }, [searchResults, searchTab]);

  const handleUserPress = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/user/${userId}`);
  };

  const handleFollow = async (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await follow(userId);
      // Update local state to reflect follow
      setUserResults((prev) =>
        prev.map((u) =>
          u.user_id === userId ? { ...u, friendship_status: 'accepted' } : u
        )
      );
    } catch {
      // Error handled in hook
    }
  };

  const renderPost = useCallback(
    ({ item }: { item: Post }) => (
      <PostErrorBoundary>
        <FeedPostRow post={item} />
      </PostErrorBoundary>
    ),
    []
  );

  // Divider component for feed separation
  const PostDivider = useCallback(() => (
    <View style={[styles.postDivider, { backgroundColor: colors.divider }]} />
  ), [colors.divider]);

  const renderUser = useCallback(
    ({ item }: { item: UserSearchResult }) => {
      const isFollowing = item.friendship_status === 'accepted';
      return (
        <TouchableOpacity
          style={[styles.userCard, { backgroundColor: colors.surface }]}
          onPress={() => handleUserPress(item.user_id)}
          activeOpacity={0.7}
        >
          <View style={[styles.userAvatarPlaceholder, { backgroundColor: colors.border }]}>
            <Ionicons name="person" size={24} color={colors.textSecondary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
              @{item.username}
            </Text>
            <Text style={[styles.userStats, { color: colors.textSecondary }]}>
              {item.total_picks} picks · {item.accuracy}% accuracy
            </Text>
          </View>
          {!isFollowing ? (
            <TouchableOpacity
              style={[styles.followButton, { backgroundColor: colors.accent }]}
              onPress={() => handleFollow(item.user_id)}
              disabled={followLoading}
            >
              <Text style={styles.followButtonText}>Follow</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.followingBadge, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.followingText, { color: colors.textSecondary }]}>Following</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [colors, followLoading]
  );

  const renderTrendingPost = useCallback(
    ({ item }: { item: Post }) => (
      <TouchableOpacity
        style={[styles.trendingCard, { backgroundColor: colors.card }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/post/${item.id}`);
        }}
        activeOpacity={0.7}
      >
        <Text style={[styles.trendingTitle, { color: colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.trendingMeta}>
          <Text style={[styles.trendingStats, { color: colors.textSecondary }]}>
            {item.like_count} likes
          </Text>
          <Text style={[styles.trendingStats, { color: colors.textTertiary }]}>
            {item.comment_count} comments
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [colors, router]
  );

  const renderHeader = useCallback(() => {
    if (isSearching) return null;

    return (
      <View style={styles.headerContent}>
        {/* Trending Posts */}
        {trending && trending.length > 0 && (
          <View style={styles.trendingSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Trending Now
            </Text>
            <FlatList
              data={trending.slice(0, 5)}
              renderItem={renderTrendingPost}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trendingList}
            />
          </View>
        )}

        {/* Search suggestions */}
        <View style={styles.suggestionsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Search suggestions
          </Text>
          <View style={styles.suggestions}>
            {['UFC', 'predictions', 'analysis', 'picks', 'event'].map((suggestion) => (
              <TouchableOpacity
                key={suggestion}
                style={[styles.suggestionChip, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setQuery(suggestion);
                }}
              >
                <Text style={[styles.suggestionText, { color: colors.textSecondary }]}>
                  {suggestion}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  }, [isSearching, trending, colors, renderTrendingPost]);

  const renderEmpty = useCallback(() => {
    if (!isSearching) return null;

    const isLoading = searchTab === 'posts' ? searchResults.isLoading : usersLoading;
    const noResults = searchTab === 'posts' ? posts.length === 0 : userResults.length === 0;

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Searching...
          </Text>
        </View>
      );
    }

    if (!noResults) return null;

    return (
      <EmptyState
        icon="search-outline"
        title="No results found"
        message={searchTab === 'posts'
          ? `No posts matching "${debouncedQuery}". Try different keywords.`
          : `No users matching "${debouncedQuery}". Try a different username.`}
      />
    );
  }, [isSearching, searchResults.isLoading, usersLoading, posts.length, userResults.length, debouncedQuery, colors, searchTab]);

  const renderFooter = useCallback(() => {
    if (searchTab !== 'posts' || !searchResults.isFetchingNextPage) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }, [searchResults.isFetchingNextPage, colors, searchTab]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 150,
        }}
      />

      {/* Header with Search Input */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={[styles.searchContainer, { backgroundColor: colors.surfaceAlt }]}>
          <Ionicons name="search" size={20} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search posts or people..."
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setQuery('');
                setDebouncedQuery('');
              }}
            >
              <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tab Selector */}
      {isSearching && (
        <View style={[styles.tabContainer, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              searchTab === 'posts' && [styles.activeTab, { borderBottomColor: colors.accent }],
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSearchTab('posts');
            }}
          >
            <Text
              style={[
                styles.tabText,
                { color: searchTab === 'posts' ? colors.accent : colors.textSecondary },
              ]}
            >
              Posts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              searchTab === 'people' && [styles.activeTab, { borderBottomColor: colors.accent }],
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSearchTab('people');
            }}
          >
            <Text
              style={[
                styles.tabText,
                { color: searchTab === 'people' ? colors.accent : colors.textSecondary },
              ]}
            >
              People
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sort Options (only when searching posts) */}
      {isSearching && searchTab === 'posts' && posts.length > 0 && (
        <View style={[styles.sortContainer, { borderBottomColor: colors.border }]}>
          {SORT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.sortOption,
                sortBy === option.value && { backgroundColor: colors.accentSoft },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSortBy(option.value);
              }}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  { color: sortBy === option.value ? colors.accent : colors.textSecondary },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Results */}
      {searchTab === 'posts' ? (
        <FlatList
          data={isSearching ? posts : []}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          ItemSeparatorComponent={PostDivider}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.listContentCompact}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={true}
          maxToRenderPerBatch={15}
          windowSize={7}
          initialNumToRender={8}
        />
      ) : (
        <FlatList
          data={isSearching ? userResults : []}
          renderItem={renderUser}
          keyExtractor={(item) => item.user_id}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    padding: 0,
  },
  sortContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  sortOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  sortOptionText: {
    ...typography.meta,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  listContentCompact: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
  postDivider: {
    height: 1,
    marginLeft: spacing.md + 40 + spacing.sm, // Align with post content
  },
  headerContent: {
    marginBottom: spacing.md,
  },
  trendingSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  trendingList: {
    paddingRight: spacing.md,
  },
  trendingCard: {
    width: 200,
    padding: spacing.md,
    borderRadius: radius.card,
    marginRight: spacing.sm,
  },
  trendingTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  trendingMeta: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  trendingStats: {
    ...typography.meta,
  },
  suggestionsSection: {
    marginTop: spacing.md,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  suggestionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  suggestionText: {
    ...typography.meta,
  },
  loadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.body,
  },
  loadingFooter: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
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
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    ...typography.body,
    fontWeight: '600',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.card,
    marginBottom: spacing.sm,
  },
  userAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  userName: {
    ...typography.body,
    fontWeight: '600',
  },
  userStats: {
    ...typography.meta,
    marginTop: 2,
  },
  followButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
  followingBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  followingText: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
});
