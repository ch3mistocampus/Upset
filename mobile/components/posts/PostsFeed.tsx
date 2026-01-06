/**
 * PostsFeed - Paginated feed of posts
 * Uses infinite scroll with pull-to-refresh
 */

import { View, FlatList, StyleSheet, RefreshControl, ActivityIndicator, Text } from 'react-native';
import { useCallback } from 'react';
import { useTheme } from '../../lib/theme';
import { spacing, typography } from '../../lib/tokens';
import { PostCard } from './PostCard';
import { EmptyState } from '../EmptyState';
import { usePostsFeed } from '../../hooks/usePosts';
import { Post } from '../../types/posts';

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

  // Flatten pages into single array
  const posts = data?.pages.flat() ?? [];

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(({ item }: { item: Post }) => (
    <View style={styles.postWrapper}>
      <PostCard post={item} />
    </View>
  ), []);

  const keyExtractor = useCallback((item: Post) => item.id, []);

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  };

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
