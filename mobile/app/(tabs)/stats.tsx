/**
 * Stats screen - accuracy, streaks, recent events
 */

import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useUserStats, useRecentPicksSummary } from '../../hooks/useQueries';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonStats } from '../../components/SkeletonStats';
import { AccuracyRing } from '../../components/AccuracyRing';
import { MiniChart } from '../../components/MiniChart';

export default function Stats() {
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
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <SkeletonStats />
        <SkeletonStats />
      </ScrollView>
    );
  }

  if (statsError || summaryError) {
    return (
      <ErrorState
        message="Failed to load your stats. Check your connection and try again."
        onRetry={() => {
          refetchStats();
          refetchSummary();
        }}
      />
    );
  }

  const hasStats = stats && stats.total_picks > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#d4202a"
          colors={['#d4202a']}
        />
      }
    >
      {/* Overall Stats */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>OVERALL STATS</Text>

        {/* Accuracy Ring - Visual centerpiece */}
        <View style={styles.accuracyRingContainer}>
          <AccuracyRing percentage={hasStats ? stats.accuracy_pct : 0} label="Accuracy" />
        </View>

        {/* Stats Grid below ring */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats?.total_picks || 0}</Text>
            <Text style={styles.statLabel}>Total Picks</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats?.correct_winner || 0}</Text>
            <Text style={styles.statLabel}>Correct</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats?.total_picks ? stats.total_picks - stats.correct_winner : 0}</Text>
            <Text style={styles.statLabel}>Missed</Text>
          </View>
        </View>
      </View>

      {/* Streaks */}
      {hasStats && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>STREAKS</Text>

          <View style={styles.streaksContainer}>
            <View style={styles.streakItem}>
              <Text style={styles.streakValue}>{stats.current_streak}</Text>
              <Text style={styles.streakLabel}>Current Streak</Text>
              <Text style={styles.streakDescription}>Consecutive correct picks</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.streakItem}>
              <Text style={[styles.streakValue, styles.bestStreakValue]}>
                {stats.best_streak}
              </Text>
              <Text style={styles.streakLabel}>Best Streak</Text>
              <Text style={styles.streakDescription}>Personal record</Text>
            </View>
          </View>
        </View>
      )}

      {/* Recent Events */}
      {recentSummary && recentSummary.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>RECENT EVENTS</Text>

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
                  <Text style={styles.eventName} numberOfLines={1}>
                    {summary.event.name}
                  </Text>
                  <Text style={styles.eventDate}>
                    {new Date(summary.event.event_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>

                <View style={styles.eventStats}>
                  <Text style={styles.eventScore}>
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

                {index < recentSummary.length - 1 && <View style={styles.eventDivider} />}
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
          message="Make some picks and check back after the event to see your results and track your accuracy!"
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#999',
    letterSpacing: 1,
    marginBottom: 16,
  },
  accuracyRingContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  chartContainer: {
    marginVertical: 12,
    marginHorizontal: -8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  accuracyValue: {
    color: '#d4202a',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
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
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  bestStreakValue: {
    color: '#fbbf24',
  },
  streakLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  streakDescription: {
    fontSize: 12,
    color: '#666',
  },
  divider: {
    width: 1,
    backgroundColor: '#333',
    marginHorizontal: 16,
  },
  eventItem: {
    paddingVertical: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  eventDate: {
    fontSize: 12,
    color: '#666',
  },
  eventStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventScore: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  eventAccuracy: {
    fontSize: 16,
    fontWeight: 'bold',
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
    backgroundColor: '#333',
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
