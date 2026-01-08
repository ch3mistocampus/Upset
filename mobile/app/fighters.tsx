/**
 * Fighters Screen - Browse and search UFC fighters
 * Features infinite scroll for efficient loading of 4000+ fighters
 */

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Keyboard,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useState, useCallback, useMemo, useRef } from 'react';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../lib/theme';
import { spacing, radius, typography } from '../lib/tokens';
import { useInfiniteFighters, useSearchFighters, getWeightClassName } from '../hooks/useFighterStats';
import { FighterCard } from '../components/FighterCard';
import { EmptyState } from '../components/ui';
import { SkeletonCard } from '../components/SkeletonCard';
import { UFCFighter, UFCFighterSearchResult } from '../types/database';
import { GlobalTabBar } from '../components/navigation/GlobalTabBar';

type SortOption = 'ranking' | 'wins' | 'name';
type DisplayFighter = UFCFighter | UFCFighterSearchResult;

const WEIGHT_CLASSES = [
  { label: 'All', value: null },
  { label: 'HW', value: 'Heavyweight' },
  { label: 'LHW', value: 'Light Heavyweight' },
  { label: 'MW', value: 'Middleweight' },
  { label: 'WW', value: 'Welterweight' },
  { label: 'LW', value: 'Lightweight' },
  { label: 'FW', value: 'Featherweight' },
  { label: 'BW', value: 'Bantamweight' },
  { label: 'FLW', value: 'Flyweight' },
  { label: 'SW', value: 'Strawweight' },
];

export default function FightersScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('ranking');
  const [selectedWeight, setSelectedWeight] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Animation state for smooth transitions
  const listOpacity = useSharedValue(1);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Track if we're currently loading more to prevent duplicate calls
  const isLoadingMoreRef = useRef(false);

  // Infinite scroll query for fighters
  const fightersQuery = useInfiniteFighters({
    pageSize: 50,
    sortBy: sortBy === 'name' ? 'full_name' : sortBy === 'wins' ? 'record_wins' : 'ranking',
    sortOrder: sortBy === 'name' ? 'asc' : 'desc',
    weightClass: selectedWeight,
  });

  const searchQuery_ = useSearchFighters(searchQuery, 30);

  // Flatten all pages into a single array
  const displayFighters = useMemo(() => {
    if (searchQuery.trim().length >= 2) {
      return searchQuery_.data || [];
    }

    if (!fightersQuery.data?.pages) return [];

    return fightersQuery.data.pages.flatMap(page => page.fighters);
  }, [fightersQuery.data, searchQuery, searchQuery_.data]);

  // Get total count from first page (if available)
  const totalCount = useMemo(() => {
    if (searchQuery.trim().length >= 2) {
      return searchQuery_.data?.length || 0;
    }
    return displayFighters.length;
  }, [searchQuery, searchQuery_.data, displayFighters.length]);

  const isLoading = searchQuery.trim().length >= 2
    ? searchQuery_.isLoading
    : fightersQuery.isLoading;

  const isFetchingMore = fightersQuery.isFetchingNextPage;
  const hasMore = fightersQuery.hasNextPage;

  // Handle loading more fighters
  const loadMore = useCallback(() => {
    if (
      searchQuery.trim().length >= 2 || // Don't load more when searching
      isLoadingMoreRef.current ||
      isFetchingMore ||
      !hasMore
    ) {
      return;
    }

    isLoadingMoreRef.current = true;
    fightersQuery.fetchNextPage().finally(() => {
      isLoadingMoreRef.current = false;
    });
  }, [searchQuery, isFetchingMore, hasMore, fightersQuery]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fightersQuery.refetch();
    setRefreshing(false);
  }, [fightersQuery]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const clearSearch = () => {
    setSearchQuery('');
    Keyboard.dismiss();
  };

  const handleSortChange = (option: SortOption) => {
    if (option === sortBy) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Animate transition
    setIsTransitioning(true);
    listOpacity.value = withTiming(0, { duration: 150 });

    // Update state after fade out
    setTimeout(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSortBy(option);

      // Fade back in
      setTimeout(() => {
        listOpacity.value = withTiming(1, { duration: 200 });
        setIsTransitioning(false);
      }, 50);
    }, 150);
  };

  const handleWeightFilter = (weight: string | null) => {
    if (weight === selectedWeight) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Animate transition
    setIsTransitioning(true);
    listOpacity.value = withTiming(0, { duration: 150 });

    // Update state after fade out
    setTimeout(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSelectedWeight(weight);

      // Fade back in
      setTimeout(() => {
        listOpacity.value = withTiming(1, { duration: 200 });
        setIsTransitioning(false);
      }, 50);
    }, 150);
  };

  const renderFighter = ({ item }: { item: DisplayFighter }) => (
    <FighterCard fighter={item} compact={searchQuery.trim().length >= 2} />
  );

  // Header is now rendered outside FlatList, so this is empty
  const renderHeader = () => null;

  // Footer component for loading indicator
  const renderFooter = () => {
    if (!isFetchingMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          Loading more fighters...
        </Text>
      </View>
    );
  };

  // Animated style for list opacity
  const listAnimatedStyle = useAnimatedStyle(() => ({
    opacity: listOpacity.value,
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={styles.backButton}
            accessibilityLabel="Go back to Discover"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Fighters</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Search Bar */}
        <View style={[
          styles.searchContainer,
          {
            backgroundColor: colors.surfaceAlt,
            borderColor: isSearchFocused ? colors.accent : colors.border,
          },
        ]}>
          <Ionicons
            name="search"
            size={18}
            color={isSearchFocused ? colors.accent : colors.textTertiary}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search fighters..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={handleSearch}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Sort & Filter Options - Always visible */}
      {!searchQuery.trim() && (
        <View style={[styles.filtersContainer, { backgroundColor: colors.background }]}>
          <View style={styles.sortRow}>
            <Text style={[styles.sortLabel, { color: colors.textSecondary }]}>Sort by:</Text>
            <View style={styles.sortOptions}>
              {[
                { key: 'ranking' as SortOption, label: 'Rankings' },
                { key: 'wins' as SortOption, label: 'Top Wins' },
                { key: 'name' as SortOption, label: 'A-Z' },
              ].map(option => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.sortButton,
                    { backgroundColor: sortBy === option.key ? colors.accent : colors.surfaceAlt },
                  ]}
                  onPress={() => handleSortChange(option.key)}
                >
                  <Text style={[
                    styles.sortButtonText,
                    { color: sortBy === option.key ? '#fff' : colors.textSecondary },
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Weight Class Filter */}
          <FlatList
            horizontal
            data={WEIGHT_CLASSES}
            keyExtractor={item => item.label}
            showsHorizontalScrollIndicator={false}
            style={styles.weightFilter}
            contentContainerStyle={styles.weightFilterContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.weightChip,
                  {
                    backgroundColor: selectedWeight === item.value
                      ? colors.accent
                      : colors.surfaceAlt,
                    borderColor: selectedWeight === item.value
                      ? colors.accent
                      : colors.border,
                  },
                ]}
                onPress={() => handleWeightFilter(item.value)}
              >
                <Text style={[
                  styles.weightChipText,
                  { color: selectedWeight === item.value ? '#fff' : colors.textSecondary },
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Results count */}
      <View style={styles.resultsRow}>
        <Text style={[styles.resultsCount, { color: colors.textTertiary }]}>
          {totalCount} fighter{totalCount !== 1 ? 's' : ''}
          {selectedWeight && !searchQuery.trim() && ` in ${getWeightClassName(selectedWeight) || selectedWeight}`}
          {hasMore && !searchQuery.trim() && ' (scroll for more)'}
        </Text>
      </View>

      {/* Content */}
      <Animated.View style={[styles.contentWrapper, listAnimatedStyle]}>
        {isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : displayFighters.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name={selectedWeight ? 'scale-outline' : searchQuery.trim() ? 'search-outline' : 'person-outline'}
              size={48}
              color={colors.textTertiary}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {searchQuery.trim()
                ? 'No Fighters Found'
                : selectedWeight
                ? `No ${selectedWeight} Fighters`
                : 'No Fighters'}
            </Text>
            <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
              {searchQuery.trim()
                ? `No fighters match "${searchQuery}"`
                : selectedWeight
                ? 'No fighters found in this weight class.'
                : 'No fighter data available yet.'}
            </Text>
          </View>
        ) : (
          <FlatList<DisplayFighter>
            data={displayFighters}
            keyExtractor={(item) => item.fighter_id}
            renderItem={renderFighter}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={renderFooter}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.accent}
                colors={[colors.accent]}
              />
            }
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={true}
          />
        )}
      </Animated.View>

      {/* Global Tab Bar */}
      <GlobalTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backButton: {
    marginRight: spacing.sm,
    marginLeft: -spacing.xs,
    padding: spacing.xs,
  },
  headerSpacer: {
    width: 36,
  },
  title: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.input,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  headerContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  filtersContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  resultsRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sortLabel: {
    fontSize: 13,
    marginRight: spacing.sm,
  },
  sortOptions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  sortButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  weightFilter: {
    marginBottom: spacing.sm,
    marginHorizontal: -spacing.md,
  },
  weightFilterContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  weightChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginRight: spacing.xs,
  },
  weightChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  resultsCount: {
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.md,
  },
  loadingContainer: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  footerText: {
    fontSize: 13,
  },
});
