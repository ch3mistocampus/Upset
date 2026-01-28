/**
 * Admin Scorecards Dashboard (Read-Only)
 *
 * View-only display of live fight status and submission counts.
 * Full fight controls available at upsetmma.app/admin.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { useAdminLiveFights } from '../../hooks/useScorecard';
import { SurfaceCard, EmptyState } from '../../components/ui';
import type { LiveFight, RoundPhase } from '../../types/scorecard';

// Phase colors and labels
const PHASE_CONFIG: Record<RoundPhase, { color: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  PRE_FIGHT: { color: '#6B7280', label: 'Pre-Fight', icon: 'time-outline' },
  ROUND_LIVE: { color: '#EF4444', label: 'Round Live', icon: 'radio-button-on' },
  ROUND_BREAK: { color: '#10B981', label: 'Scoring Open', icon: 'create-outline' },
  ROUND_CLOSED: { color: '#F59E0B', label: 'Scoring Closed', icon: 'lock-closed-outline' },
  FIGHT_ENDED: { color: '#6B7280', label: 'Fight Ended', icon: 'checkmark-circle-outline' },
};

// Live Fight Card Component (read-only)
function LiveFightCard({ fight }: { fight: LiveFight }) {
  const { colors } = useTheme();
  const phaseConfig = PHASE_CONFIG[fight.phase as RoundPhase] || PHASE_CONFIG.PRE_FIGHT;

  const totalSubmissions = fight.submission_counts?.reduce((sum, s) => sum + s.count, 0) || 0;

  return (
    <SurfaceCard style={styles.fightCard}>
      {/* Header */}
      <View style={styles.fightHeader}>
        <View style={styles.fightNames}>
          <Text style={[styles.fighterName, { color: '#C54A50' }]} numberOfLines={1}>
            {fight.red_name}
          </Text>
          <Text style={[styles.vsText, { color: colors.textTertiary }]}>vs</Text>
          <Text style={[styles.fighterName, { color: '#4A6FA5' }]} numberOfLines={1}>
            {fight.blue_name}
          </Text>
        </View>
        <View style={[styles.phaseBadge, { backgroundColor: phaseConfig.color + '20' }]}>
          <Ionicons name={phaseConfig.icon} size={14} color={phaseConfig.color} />
          <Text style={[styles.phaseBadgeText, { color: phaseConfig.color }]}>
            {phaseConfig.label}
          </Text>
        </View>
      </View>

      {/* Event Info */}
      <Text style={[styles.eventName, { color: colors.textSecondary }]} numberOfLines={1}>
        {fight.event_name}
      </Text>

      {/* Stats Row */}
      <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {fight.current_round}/{fight.scheduled_rounds}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Round</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>{totalSubmissions}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Scores</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {fight.submission_counts?.length || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Rounds Scored</Text>
        </View>
      </View>

      {/* Round Submissions */}
      {fight.submission_counts && fight.submission_counts.length > 0 && (
        <View style={styles.roundSubmissions}>
          <Text style={[styles.roundSubmissionsLabel, { color: colors.textSecondary }]}>
            Submissions per round:
          </Text>
          <View style={styles.roundSubmissionsRow}>
            {fight.submission_counts.map((s) => (
              <View
                key={s.round}
                style={[styles.roundSubmissionBadge, { backgroundColor: colors.surfaceAlt }]}
              >
                <Text style={[styles.roundSubmissionText, { color: colors.text }]}>
                  R{s.round}: {s.count}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </SurfaceCard>
  );
}

// Main Screen
export default function AdminScorecardsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: liveFights, isLoading, refetch } = useAdminLiveFights();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading && !liveFights) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading live fights...
          </Text>
        </View>
      </View>
    );
  }

  const fights = liveFights || [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
        />
      }
    >
      {/* Header Stats */}
      <View style={[styles.headerStats, { backgroundColor: colors.surface }]}>
        <View style={styles.headerStat}>
          <Text style={[styles.headerStatValue, { color: colors.accent }]}>{fights.length}</Text>
          <Text style={[styles.headerStatLabel, { color: colors.textSecondary }]}>
            Active Fights
          </Text>
        </View>
        <View style={styles.headerStat}>
          <Text style={[styles.headerStatValue, { color: colors.success }]}>
            {fights.filter((f) => f.phase === 'ROUND_BREAK').length}
          </Text>
          <Text style={[styles.headerStatLabel, { color: colors.textSecondary }]}>
            Scoring Open
          </Text>
        </View>
        <View style={styles.headerStat}>
          <Text style={[styles.headerStatValue, { color: colors.warning }]}>
            {fights.filter((f) => f.phase === 'ROUND_LIVE').length}
          </Text>
          <Text style={[styles.headerStatLabel, { color: colors.textSecondary }]}>
            Rounds Live
          </Text>
        </View>
      </View>

      {/* Web admin note */}
      <View style={[styles.webNote, { backgroundColor: colors.card }]}>
        <Ionicons name="desktop-outline" size={16} color={colors.accent} />
        <Text style={[styles.webNoteText, { color: colors.textSecondary }]}>
          Manage fight controls at upsetmma.app/admin
        </Text>
      </View>

      {/* Live Fights List */}
      {fights.length > 0 ? (
        <View style={styles.fightsList}>
          {fights.map((fight) => (
            <LiveFightCard key={fight.bout_id} fight={fight} />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="stats-chart-outline"
          title="No Active Scorecards"
          message="There are no fights with active scorecards right now."
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
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
  },

  // Header Stats
  headerStats: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  headerStat: {
    flex: 1,
    alignItems: 'center',
  },
  headerStatValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },

  // Web Note
  webNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  webNoteText: {
    flex: 1,
    fontSize: typography.sizes.sm,
  },

  // Fight Card
  fightsList: {
    gap: spacing.md,
  },
  fightCard: {
    marginBottom: 0,
  },
  fightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  fightNames: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  fighterName: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  vsText: {
    fontSize: 11,
  },
  phaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  phaseBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  eventName: {
    fontSize: 12,
    marginBottom: spacing.sm,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
  },

  // Round Submissions
  roundSubmissions: {
    marginTop: spacing.sm,
  },
  roundSubmissionsLabel: {
    fontSize: 11,
    marginBottom: spacing.xs,
  },
  roundSubmissionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  roundSubmissionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  roundSubmissionText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
