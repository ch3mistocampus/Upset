/**
 * Data Sources Admin Page
 * Toggle between UFCStats scraper and MMA API, monitor usage
 */

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import {
  useDataSourceSettings,
  useSetDataSource,
  useApiUsage,
  DataSourceType,
  getDataSourceInfo,
  formatTimeSinceSync,
} from '../../hooks/useDataSource';
import * as Haptics from 'expo-haptics';

interface DataSourceCardProps {
  source: DataSourceType;
  isActive: boolean;
  onSelect: () => void;
  disabled?: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}

function DataSourceCard({ source, isActive, onSelect, disabled, colors }: DataSourceCardProps) {
  const info = getDataSourceInfo(source);

  return (
    <TouchableOpacity
      style={[
        styles.sourceCard,
        {
          backgroundColor: colors.card,
          borderColor: isActive ? info.color : colors.border,
          borderWidth: isActive ? 2 : 1,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
      onPress={onSelect}
      disabled={disabled || isActive}
      activeOpacity={0.7}
    >
      <View style={styles.sourceHeader}>
        <View style={[styles.sourceIcon, { backgroundColor: info.color + '20' }]}>
          <Ionicons name={info.icon} size={24} color={info.color} />
        </View>
        {isActive && (
          <View style={[styles.activeBadge, { backgroundColor: info.color }]}>
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        )}
      </View>
      <Text style={[styles.sourceName, { color: colors.text }]}>{info.name}</Text>
      <Text style={[styles.sourceDescription, { color: colors.textSecondary }]}>
        {info.description}
      </Text>
      <View style={[styles.limitBadge, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name="speedometer-outline" size={14} color={colors.textTertiary} />
        <Text style={[styles.limitText, { color: colors.textTertiary }]}>
          {info.limitInfo}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function DataSourcesPage() {
  const { colors } = useTheme();
  const { data: settings, isLoading: settingsLoading } = useDataSourceSettings();
  const { data: usage, isLoading: usageLoading } = useApiUsage();
  const setDataSource = useSetDataSource();

  const handleSourceChange = (source: DataSourceType) => {
    if (source === settings?.primary_data_source) return;

    const info = getDataSourceInfo(source);

    Alert.alert(
      `Switch to ${info.name}?`,
      source === 'mma-api'
        ? 'The MMA API has a limit of 80 requests per month on the free tier. Use sparingly.'
        : 'The UFCStats scraper is free but may break if the website changes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setDataSource.mutate(source);
          },
        },
      ]
    );
  };

  const usagePercentage = usage ? Math.round((usage.mma_api_used / usage.mma_api_limit) * 100) : 0;
  const usageColor = usagePercentage > 80 ? '#EF4444' : usagePercentage > 50 ? '#F59E0B' : '#10B981';

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
      {/* Data Source Selection */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Primary Data Source</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
        Choose where to fetch UFC event and fighter data
      </Text>

      <View style={styles.sourceGrid}>
        <DataSourceCard
          source="ufcstats"
          isActive={settings?.primary_data_source === 'ufcstats'}
          onSelect={() => handleSourceChange('ufcstats')}
          disabled={setDataSource.isPending}
          colors={colors}
        />
        <DataSourceCard
          source="mma-api"
          isActive={settings?.primary_data_source === 'mma-api'}
          onSelect={() => handleSourceChange('mma-api')}
          disabled={setDataSource.isPending}
          colors={colors}
        />
      </View>

      {/* API Usage */}
      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.xl }]}>
        MMA API Usage
      </Text>
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
        {usage?.month || 'Current month'} - Free tier limit: {usage?.mma_api_limit || 80} requests
      </Text>

      <View style={[styles.usageCard, { backgroundColor: colors.card }]}>
        <View style={styles.usageHeader}>
          <Text style={[styles.usageValue, { color: colors.text }]}>
            {usage?.mma_api_used || 0}
            <Text style={[styles.usageLimit, { color: colors.textSecondary }]}>
              {' '}/ {usage?.mma_api_limit || 80}
            </Text>
          </Text>
          <Text style={[styles.usagePercent, { color: usageColor }]}>
            {usagePercentage}%
          </Text>
        </View>

        {/* Progress bar */}
        <View style={[styles.progressBar, { backgroundColor: colors.surfaceAlt }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: usageColor, width: `${Math.min(usagePercentage, 100)}%` },
            ]}
          />
        </View>

        {usagePercentage > 80 && (
          <View style={[styles.warningBanner, { backgroundColor: '#FEF2F2' }]}>
            <Ionicons name="warning" size={16} color="#EF4444" />
            <Text style={styles.warningText}>
              Approaching limit! Consider switching to UFCStats scraper.
            </Text>
          </View>
        )}
      </View>

      {/* Last Sync Times */}
      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.xl }]}>
        Cache Status
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
          This minimizes API calls to stay within free tier limits.
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
  sourceGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sourceCard: {
    flex: 1,
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
    fontSize: typography.sizes.xs,
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
  limitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  limitText: {
    fontSize: 10,
  },
  usageCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  usageValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as '700',
  },
  usageLimit: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.normal as '400',
  },
  usagePercent: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold as '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
  },
  warningText: {
    color: '#EF4444',
    fontSize: typography.sizes.xs,
    flex: 1,
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
