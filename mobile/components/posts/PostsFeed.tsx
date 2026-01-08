/**
 * PostsFeed - X/Twitter-style paginated feed of posts
 * Compact row layout with divider separation
 * Uses infinite scroll with pull-to-refresh
 * Optimized with FlatList performance props
 */

import { View, FlatList, StyleSheet, RefreshControl, ActivityIndicator, Text } from 'react-native';
import { useCallback, useMemo } from 'react';
import { useTheme } from '../../lib/theme';
import { spacing, typography } from '../../lib/tokens';
import { FeedPostRow } from './FeedPostRow';
import { PostErrorBoundary } from './PostErrorBoundary';
import { EmptyState } from '../EmptyState';
import { usePostsFeed } from '../../hooks/usePosts';
import { Post } from '../../types/posts';

// Estimated item height for getItemLayout optimization
// Compact row layout: ~120px average (vs 280px for cards)
const ESTIMATED_ITEM_HEIGHT = 120;

export function PostsFeed() {
  const { colors } = useTheme();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = usePostsFeed();

  // Flatten pages into single array - memoized to prevent unnecessary recalculations
  const posts = useMemo(() => data?.pages.flat() ?? [], [data?.pages]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(({ item }: { item: Post }) => (
    <PostErrorBoundary>
      <FeedPostRow post={item} />
    </PostErrorBoundary>
  ), []);

  const keyExtractor = useCallback((item: Post) => item.id, []);

  // Divider component between posts
  const ItemSeparator = useCallback(() => (
    <View style={[styles.divider, { backgroundColor: colors.divider }]} />
  ), [colors.divider]);

  // Estimated layout for better scroll performance
  // Compact rows are ~120px on average
  const getItemLayout = useCallback((_data: ArrayLike<Post> | null | undefined, index: number) => ({
    length: ESTIMATED_ITEM_HEIGHT,
    offset: ESTIMATED_ITEM_HEIGHT * index,
    index,
  }), []);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }, [isFetchingNextPage, colors.accent]);

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading posts...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="alert-circle-outline"
          title="Error loading posts"
          message="Unable to load the posts feed. Please try again."
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="chatbubbles-outline"
          title="No posts yet"
          message="Be the first to start a discussion!"
        />
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={[
        styles.listContent,
        { backgroundColor: colors.background },
      ]}
      ItemSeparatorComponent={ItemSeparator}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
      showsVerticalScrollIndicator={false}
      // Performance optimizations
      getItemLayout={getItemLayout}
      removeClippedSubviews={true}
      maxToRenderPerBatch={15}
      windowSize={7}
      initialNumToRender={8}
      updateCellsBatchingPeriod={50}
    />
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  listContent: {
    // No horizontal padding - FeedPostRow handles its own padding
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
  },
  divider: {
    height: 1,
    marginLeft: spacing.md + 40 + spacing.sm, // Align with content (avatar width + margin)
  },
  loadingFooter: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});
