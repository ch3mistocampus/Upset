/**
 * Fighters Screen - Browse and search UFC fighters
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
} from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../lib/theme';
import { spacing, radius, typography } from '../lib/tokens';
import { useFighters, useSearchFighters, getWeightClassName } from '../hooks/useFighterStats';
import { FighterCard } from '../components/FighterCard';
import { EmptyState } from '../components/ui';
import { SkeletonCard } from '../components/SkeletonCard';
import { UFCFighter, UFCFighterSearchResult } from '../types/database';

type SortOption = 'ranking' | 'wins' | 'name' | 'weight';
type DisplayFighter = UFCFighter | UFCFighterSearchResult;

const WEIGHT_CLASSES = [
  { label: 'All', value: null, name: null },
  { label: 'HW', value: 265, name: 'Heavyweight' },
  { label: 'LHW', value: 205, name: 'Light Heavyweight' },
  { label: 'MW', value: 185, name: 'Middleweight' },
  { label: 'WW', value: 170, name: 'Welterweight' },
  { label: 'LW', value: 155, name: 'Lightweight' },
  { label: 'FW', value: 145, name: 'Featherweight' },
  { label: 'BW', value: 135, name: 'Bantamweight' },
  { label: 'FLW', value: 125, name: 'Flyweight' },
  { label: 'SW', value: 115, name: 'Strawweight' },
];

export default function FightersScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('ranking');
  const [selectedWeight, setSelectedWeight] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Get selected weight class name for ranking queries
  const selectedWeightClass = useMemo(() => {
    const wc = WEIGHT_CLASSES.find(w => w.value === selectedWeight);
    return wc?.name || null;
  }, [selectedWeight]);

  // Queries
  // Load all fighters - TODO: implement infinite scroll for better perf
  const fightersQuery = useFighters({
    limit: 5000, // We have ~4,451 fighters
    sortBy: sortBy === 'name' ? 'full_name' : sortBy === 'wins' ? 'record_wins' : 'weight_lbs',
    sortOrder: sortBy === 'name' ? 'asc' : 'desc',
  });

  const searchQuery_ = useSearchFighters(searchQuery, 30);

  // Filter and sort fighters
  const filteredFighters = useMemo(() => {
    const fighters = fightersQuery.data || [];

    // First filter by weight class
    let filtered = fighters;
    if (selectedWeight) {
      const tolerance = selectedWeight >= 206 ? 50 : 10; // Heavyweight has larger range
      filtered = fighters.filter(f => {
        if (!f.weight_lbs) return false;
        return Math.abs(f.weight_lbs - selectedWeight) <= tolerance;
      });
    }

    // Sort by ranking if selected
    if (sortBy === 'ranking') {
      return [...filtered].sort((a, b) => {
        // Ranked fighters come first
        const aRank = (a as UFCFighter).ranking;
        const bRank = (b as UFCFighter).ranking;

        if (aRank !== null && bRank !== null) {
          return aRank - bRank; // Lower rank is better (0 = champ, 1 = #1, etc)
        }
        if (aRank !== null) return -1; // a is ranked, b is not
        if (bRank !== null) return 1; // b is ranked, a is not

        // Both unranked - sort by wins
        return b.record_wins - a.record_wins;
      });
    }

    return filtered;
  }, [fightersQuery.data, selectedWeight, sortBy]);

  // Use search results when searching, otherwise filtered list
  const displayFighters = searchQuery.trim().length >= 2
    ? searchQuery_.data || []
    : filteredFighters;

  const isLoading = searchQuery.trim().length >= 2
    ? searchQuery_.isLoading
    : fightersQuery.isLoading;

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSortBy(option);
  };

  const handleWeightFilter = (weight: number | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedWeight(weight);
  };

  const renderFighter = ({ item }: { item: DisplayFighter }) => (
    <FighterCard fighter={item} compact={searchQuery.trim().length >= 2} />
  );

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Sort Options */}
      {!searchQuery.trim() && (
        <>
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
        </>
      )}

      {/* Results count */}
      <Text style={[styles.resultsCount, { color: colors.textTertiary }]}>
        {displayFighters.length} fighter{displayFighters.length !== 1 ? 's' : ''}
        {selectedWeight && !searchQuery.trim() && ` in ${getWeightClassName(selectedWeight)}`}
      </Text>
    </View>
  );

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

      {/* Content */}
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : displayFighters.length === 0 ? (
        <EmptyState
          icon="person-outline"
          title={searchQuery.trim() ? 'No Fighters Found' : 'No Fighters'}
          message={
            searchQuery.trim()
              ? `No fighters match "${searchQuery}"`
              : 'No fighter data available yet.'
          }
        />
      ) : (
        <FlatList<DisplayFighter>
          data={displayFighters}
          keyExtractor={(item) => item.fighter_id}
          renderItem={renderFighter}
          ListHeaderComponent={renderHeader}
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
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
});
