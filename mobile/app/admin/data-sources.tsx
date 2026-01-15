/**
 * Data Sources Admin Page
 * Monitor fight data sync status and cache times
 */

import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import {
  useDataSourceSettings,
  formatTimeSinceSync,
} from '../../hooks/useDataSource';

export default function DataSourcesPage() {
  const { colors } = useTheme();
  const { data: settings, isLoading: settingsLoading } = useDataSourceSettings();

  if (settingsLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Data Source Info */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Fight Database</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
        Event and fighter data status
      </Text>

      <View style={[styles.sourceCard, { backgroundColor: colors.card }]}>
        <View style={styles.sourceHeader}>
          <View style={[styles.sourceIcon, { backgroundColor: '#10B98120' }]}>
            <Ionicons name="server-outline" size={24} color="#10B981" />
          </View>
          <View style={[styles.activeBadge, { backgroundColor: '#10B981' }]}>
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        </View>
        <Text style={[styles.sourceName, { color: colors.text }]}>Fight Database</Text>
        <Text style={[styles.sourceDescription, { color: colors.textSecondary }]}>
          Fight schedules, matchups, and statistics compiled from publicly available sources
        </Text>
      </View>

      {/* Last Sync Times */}
      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.xl }]}>
        Cache Status
      </Text>
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
        Last sync times for each data type
      </Text>

      <View style={[styles.cacheCard, { backgroundColor: colors.card }]}>
        <View style={styles.cacheRow}>
          <View style={styles.cacheLabel}>
            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.cacheLabelText, { color: colors.textSecondary }]}>Events</Text>
          </View>
          <Text style={[styles.cacheValue, { color: colors.text }]}>
            {formatTimeSinceSync(settings?.last_events_sync_at ?? null)}
          </Text>
        </View>

        <View style={[styles.cacheDivider, { backgroundColor: colors.border }]} />

        <View style={styles.cacheRow}>
          <View style={styles.cacheLabel}>
            <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.cacheLabelText, { color: colors.textSecondary }]}>Fighters</Text>
          </View>
          <Text style={[styles.cacheValue, { color: colors.text }]}>
            {formatTimeSinceSync(settings?.last_fighters_sync_at ?? null)}
          </Text>
        </View>

        <View style={[styles.cacheDivider, { backgroundColor: colors.border }]} />

        <View style={styles.cacheRow}>
          <View style={styles.cacheLabel}>
            <Ionicons name="trophy-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.cacheLabelText, { color: colors.textSecondary }]}>Results</Text>
          </View>
          <Text style={[styles.cacheValue, { color: colors.text }]}>
            {formatTimeSinceSync(settings?.last_results_sync_at ?? null)}
          </Text>
        </View>
      </View>

      {/* Cache Info */}
      <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
        <Ionicons name="information-circle" size={20} color={colors.textSecondary} />
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Event data is cached for {settings?.events_cache_hours || 24} hours.
          Fighter data is cached for {settings?.fighters_cache_hours ? Math.round(settings.fighters_cache_hours / 24) : 7} days.
          Data syncs automatically via Edge Functions.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold as '600',
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.md,
  },
  sourceCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  sourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  sourceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  sourceName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold as '600',
    marginBottom: 4,
  },
  sourceDescription: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  cacheCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  cacheRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  cacheLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cacheLabelText: {
    fontSize: typography.sizes.sm,
  },
  cacheValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium as '500',
  },
  cacheDivider: {
    height: 1,
    marginVertical: spacing.xs,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
});
