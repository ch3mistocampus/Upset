/**
 * Bookmarks Screen
 * Shows user's saved/bookmarked posts
 */

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useCallback } from 'react';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme';
import { spacing, typography } from '../../lib/tokens';
import { useBookmarkedPosts } from '../../hooks/usePostBookmarks';
import { PostCard, PostErrorBoundary } from '../../components/posts';
import { EmptyState } from '../../components/EmptyState';
import { Post } from '../../types/posts';

export default function BookmarksScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useBookmarkedPosts();

  const posts = data?.pages.flat() ?? [];

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderPost = useCallback(
    ({ item }: { item: Post }) => (
      <View style={styles.postWrapper}>
        <PostErrorBoundary>
          <PostCard post={item} />
        </PostErrorBoundary>
      </View>
    ),
    []
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading saved posts...
          </Text>
        </View>
      );
    }

    return (
      <EmptyState
        icon="bookmark-outline"
        title="No Saved Posts"
        message="Posts you save will appear here. Tap the bookmark icon on any post to save it for later."
        actionLabel="Discover Posts"
        onAction={() => router.push('/(tabs)/discover')}
      />
    );
  }, [isLoading, colors, router]);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }, [isFetchingNextPage, colors]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Saved Posts',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          posts.length === 0 && styles.emptyContainer,
        ]}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
  },
  postWrapper: {
    marginBottom: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  loadingFooter: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});
