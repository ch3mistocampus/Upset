/**
 * Stats screen - accuracy, streaks, recent events
 */

import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useUserStats, useRecentPicksSummary } from '../../hooks/useQueries';
import { useTheme } from '../../lib/theme';
import { spacing, typography } from '../../lib/tokens';
import { Card, StatRing, EmptyState } from '../../components/ui';
import { ErrorState } from '../../components/ErrorState';
import { SkeletonStats } from '../../components/SkeletonStats';
import { MiniChart } from '../../components/MiniChart';

export default function Stats() {
  const { colors } = useTheme();
  const { user } = useAuth();
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
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <SkeletonStats />
        <SkeletonStats />
      </ScrollView>
    );
  }

  if (statsError || summaryError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
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
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
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
      <Card>
        <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
          OVERALL STATS
        </Text>

        {/* Accuracy Ring */}
        <View style={styles.accuracyRingContainer}>
          <StatRing percentage={hasStats ? stats.accuracy_pct : 0} />
        </View>

        {/* Stats Grid below ring */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {stats?.total_picks || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Total Picks
            </Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />

          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {stats?.correct_winner || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Correct
            </Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />

          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.textTertiary }]}>
              {stats?.total_picks ? stats.total_picks - stats.correct_winner : 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Missed
            </Text>
          </View>
        </View>
      </Card>

      {/* Streaks */}
      {hasStats && (
        <Card>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
            STREAKS
          </Text>

          <View style={styles.streaksContainer}>
            <View style={styles.streakItem}>
              <Text style={[styles.streakValue, { color: colors.accent }]}>
                {stats.current_streak}
              </Text>
              <Text style={[styles.streakLabel, { color: colors.textPrimary }]}>
                Current Streak
              </Text>
              <Text style={[styles.streakDescription, { color: colors.textTertiary }]}>
                Consecutive correct picks
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            <View style={styles.streakItem}>
              <Text style={[styles.streakValue, { color: colors.warning }]}>
                {stats.best_streak}
              </Text>
              <Text style={[styles.streakLabel, { color: colors.textPrimary }]}>
                Best Streak
              </Text>
              <Text style={[styles.streakDescription, { color: colors.textTertiary }]}>
                Personal record
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Recent Events */}
      {recentSummary && recentSummary.length > 0 && (
        <Card>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
            RECENT EVENTS
          </Text>

          {/* Mini Chart */}
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

            const getAccuracyColor = () => {
              if (accuracy >= 70) return colors.success;
              if (accuracy >= 50) return colors.warning;
              return colors.danger;
            };

            return (
              <View key={summary.event.id} style={styles.eventItem}>
                <View style={styles.eventHeader}>
                  <Text
                    style={[styles.eventName, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
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
                  <Text style={[styles.eventScore, { color: colors.textPrimary }]}>
                    {summary.correct} / {summary.total}
                  </Text>
                  <Text style={[styles.eventAccuracy, { color: getAccuracyColor() }]}>
                    {accuracy}%
                  </Text>
                </View>

                {index < recentSummary.length - 1 && (
                  <View style={[styles.eventDivider, { backgroundColor: colors.divider }]} />
                )}
              </View>
            );
          })}
        </Card>
      )}

      {/* Empty State */}
      {!hasStats && (
        <EmptyState
          icon="stats-chart-outline"
          title="No Stats Yet"
          message="Make some picks and check back after the event to see your results and track your accuracy!"
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  cardLabel: {
    ...typography.caption,
    marginBottom: spacing.md,
  },
  accuracyRingContainer: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  statValue: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
  },
  streaksContainer: {
    flexDirection: 'row',
  },
  streakItem: {
    flex: 1,
    alignItems: 'center',
  },
  streakValue: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  streakLabel: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  streakDescription: {
    ...typography.meta,
  },
  divider: {
    width: 1,
    marginHorizontal: spacing.lg,
  },
  chartContainer: {
    marginVertical: spacing.md,
    marginHorizontal: -spacing.sm,
  },
  eventItem: {
    paddingVertical: spacing.md,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  eventName: {
    flex: 1,
    ...typography.body,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  eventDate: {
    ...typography.meta,
  },
  eventStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventScore: {
    ...typography.body,
    fontWeight: '600',
  },
  eventAccuracy: {
    ...typography.body,
    fontWeight: '700',
  },
  eventDivider: {
    height: 1,
    marginTop: spacing.md,
  },
});
