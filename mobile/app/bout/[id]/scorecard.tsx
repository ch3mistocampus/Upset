/**
 * Fight Scorecard Screen
 *
 * Shows global scorecard for a specific fight with:
 * - Round-by-round scoring interface
 * - Aggregated global scores
 * - User's submitted scores
 * - Live updates during scoring windows
 */

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../lib/theme';
import { spacing, radius, typography } from '../../../lib/tokens';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import {
  useFightScorecard,
  useSubmitScore,
  getScorecardPollingInterval,
  useScorecardRealtime,
} from '../../../hooks/useScorecard';
import { SurfaceCard, EmptyState, GracePeriodTimer, ScoreConfirmationModal, ScorecardSkeleton, ShareScorecard } from '../../../components/ui';
import { ErrorState } from '../../../components/ErrorState';
import type {
  RoundAggregate,
  RoundScore,
  RoundPhase,
  ScoreBuckets,
  ScoreOption,
} from '../../../types/scorecard';
import {
  SCORE_OPTIONS,
  formatPhase,
  getPhaseColor,
  getRoundWinner,
  getDominantBucket,
  formatBucket,
  calculateTotalScore,
} from '../../../types/scorecard';

// UFC Corner Colors
const useCornerColors = () => {
  const { isDark } = useTheme();
  return {
    red: isDark ? '#C54A50' : '#943538',
    blue: isDark ? '#4A6FA5' : '#1E3A5F',
    redSoft: isDark ? 'rgba(197, 74, 80, 0.25)' : 'rgba(148, 53, 56, 0.15)',
    blueSoft: isDark ? 'rgba(74, 111, 165, 0.25)' : 'rgba(30, 58, 95, 0.15)',
  };
};

// =============================================================================
// SCORE OPTION BUTTON
// =============================================================================

interface ScoreOptionButtonProps {
  option: ScoreOption;
  isSelected: boolean;
  onPress: () => void;
  disabled: boolean;
  redName: string;
  blueName: string;
}

function ScoreOptionButton({
  option,
  isSelected,
  onPress,
  disabled,
  redName,
  blueName,
}: ScoreOptionButtonProps) {
  const { colors } = useTheme();
  const cornerColors = useCornerColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const isRedWin = option.score_red > option.score_blue;
  const isBlueWin = option.score_blue > option.score_red;
  const winnerColor = isRedWin ? cornerColors.red : isBlueWin ? cornerColors.blue : colors.textSecondary;
  const winnerName = isRedWin ? redName : isBlueWin ? blueName : 'Even';

  const handlePressIn = () => {
    if (!disabled) {
      Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, tension: 150, friction: 5 }).start();
    }
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 150, friction: 5 }).start();
  };

  return (
    <Animated.View style={[styles.scoreOptionWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={[
          styles.scoreOption,
          {
            backgroundColor: isSelected ? winnerColor : colors.surfaceAlt,
            borderColor: isSelected ? winnerColor : colors.border,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.scoreOptionLabel,
            { color: isSelected ? '#fff' : colors.text },
          ]}
        >
          {option.label}
        </Text>
        <Text
          style={[
            styles.scoreOptionDesc,
            { color: isSelected ? 'rgba(255,255,255,0.8)' : colors.textSecondary },
          ]}
          numberOfLines={1}
        >
          {winnerName}
        </Text>
        {isSelected && (
          <Ionicons
            name="checkmark-circle"
            size={18}
            color="#fff"
            style={styles.scoreOptionCheck}
          />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// =============================================================================
// ROUND TILE
// =============================================================================

interface RoundTileProps {
  roundNumber: number;
  aggregate: RoundAggregate | undefined;
  userScore: RoundScore | undefined;
  isCurrentRound: boolean;
  isScoringOpen: boolean;
  redName: string;
  blueName: string;
  onExpand: () => void;
  isExpanded: boolean;
}

function RoundTile({
  roundNumber,
  aggregate,
  userScore,
  isCurrentRound,
  isScoringOpen,
  redName,
  blueName,
  onExpand,
  isExpanded,
}: RoundTileProps) {
  const { colors } = useTheme();
  const cornerColors = useCornerColors();

  const winner = aggregate ? getRoundWinner(aggregate) : null;
  const dominantBucket = aggregate?.buckets ? getDominantBucket(aggregate.buckets) : null;

  const winnerColor =
    winner === 'red'
      ? cornerColors.red
      : winner === 'blue'
      ? cornerColors.blue
      : colors.textSecondary;

  return (
    <TouchableOpacity
      style={[
        styles.roundTile,
        {
          backgroundColor: colors.surfaceAlt,
          borderColor: isCurrentRound && isScoringOpen ? colors.success : colors.border,
          borderWidth: isCurrentRound && isScoringOpen ? 2 : 1,
        },
      ]}
      onPress={onExpand}
      activeOpacity={0.7}
    >
      <View style={styles.roundTileHeader}>
        <Text style={[styles.roundTileNumber, { color: colors.text }]}>R{roundNumber}</Text>
        {isCurrentRound && isScoringOpen && (
          <View style={[styles.scoringBadge, { backgroundColor: colors.success }]}>
            <Text style={styles.scoringBadgeText}>SCORE</Text>
          </View>
        )}
        {userScore && (
          <View style={[styles.userScoreBadge, { backgroundColor: colors.accent + '30' }]}>
            <Ionicons name="checkmark" size={12} color={colors.accent} />
          </View>
        )}
      </View>

      {aggregate && aggregate.submission_count > 0 ? (
        <View style={styles.roundTileContent}>
          {/* Winner indicator */}
          <View style={styles.roundTileWinner}>
            {winner && winner !== 'even' ? (
              <View style={[styles.winnerDot, { backgroundColor: winnerColor }]} />
            ) : (
              <Text style={[styles.evenText, { color: colors.textTertiary }]}>—</Text>
            )}
          </View>

          {/* Mean scores */}
          <View style={styles.roundTileScores}>
            <Text style={[styles.roundTileMean, { color: cornerColors.red }]}>
              {aggregate.mean_red?.toFixed(1)}
            </Text>
            <Text style={[styles.roundTileDash, { color: colors.textTertiary }]}>-</Text>
            <Text style={[styles.roundTileMean, { color: cornerColors.blue }]}>
              {aggregate.mean_blue?.toFixed(1)}
            </Text>
          </View>

          {/* Submission count */}
          <Text style={[styles.roundTileCount, { color: colors.textTertiary }]}>
            {aggregate.submission_count} {aggregate.submission_count === 1 ? 'score' : 'scores'}
          </Text>

          {/* Dominant bucket */}
          {dominantBucket && (
            <Text style={[styles.roundTileBucket, { color: colors.textSecondary }]}>
              {formatBucket(dominantBucket.bucket)} ({Math.round((dominantBucket.count / aggregate.submission_count) * 100)}%)
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.roundTileContent}>
          <Text style={[styles.roundTileEmpty, { color: colors.textTertiary }]}>
            No scores yet
          </Text>
        </View>
      )}

      {/* User's score */}
      {userScore && (
        <View style={[styles.userScoreRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.userScoreLabel, { color: colors.textSecondary }]}>Your score:</Text>
          <Text style={[styles.userScoreValue, { color: colors.text }]}>
            {userScore.score_red}-{userScore.score_blue}
          </Text>
        </View>
      )}

      {/* Expand indicator */}
      <View style={styles.expandIndicator}>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textTertiary}
        />
      </View>
    </TouchableOpacity>
  );
}

// =============================================================================
// MAIN SCREEN
// =============================================================================

export default function FightScorecardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const cornerColors = useCornerColors();
  const { user } = useAuth();
  const toast = useToast();

  // State
  const [expandedRound, setExpandedRound] = useState<number | null>(null);
  const [selectedScore, setSelectedScore] = useState<ScoreOption | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Animation refs
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  // Data fetching
  const {
    data: scorecard,
    isLoading,
    isError,
    error,
    refetch,
  } = useFightScorecard(id);

  // Note: Polling is handled via realtime subscriptions for scorecards

  const submitScore = useSubmitScore();

  // Subscribe to realtime updates for this fight
  useScorecardRealtime(id, {
    onRoundStateChange: (payload) => {
      // Provide haptic feedback on phase changes
      if (payload.phase === 'ROUND_BREAK') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        toast.showNeutral(`Round ${payload.current_round} ended - Score now!`);
      } else if (payload.phase === 'ROUND_LIVE') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
  });

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 300,
        delay: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Open confirmation modal
  const handleSubmitScore = useCallback(() => {
    if (!selectedScore || !id || !scorecard) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowConfirmModal(true);
  }, [selectedScore, id, scorecard]);

  // Actual score submission (called from modal)
  const handleConfirmSubmit = useCallback(async () => {
    if (!selectedScore || !id || !scorecard) return;

    try {
      const result = await submitScore.mutateAsync({
        boutId: id,
        roundNumber: scorecard.round_state.current_round,
        scoreRed: selectedScore.score_red,
        scoreBlue: selectedScore.score_blue,
      });

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.showNeutral(result.idempotent ? 'Score already submitted' : 'Score submitted!');
        setSelectedScore(null);
        setExpandedRound(null);
        setShowConfirmModal(false);
      } else {
        toast.showError(result.message || 'Failed to submit score');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err: any) {
      toast.showError(err.message || 'Failed to submit score');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [selectedScore, id, scorecard, submitScore, toast]);

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Scorecard',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
          }}
        />
        <ScorecardSkeleton />
      </View>
    );
  }

  // Error state
  if (isError || !scorecard) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Scorecard',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
          }}
        />
        <ErrorState
          message={error?.message || 'Failed to load scorecard'}
          onRetry={refetch}
        />
      </View>
    );
  }

  const { bout, round_state, aggregates, user_scores } = scorecard;
  const totalScore = calculateTotalScore(aggregates);
  const userTotal = user_scores.reduce(
    (acc, s) => ({ red: acc.red + s.score_red, blue: acc.blue + s.score_blue }),
    { red: 0, blue: 0 }
  );

  // Get user's score for current round
  const currentRoundUserScore = user_scores.find(
    (s) => s.round_number === round_state.current_round
  );

  // Check if user can score
  const canScore =
    round_state.is_scoring_open &&
    !!user &&
    !currentRoundUserScore;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Scorecard',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/* Fight Header */}
        <Animated.View style={[styles.fightHeader, { opacity: headerOpacity }]}>
          <SurfaceCard heroGlow>
            <View style={styles.fighterRow}>
              <View style={styles.fighterInfo}>
                <View style={[styles.cornerIndicator, { backgroundColor: cornerColors.red }]} />
                <Text style={[styles.fighterName, { color: colors.text }]} numberOfLines={2}>
                  {bout.red_name}
                </Text>
              </View>

              <View style={styles.vsContainer}>
                <Text style={[styles.vsText, { color: colors.textTertiary }]}>VS</Text>
              </View>

              <View style={[styles.fighterInfo, styles.fighterInfoRight]}>
                <Text style={[styles.fighterName, { color: colors.text }]} numberOfLines={2}>
                  {bout.blue_name}
                </Text>
                <View style={[styles.cornerIndicator, { backgroundColor: cornerColors.blue }]} />
              </View>
            </View>

            {/* Total Scores */}
            {aggregates.length > 0 && (
              <View style={[styles.totalScoreRow, { borderTopColor: colors.border }]}>
                <View style={styles.totalScoreItem}>
                  <Text style={[styles.totalScoreValue, { color: cornerColors.red }]}>
                    {totalScore.red.toFixed(1)}
                  </Text>
                  <Text style={[styles.totalScoreLabel, { color: colors.textSecondary }]}>
                    Global
                  </Text>
                </View>

                <View style={[styles.totalScoreDivider, { backgroundColor: colors.border }]} />

                <View style={styles.totalScoreItem}>
                  <Text style={[styles.totalScoreValue, { color: cornerColors.blue }]}>
                    {totalScore.blue.toFixed(1)}
                  </Text>
                  <Text style={[styles.totalScoreLabel, { color: colors.textSecondary }]}>
                    Global
                  </Text>
                </View>
              </View>
            )}

            {/* User's Total */}
            {user_scores.length > 0 && (
              <View style={[styles.userTotalRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.userTotalLabel, { color: colors.textSecondary }]}>
                  Your scorecard:
                </Text>
                <Text style={[styles.userTotalValue, { color: colors.text }]}>
                  {userTotal.red} - {userTotal.blue}
                </Text>
              </View>
            )}

            {/* Share Button */}
            {(aggregates.length > 0 || user_scores.length > 0) && (
              <View style={[styles.shareRow, { borderTopColor: colors.border }]}>
                <ShareScorecard
                  redName={bout.red_name}
                  blueName={bout.blue_name}
                  userScores={user_scores}
                  aggregates={aggregates}
                  variant="button"
                  label="Share"
                />
              </View>
            )}
          </SurfaceCard>
        </Animated.View>

        {/* Phase Badge */}
        <Animated.View style={[styles.phaseBadgeContainer, { opacity: contentOpacity }]}>
          <View
            style={[
              styles.phaseBadge,
              { backgroundColor: getPhaseColor(round_state.phase, colors) + '20' },
            ]}
          >
            <View
              style={[
                styles.phaseDot,
                { backgroundColor: getPhaseColor(round_state.phase, colors) },
              ]}
            />
            <Text
              style={[
                styles.phaseBadgeText,
                { color: getPhaseColor(round_state.phase, colors) },
              ]}
            >
              {formatPhase(round_state.phase)}
              {round_state.phase !== 'PRE_FIGHT' &&
                round_state.phase !== 'FIGHT_ENDED' &&
                ` • Round ${round_state.current_round}`}
            </Text>
          </View>
        </Animated.View>

        {/* Round Tiles */}
        <Animated.View style={[styles.roundsSection, { opacity: contentOpacity }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            ROUND-BY-ROUND
          </Text>

          <View style={styles.roundsGrid}>
            {Array.from({ length: round_state.scheduled_rounds }, (_, i) => i + 1).map(
              (roundNum) => {
                const aggregate = aggregates.find((a) => a.round_number === roundNum);
                const userScore = user_scores.find((s) => s.round_number === roundNum);
                const isCurrentRound = round_state.current_round === roundNum;
                const isScoringOpen = round_state.is_scoring_open && isCurrentRound;

                return (
                  <RoundTile
                    key={roundNum}
                    roundNumber={roundNum}
                    aggregate={aggregate}
                    userScore={userScore}
                    isCurrentRound={isCurrentRound}
                    isScoringOpen={isScoringOpen}
                    redName={bout.red_name}
                    blueName={bout.blue_name}
                    onExpand={() =>
                      setExpandedRound(expandedRound === roundNum ? null : roundNum)
                    }
                    isExpanded={expandedRound === roundNum}
                  />
                );
              }
            )}
          </View>
        </Animated.View>

        {/* Scoring Interface */}
        {canScore && (
          <Animated.View style={[styles.scoringSection, { opacity: contentOpacity }]}>
            <SurfaceCard weakWash>
              <View style={styles.scoringSectionHeader}>
                <View>
                  <Text style={[styles.scoringSectionTitle, { color: colors.text }]}>
                    Score Round {round_state.current_round}
                  </Text>
                  <Text style={[styles.scoringSectionSubtitle, { color: colors.textSecondary }]}>
                    Select your score for this round
                  </Text>
                </View>
                {round_state.round_ends_at && (
                  <GracePeriodTimer
                    endsAt={round_state.round_ends_at}
                    onExpire={() => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                      toast.showNeutral('Scoring window closed');
                      refetch();
                    }}
                    compact
                  />
                )}
              </View>

              <View style={styles.scoreOptionsGrid}>
                {SCORE_OPTIONS.map((option) => (
                  <ScoreOptionButton
                    key={option.label}
                    option={option}
                    isSelected={
                      selectedScore?.score_red === option.score_red &&
                      selectedScore?.score_blue === option.score_blue
                    }
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedScore(option);
                    }}
                    disabled={false}
                    redName={bout.red_name}
                    blueName={bout.blue_name}
                  />
                ))}
              </View>

              {selectedScore && (
                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: colors.accent }]}
                  onPress={handleSubmitScore}
                  disabled={submitScore.isPending}
                  activeOpacity={0.8}
                >
                  {submitScore.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="send" size={18} color="#fff" />
                      <Text style={styles.submitButtonText}>Submit Score</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </SurfaceCard>
          </Animated.View>
        )}

        {/* Already Scored Message */}
        {round_state.is_scoring_open && currentRoundUserScore && (
          <Animated.View style={[styles.alreadyScoredSection, { opacity: contentOpacity }]}>
            <SurfaceCard weakWash>
              <View style={styles.alreadyScoredContent}>
                <View style={[styles.alreadyScoredIcon, { backgroundColor: colors.successSoft }]}>
                  <Ionicons name="checkmark-circle" size={28} color={colors.success} />
                </View>
                <View style={styles.alreadyScoredText}>
                  <Text style={[styles.alreadyScoredTitle, { color: colors.text }]}>
                    Round {round_state.current_round} Scored ✓
                  </Text>
                  <View style={styles.alreadyScoredScoreRow}>
                    <Text style={[styles.alreadyScoredScoreValue, { color: cornerColors.red }]}>
                      {currentRoundUserScore.score_red}
                    </Text>
                    <Text style={[styles.alreadyScoredScoreDash, { color: colors.textTertiary }]}>-</Text>
                    <Text style={[styles.alreadyScoredScoreValue, { color: cornerColors.blue }]}>
                      {currentRoundUserScore.score_blue}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={[styles.alreadyScoredInfo, { borderTopColor: colors.border }]}>
                <Ionicons name="lock-closed" size={14} color={colors.textTertiary} />
                <Text style={[styles.alreadyScoredInfoText, { color: colors.textTertiary }]}>
                  Scores cannot be changed after submission
                </Text>
              </View>
            </SurfaceCard>
          </Animated.View>
        )}

        {/* Sign In Prompt */}
        {round_state.is_scoring_open && !user && (
          <Animated.View style={[styles.signInSection, { opacity: contentOpacity }]}>
            <SurfaceCard weakWash>
              <View style={styles.signInContent}>
                <Ionicons name="person-outline" size={24} color={colors.textSecondary} />
                <Text style={[styles.signInText, { color: colors.textSecondary }]}>
                  Sign in to submit your scores
                </Text>
                <TouchableOpacity
                  style={[styles.signInButton, { backgroundColor: colors.accent }]}
                  onPress={() => router.push('/(auth)/sign-in')}
                >
                  <Text style={styles.signInButtonText}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </SurfaceCard>
          </Animated.View>
        )}
      </ScrollView>

      {/* Score Confirmation Modal */}
      <ScoreConfirmationModal
        visible={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSubmit}
        selectedScore={selectedScore}
        roundNumber={round_state.current_round}
        redName={bout.red_name}
        blueName={bout.blue_name}
        isSubmitting={submitScore.isPending}
      />
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    padding: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },

  // Fight Header
  fightHeader: {},
  fighterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  fighterInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fighterInfoRight: {
    justifyContent: 'flex-end',
  },
  cornerIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  fighterName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  vsContainer: {
    paddingHorizontal: spacing.md,
  },
  vsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  totalScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: 1,
    gap: spacing.xl,
  },
  totalScoreItem: {
    alignItems: 'center',
  },
  totalScoreValue: {
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  totalScoreLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  totalScoreDivider: {
    width: 1,
    height: 40,
  },
  userTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  userTotalLabel: {
    fontSize: 13,
  },
  userTotalValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  shareRow: {
    paddingTop: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: 1,
    alignItems: 'center',
  },

  // Phase Badge
  phaseBadgeContainer: {
    alignItems: 'center',
  },
  phaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    gap: spacing.xs,
  },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  phaseBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Rounds Section
  roundsSection: {},
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  roundsGrid: {
    gap: spacing.sm,
  },

  // Round Tile
  roundTile: {
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
  },
  roundTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  roundTileNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  scoringBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  scoringBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  userScoreBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundTileContent: {
    gap: spacing.xs,
  },
  roundTileWinner: {
    marginBottom: spacing.xs,
  },
  winnerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  evenText: {
    fontSize: 14,
  },
  roundTileScores: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  roundTileMean: {
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  roundTileDash: {
    fontSize: 14,
  },
  roundTileCount: {
    fontSize: 12,
  },
  roundTileBucket: {
    fontSize: 12,
  },
  roundTileEmpty: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  userScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: 1,
  },
  userScoreLabel: {
    fontSize: 12,
  },
  userScoreValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  expandIndicator: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
  },

  // Scoring Section
  scoringSection: {},
  scoringSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  scoringSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  scoringSectionSubtitle: {
    fontSize: 13,
  },
  scoreOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  scoreOptionWrapper: {
    width: '48%',
  },
  scoreOption: {
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    position: 'relative',
  },
  scoreOptionLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  scoreOptionDesc: {
    fontSize: 12,
  },
  scoreOptionCheck: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: radius.button,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Already Scored
  alreadyScoredSection: {},
  alreadyScoredContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  alreadyScoredIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alreadyScoredText: {
    flex: 1,
  },
  alreadyScoredTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  alreadyScoredScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  alreadyScoredScoreValue: {
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  alreadyScoredScoreDash: {
    fontSize: 16,
    fontWeight: '300',
  },
  alreadyScoredInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  alreadyScoredInfoText: {
    fontSize: 12,
  },

  // Sign In
  signInSection: {},
  signInContent: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  signInText: {
    fontSize: 14,
    textAlign: 'center',
  },
  signInButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.button,
    marginTop: spacing.xs,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
