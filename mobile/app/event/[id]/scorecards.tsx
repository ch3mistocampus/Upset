/**
 * Event Scorecards Overview
 *
 * Shows all scorecards for an event at a glance with live status
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../lib/theme';
import { spacing, radius, typography } from '../../../lib/tokens';
import { useEvent, useBoutsForEvent } from '../../../hooks/useQueries';
import { useEventScorecards, useEventLiveStatus, getEventPollingInterval, useEventScorecardRealtime } from '../../../hooks/useScorecard';
import { useAuth } from '../../../hooks/useAuth';
import { SurfaceCard, EmptyState, LiveBadge, ScoreBucketBar } from '../../../components/ui';
import { ErrorState } from '../../../components/ErrorState';
import type { RoundPhase, EventScorecardSummary } from '../../../types/scorecard';

// Corner colors
const useCornerColors = () => {
  const { isDark } = useTheme();
  return {
    red: isDark ? '#C54A50' : '#943538',
    blue: isDark ? '#4A6FA5' : '#1E3A5F',
  };
};

// Fight Scorecard Card Component - Memoized for performance
const FightScorecardCard = React.memo<{
  scorecard: EventScorecardSummary;
  liveStatus?: {
    phase: string;
    currentRound: number;
    scheduledRounds: number;
    isLive: boolean;
    isScoring: boolean;
  };
  onPress: () => void;
}>(({ scorecard, liveStatus, onPress }) => {
  const { colors } = useTheme();
  const cornerColors = useCornerColors();

  const isLive = liveStatus?.isLive || liveStatus?.isScoring;

  // Safe access to rounds array (now properly returned from RPC)
  const rounds = scorecard.rounds || [];
  const hasScores = scorecard.total_submissions > 0 || rounds.some(r => r.submission_count > 0);

  // Calculate totals from rounds with safe access
  const redTotal = rounds.reduce((sum, r) => sum + (r.mean_red || 0), 0);
  const blueTotal = rounds.reduce((sum, r) => sum + (r.mean_blue || 0), 0);
  const totalSubmissions = scorecard.total_submissions || rounds.reduce((sum, r) => sum + r.submission_count, 0);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <SurfaceCard weakWash paddingSize="md" style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.fighterNames}>
            <Text style={[styles.fighterName, { color: cornerColors.red }]} numberOfLines={1}>
              {scorecard.red_name}
            </Text>
            <Text style={[styles.vsText, { color: colors.textTertiary }]}>vs</Text>
            <Text style={[styles.fighterName, { color: cornerColors.blue }]} numberOfLines={1}>
              {scorecard.blue_name}
            </Text>
          </View>
          {liveStatus?.phase && (
            <LiveBadge
              phase={liveStatus.phase as RoundPhase}
              currentRound={liveStatus.currentRound}
              size="sm"
              showRound
            />
          )}
        </View>

        {/* Scores */}
        {hasScores ? (
          <View style={styles.scoresSection}>
            {/* Global Score */}
            <View style={styles.scoreRow}>
              <View style={[styles.scoreBadge, { backgroundColor: cornerColors.red }]}>
                <Text style={styles.scoreValue}>{redTotal.toFixed(0)}</Text>
              </View>
              <View style={styles.scoreMiddle}>
                <Text style={[styles.scoreLabel, { color: colors.textTertiary }]}>
                  Global Score
                </Text>
                <Text style={[styles.submissionCount, { color: colors.textSecondary }]}>
                  {totalSubmissions} vote{totalSubmissions !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={[styles.scoreBadge, { backgroundColor: cornerColors.blue }]}>
                <Text style={styles.scoreValue}>{blueTotal.toFixed(0)}</Text>
              </View>
            </View>

            {/* Round indicators */}
            <View style={styles.roundIndicators}>
              {Array.from({ length: liveStatus?.scheduledRounds || scorecard.round_state?.scheduled_rounds || 3 }, (_, i) => {
                const round = rounds.find((r) => r.round_number === i + 1);
                const hasRoundData = round && round.submission_count > 0;
                const isCurrentRound = (liveStatus?.currentRound || scorecard.round_state?.current_round) === i + 1;

                let winner: 'red' | 'blue' | 'even' | null = null;
                if (hasRoundData && round.mean_red !== null && round.mean_blue !== null) {
                  if (round.mean_red > round.mean_blue) winner = 'red';
                  else if (round.mean_blue > round.mean_red) winner = 'blue';
                  else winner = 'even';
                }

                return (
                  <View
                    key={i}
                    style={[
                      styles.roundDot,
                      {
                        backgroundColor: hasRoundData
                          ? winner === 'red'
                            ? cornerColors.red
                            : winner === 'blue'
                            ? cornerColors.blue
                            : colors.textTertiary
                          : colors.surfaceAlt,
                        borderColor: isCurrentRound ? colors.accent : 'transparent',
                        borderWidth: isCurrentRound ? 2 : 0,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.roundDotText,
                        { color: hasRoundData ? '#fff' : colors.textTertiary },
                      ]}
                    >
                      {i + 1}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.noScoresSection}>
            <Ionicons name="stats-chart-outline" size={20} color={colors.textTertiary} />
            <Text style={[styles.noScoresText, { color: colors.textTertiary }]}>
              {isLive ? 'Waiting for scores...' : 'No scores yet'}
            </Text>
          </View>
        )}

        {/* View Scorecard link */}
        <View style={styles.cardFooter}>
          <Text style={[styles.viewLink, { color: colors.accent }]}>
            {isLive && liveStatus?.isScoring ? 'Score Now' : 'View Scorecard'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.accent} />
        </View>
      </SurfaceCard>
    </TouchableOpacity>
  );
});

FightScorecardCard.displayName = 'FightScorecardCard';

export default function EventScorecardsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, isGuest } = useAuth();

  const { data: event, isLoading: eventLoading, isError: eventError, refetch: refetchEvent } = useEvent(id || null);
  const { data: bouts, isLoading: boutsLoading } = useBoutsForEvent(id || null, user?.id || null, isGuest);
  const boutIds = bouts?.map((b) => b.id) || [];
  const { data: liveStatusMap, refetch: refetchLiveStatus } = useEventLiveStatus(boutIds);

  // Determine optimal polling interval based on fight phases
  const liveStatuses = Array.from(liveStatusMap?.values() || []);
  const phases = liveStatuses.map(s => s.phase);
  const pollingInterval = getEventPollingInterval(phases);

  const { data: scorecards, isLoading: scorecardsLoading, isError: scorecardsError, refetch: refetchScorecards } =
    useEventScorecards(id || undefined, { refetchInterval: pollingInterval });

  // Subscribe to realtime updates for all bouts in this event
  useEventScorecardRealtime(id || undefined, boutIds);

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchEvent(), refetchScorecards(), refetchLiveStatus()]);
    setRefreshing(false);
  }, [refetchEvent, refetchScorecards, refetchLiveStatus]);

  const handleBoutPress = useCallback(
    (boutId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/bout/${boutId}/scorecard`);
    },
    [router]
  );

  const isLoading = eventLoading || scorecardsLoading || boutsLoading;

  // Header
  const Header = () => (
    <View style={[styles.header, { paddingTop: insets.top, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
        {event?.name ? `${event.name} Scorecards` : 'Event Scorecards'}
      </Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading scorecards...
          </Text>
        </View>
      </View>
    );
  }

  if (eventError || scorecardsError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header />
        <ErrorState
          message="Failed to load scorecards. Check your connection and try again."
          onRetry={onRefresh}
        />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header />
        <EmptyState
          icon="calendar-outline"
          title="Event Not Found"
          message="This event could not be found."
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const scorecardList = scorecards?.scorecards || [];
  const liveFightsCount = Array.from(liveStatusMap?.values() || []).filter(
    (s) => s.isLive || s.isScoring
  ).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* Event Info */}
        <View style={styles.eventInfo}>
          {event.location && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {event.location}
              </Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {new Date(event.event_date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
          {liveFightsCount > 0 && (
            <View style={[styles.liveBanner, { backgroundColor: colors.dangerSoft }]}>
              <LiveBadge phase="ROUND_LIVE" size="sm" />
              <Text style={[styles.liveBannerText, { color: colors.danger }]}>
                {liveFightsCount} {liveFightsCount === 1 ? 'fight' : 'fights'} in progress
              </Text>
            </View>
          )}
        </View>

        {/* Scorecards List */}
        {scorecardList.length > 0 ? (
          <View style={styles.scorecardList}>
            {scorecardList.map((scorecard, index) => (
              <FightScorecardCard
                key={scorecard.bout_id}
                scorecard={scorecard}
                liveStatus={liveStatusMap?.get(scorecard.bout_id)}
                onPress={() => handleBoutPress(scorecard.bout_id)}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="stats-chart-outline"
            title="No Scorecards Yet"
            message="Scorecards will appear here once fights begin and users start scoring."
          />
        )}
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    ...typography.h3,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
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
  eventInfo: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: {
    ...typography.body,
  },
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
  },
  liveBannerText: {
    ...typography.body,
    fontWeight: '600',
  },
  scorecardList: {
    gap: spacing.sm,
  },
  card: {
    marginBottom: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  fighterNames: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  fighterName: {
    ...typography.body,
    fontWeight: '700',
    flex: 1,
  },
  vsText: {
    fontSize: 12,
    fontWeight: '500',
  },
  scoresSection: {
    gap: spacing.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  scoreMiddle: {
    flex: 1,
    alignItems: 'center',
  },
  scoreLabel: {
    ...typography.meta,
    fontWeight: '600',
  },
  submissionCount: {
    ...typography.meta,
  },
  roundIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  roundDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundDotText: {
    fontSize: 11,
    fontWeight: '700',
  },
  noScoresSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  noScoresText: {
    ...typography.body,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  viewLink: {
    ...typography.body,
    fontWeight: '600',
  },
});
