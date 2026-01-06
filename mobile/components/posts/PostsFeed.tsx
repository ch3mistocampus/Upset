/**
 * PostsFeed - Paginated feed of posts
 * Uses infinite scroll with pull-to-refresh
 * Optimized with FlatList performance props
 */

import { View, FlatList, StyleSheet, RefreshControl, ActivityIndicator, Text } from 'react-native';
import { useCallback, useMemo } from 'react';
import { useTheme } from '../../lib/theme';
import { spacing, typography } from '../../lib/tokens';
import { PostCard } from './PostCard';
import { PostErrorBoundary } from './PostErrorBoundary';
import { EmptyState } from '../EmptyState';
import { usePostsFeed } from '../../hooks/usePosts';
import { Post } from '../../types/posts';

// Estimated item height for getItemLayout optimization
// This is approximate - actual height varies by content
const ESTIMATED_ITEM_HEIGHT = 280;
const ITEM_MARGIN = 16; // spacing.md

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
    <View style={styles.postWrapper}>
      <PostErrorBoundary>
        <PostCard post={item} />
      </PostErrorBoundary>
    </View>
  ), []);

  const keyExtractor = useCallback((item: Post) => item.id, []);

  // Estimated layout for better scroll performance
  // Not perfect due to variable content, but helps with initial render
  const getItemLayout = useCallback((_data: ArrayLike<Post> | null | undefined, index: number) => ({
    length: ESTIMATED_ITEM_HEIGHT + ITEM_MARGIN,
    offset: (ESTIMATED_ITEM_HEIGHT + ITEM_MARGIN) * index,
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
      contentContainerStyle={styles.listContent}
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
      maxToRenderPerBatch={10}
      windowSize={5}
      initialNumToRender={5}
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  postWrapper: {
    marginBottom: spacing.md,
  },
  loadingFooter: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});
