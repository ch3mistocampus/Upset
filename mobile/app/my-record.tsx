/**
 * My Record screen (stack version)
 * Stats with swipe-back navigation support
 */

import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { spacing, radius, typography } from '../lib/tokens';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { useUserStats, useRecentPicksSummary } from '../hooks/useQueries';
import { useTheme } from '../lib/theme';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { SkeletonStats } from '../components/SkeletonStats';
import { AccuracyRing } from '../components/AccuracyRing';
import { MiniChart } from '../components/MiniChart';

export default function MyRecord() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useUserStats(user?.id || null);
  const { data: recentSummary, isLoading: summaryLoading, isError: summaryError, refetch: refetchSummary } = useRecentPicksSummary(
    user?.id || null,
    5
  );

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchSummary()]);
    setRefreshing(false);
  };

  if (statsLoading || summaryLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Record</Text>
          <View style={styles.backButton} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <SkeletonStats />
          <SkeletonStats />
        </ScrollView>
      </View>
    );
  }

  if (statsError || summaryError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Record</Text>
          <View style={styles.backButton} />
        </View>
        <ErrorState
          message="Failed to load your stats. Check your connection and try again."
          onRetry={() => {
            refetchStats();
            refetchSummary();
          }}
        />
      </View>
    );
  }

  const hasStats = stats && stats.total_picks > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Record</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* Overall Stats */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>OVERALL STATS</Text>

          {/* Accuracy Ring - Visual centerpiece */}
          <View style={styles.accuracyRingContainer}>
            <AccuracyRing percentage={hasStats ? stats.accuracy_pct : 0} label="Accuracy" />
          </View>

          {/* Stats Grid below ring */}
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats?.total_picks || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Picks</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats?.correct_winner || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Correct</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats?.total_picks ? stats.total_picks - stats.correct_winner : 0}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Missed</Text>
            </View>
          </View>
        </View>

        {/* Streaks */}
        {hasStats && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>STREAKS</Text>

            <View style={styles.streaksContainer}>
              <View style={styles.streakItem}>
                <Text style={[styles.streakValue, { color: colors.text }]}>{stats.current_streak}</Text>
                <Text style={[styles.streakLabel, { color: colors.text }]}>Current Streak</Text>
                <Text style={[styles.streakDescription, { color: colors.textTertiary }]}>Consecutive correct picks</Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.streakItem}>
                <Text style={[styles.streakValue, styles.bestStreakValue]}>
                  {stats.best_streak}
                </Text>
                <Text style={[styles.streakLabel, { color: colors.text }]}>Best Streak</Text>
                <Text style={[styles.streakDescription, { color: colors.textTertiary }]}>Personal record</Text>
              </View>
            </View>
          </View>
        )}

        {/* Recent Events */}
        {recentSummary && recentSummary.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>RECENT EVENTS</Text>

            {/* Mini Chart - Visual trend */}
            <View style={styles.chartContainer}>
              <MiniChart
                data={recentSummary.map((summary) => ({
                  eventName: summary.event.name,
                  accuracy: summary.total > 0 ? (summary.correct / summary.total) * 100 : 0,
                }))}
              />
            </View>

            {/* Detailed list */}
            {recentSummary.map((summary, index) => {
              const accuracy =
                summary.total > 0
                  ? Math.round((summary.correct / summary.total) * 100)
                  : 0;

              return (
                <View key={summary.event.id} style={styles.eventItem}>
                  <View style={styles.eventHeader}>
                    <Text style={[styles.eventName, { color: colors.text }]} numberOfLines={1}>
                      {summary.event.name}
                    </Text>
                    <Text style={[styles.eventDate, { color: colors.textTertiary }]}>
                      {new Date(summary.event.event_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>

                  <View style={styles.eventStats}>
                    <Text style={[styles.eventScore, { color: colors.text }]}>
                      {summary.correct} / {summary.total}
                    </Text>
                    <Text
                      style={[
                        styles.eventAccuracy,
                        accuracy >= 70 && styles.eventAccuracyHigh,
                        accuracy >= 50 && accuracy < 70 && styles.eventAccuracyMedium,
                        accuracy < 50 && styles.eventAccuracyLow,
                      ]}
                    >
                      {accuracy}%
                    </Text>
                  </View>

                  {index < recentSummary.length - 1 && (
                    <View style={[styles.eventDivider, { backgroundColor: colors.border }]} />
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Empty State */}
        {!hasStats && (
          <EmptyState
            icon="stats-chart-outline"
            title="No Stats Yet"
            message="Call some fights and check back. The truth is in the tape."
          />
        )}

        {/* Bottom padding for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'BebasNeue',
    fontSize: 24,
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  card: {
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  cardLabel: {
    fontFamily: 'BebasNeue',
    fontSize: typography.sizes.sm,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  accuracyRingContainer: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
  },
  chartContainer: {
    marginVertical: spacing.sm,
    marginHorizontal: -spacing.xs,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'BebasNeue',
    fontSize: 36,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
  },
  streaksContainer: {
    flexDirection: 'row',
  },
  streakItem: {
    flex: 1,
    alignItems: 'center',
  },
  streakValue: {
    fontFamily: 'BebasNeue',
    fontSize: 42,
    marginBottom: spacing.xs,
  },
  bestStreakValue: {
    color: '#fbbf24',
  },
  streakLabel: {
    fontSize: typography.sizes.md,
    fontWeight: '600' as const,
    marginBottom: spacing.xs,
  },
  streakDescription: {
    fontSize: typography.sizes.xs,
  },
  divider: {
    width: 1,
    marginHorizontal: spacing.md,
  },
  eventItem: {
    paddingVertical: spacing.sm,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  eventName: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: '600' as const,
    marginRight: spacing.xs,
  },
  eventDate: {
    fontSize: typography.sizes.xs,
  },
  eventStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventScore: {
    fontSize: typography.sizes.lg,
    fontWeight: '600' as const,
  },
  eventAccuracy: {
    fontSize: typography.sizes.lg,
    fontWeight: '700' as const,
  },
  eventAccuracyHigh: {
    color: '#4ade80',
  },
  eventAccuracyMedium: {
    color: '#fbbf24',
  },
  eventAccuracyLow: {
    color: '#ef4444',
  },
  eventDivider: {
    height: 1,
    marginTop: spacing.sm,
  },
});
