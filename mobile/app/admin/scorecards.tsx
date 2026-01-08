/**
 * Admin Scorecards Dashboard
 *
 * Control panel for managing live fight scorecards.
 * Allows admins to start/end rounds, open/close scoring windows.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { useAdminLiveFights, useAdminUpdateRoundState } from '../../hooks/useScorecard';
import { useToast } from '../../hooks/useToast';
import { SurfaceCard, EmptyState } from '../../components/ui';
import type { LiveFight, AdminAction, RoundPhase } from '../../types/scorecard';

// Phase colors and labels
const PHASE_CONFIG: Record<RoundPhase, { color: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  PRE_FIGHT: { color: '#6B7280', label: 'Pre-Fight', icon: 'time-outline' },
  ROUND_LIVE: { color: '#EF4444', label: 'Round Live', icon: 'radio-button-on' },
  ROUND_BREAK: { color: '#10B981', label: 'Scoring Open', icon: 'create-outline' },
  ROUND_CLOSED: { color: '#F59E0B', label: 'Scoring Closed', icon: 'lock-closed-outline' },
  FIGHT_ENDED: { color: '#6B7280', label: 'Fight Ended', icon: 'checkmark-circle-outline' },
};

// Action buttons based on current phase
const getAvailableActions = (phase: RoundPhase): { action: AdminAction; label: string; color: string; icon: keyof typeof Ionicons.glyphMap }[] => {
  switch (phase) {
    case 'PRE_FIGHT':
      return [{ action: 'START_ROUND', label: 'Start Round 1', color: '#10B981', icon: 'play' }];
    case 'ROUND_LIVE':
      return [{ action: 'END_ROUND', label: 'End Round', color: '#F59E0B', icon: 'stop' }];
    case 'ROUND_BREAK':
      return [
        { action: 'START_ROUND', label: 'Start Next Round', color: '#10B981', icon: 'play' },
        { action: 'CLOSE_SCORING', label: 'Close Scoring', color: '#F59E0B', icon: 'lock-closed' },
        { action: 'END_FIGHT', label: 'End Fight', color: '#EF4444', icon: 'flag' },
      ];
    case 'ROUND_CLOSED':
      return [
        { action: 'START_ROUND', label: 'Start Next Round', color: '#10B981', icon: 'play' },
        { action: 'END_FIGHT', label: 'End Fight', color: '#EF4444', icon: 'flag' },
      ];
    default:
      return [];
  }
};

// Live Fight Card Component
interface LiveFightCardProps {
  fight: LiveFight;
  onAction: (action: AdminAction, roundNumber?: number) => void;
  isLoading: boolean;
}

function LiveFightCard({ fight, onAction, isLoading }: LiveFightCardProps) {
  const { colors } = useTheme();
  const phaseConfig = PHASE_CONFIG[fight.phase as RoundPhase] || PHASE_CONFIG.PRE_FIGHT;
  const availableActions = getAvailableActions(fight.phase as RoundPhase);

  const totalSubmissions = fight.submission_counts?.reduce((sum, s) => sum + s.count, 0) || 0;

  const handleAction = (action: AdminAction) => {
    const actionLabel = availableActions.find(a => a.action === action)?.label || action;

    Alert.alert(
      'Confirm Action',
      `Are you sure you want to "${actionLabel}" for ${fight.red_name} vs ${fight.blue_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: action === 'END_FIGHT' ? 'destructive' : 'default',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onAction(action, action === 'START_ROUND' ? fight.current_round + 1 : undefined);
          },
        },
      ]
    );
  };

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

      {/* Action Buttons */}
      {availableActions.length > 0 && (
        <View style={styles.actionsContainer}>
          {availableActions.map((actionConfig) => (
            <TouchableOpacity
              key={actionConfig.action}
              style={[
                styles.actionButton,
                { backgroundColor: actionConfig.color },
                isLoading && styles.actionButtonDisabled,
              ]}
              onPress={() => handleAction(actionConfig.action)}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name={actionConfig.icon} size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>{actionConfig.label}</Text>
                </>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </SurfaceCard>
  );
}

// Main Screen
export default function AdminScorecardsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [actioningBoutId, setActioningBoutId] = useState<string | null>(null);

  const { data: liveFights, isLoading, isError, refetch } = useAdminLiveFights();
  const updateRoundState = useAdminUpdateRoundState();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleAction = useCallback(
    async (boutId: string, action: AdminAction, roundNumber?: number) => {
      setActioningBoutId(boutId);
      try {
        const result = await updateRoundState.mutateAsync({
          boutId,
          action,
          roundNumber,
        });

        if (result.success) {
          toast.showNeutral(result.message || `Action "${action}" completed`);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          toast.showError(result.error || 'Action failed');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } catch (error: any) {
        toast.showError(error.message || 'Failed to update round state');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setActioningBoutId(null);
      }
    },
    [updateRoundState, toast]
  );

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

      {/* Info Banner */}
      <View style={[styles.infoBanner, { backgroundColor: colors.warningSoft }]}>
        <Ionicons name="information-circle" size={20} color={colors.warning} />
        <Text style={[styles.infoBannerText, { color: colors.warning }]}>
          Changes are logged. Be careful with END_FIGHT - it cannot be undone.
        </Text>
      </View>

      {/* Live Fights List */}
      {fights.length > 0 ? (
        <View style={styles.fightsList}>
          {fights.map((fight) => (
            <LiveFightCard
              key={fight.bout_id}
              fight={fight}
              onAction={(action, roundNumber) => handleAction(fight.bout_id, action, roundNumber)}
              isLoading={actioningBoutId === fight.bout_id}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="stats-chart-outline"
          title="No Active Scorecards"
          message="There are no fights with active scorecards right now. Start scoring from the event page."
          actionLabel="View Events"
          onAction={() => router.push('/(tabs)/home')}
        />
      )}

      {/* Quick Start Guide */}
      <View style={[styles.guideCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.guideTitle, { color: colors.text }]}>Quick Start Guide</Text>
        <View style={styles.guideSteps}>
          <View style={styles.guideStep}>
            <View style={[styles.guideStepNumber, { backgroundColor: colors.accent }]}>
              <Text style={styles.guideStepNumberText}>1</Text>
            </View>
            <Text style={[styles.guideStepText, { color: colors.textSecondary }]}>
              Press "Start Round" when the round begins
            </Text>
          </View>
          <View style={styles.guideStep}>
            <View style={[styles.guideStepNumber, { backgroundColor: colors.accent }]}>
              <Text style={styles.guideStepNumberText}>2</Text>
            </View>
            <Text style={[styles.guideStepText, { color: colors.textSecondary }]}>
              Press "End Round" when the bell sounds - scoring window opens
            </Text>
          </View>
          <View style={styles.guideStep}>
            <View style={[styles.guideStepNumber, { backgroundColor: colors.accent }]}>
              <Text style={styles.guideStepNumberText}>3</Text>
            </View>
            <Text style={[styles.guideStepText, { color: colors.textSecondary }]}>
              Wait ~90 seconds for users to score, then start the next round
            </Text>
          </View>
          <View style={styles.guideStep}>
            <View style={[styles.guideStepNumber, { backgroundColor: colors.accent }]}>
              <Text style={styles.guideStepNumberText}>4</Text>
            </View>
            <Text style={[styles.guideStepText, { color: colors.textSecondary }]}>
              Press "End Fight" when the fight is over (finish or decision)
            </Text>
          </View>
        </View>
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

  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
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

  // Actions
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // Guide
  guideCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.lg,
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  guideSteps: {
    gap: spacing.sm,
  },
  guideStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  guideStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideStepNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  guideStepText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
