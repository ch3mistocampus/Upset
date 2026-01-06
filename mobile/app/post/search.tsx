/**
 * Post Search Screen
 * Search posts by title and content with filtering options
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
} from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { useSearchPosts, useTrendingPosts, SearchSortBy } from '../../hooks/usePostSearch';
import { PostCard, PostErrorBoundary } from '../../components/posts';
import { EmptyState } from '../../components/EmptyState';
import { Post } from '../../types/posts';

const SORT_OPTIONS: { value: SearchSortBy; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'recent', label: 'Most Recent' },
  { value: 'popular', label: 'Most Popular' },
];

export default function PostSearchScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortBy, setSortBy] = useState<SearchSortBy>('relevance');

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

  const handleLoadMore = useCallback(() => {
    if (searchResults.hasNextPage && !searchResults.isFetchingNextPage) {
      searchResults.fetchNextPage();
    }
  }, [searchResults]);

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

    if (searchResults.isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Searching...
          </Text>
        </View>
      );
    }

    return (
      <EmptyState
        icon="search-outline"
        title="No results found"
        message={`No posts matching "${debouncedQuery}". Try different keywords.`}
      />
    );
  }, [isSearching, searchResults.isLoading, debouncedQuery, colors]);

  const renderFooter = useCallback(() => {
    if (!searchResults.isFetchingNextPage) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }, [searchResults.isFetchingNextPage, colors]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: false,
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
            placeholder="Search posts..."
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

      {/* Sort Options (only when searching) */}
      {isSearching && posts.length > 0 && (
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
      <FlatList
        data={isSearching ? posts : []}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
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
  postWrapper: {
    marginBottom: spacing.md,
  },
  loadingFooter: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});
