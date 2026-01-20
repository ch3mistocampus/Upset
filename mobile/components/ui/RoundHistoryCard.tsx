/**
 * Round History Card
 *
 * Expandable card showing detailed round-by-round history
 * with score distribution, consensus, and user's score.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import { spacing, radius } from '../../lib/tokens';
import { ConsensusIndicator } from './ConsensusIndicator';
import { ScoreBucketBar } from './ScoreBucketChart';
import type { RoundAggregate, RoundScore, ScoreBuckets } from '../../types/scorecard';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface RoundHistoryCardProps {
  /** Round number */
  roundNumber: number;
  /** Global aggregate data for this round */
  aggregate: RoundAggregate | undefined;
  /** User's submitted score for this round */
  userScore: RoundScore | undefined;
  /** Fighter names */
  redName: string;
  blueName: string;
  /** Whether this is the current round */
  isCurrent?: boolean;
  /** Whether scoring is open */
  isScoringOpen?: boolean;
  /** Initial expanded state */
  defaultExpanded?: boolean;
}

// Corner colors hook
const useCornerColors = () => {
  const { isDark } = useTheme();
  return {
    red: isDark ? '#C54A50' : '#943538',
    blue: isDark ? '#4A6FA5' : '#1E3A5F',
    redSoft: isDark ? 'rgba(197, 74, 80, 0.15)' : 'rgba(148, 53, 56, 0.1)',
    blueSoft: isDark ? 'rgba(74, 111, 165, 0.15)' : 'rgba(30, 58, 95, 0.1)',
  };
};

export function RoundHistoryCard({
  roundNumber,
  aggregate,
  userScore,
  redName,
  blueName,
  isCurrent = false,
  isScoringOpen = false,
  defaultExpanded = false,
}: RoundHistoryCardProps) {
  const { colors } = useTheme();
  const cornerColors = useCornerColors();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const rotateAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  const hasData = aggregate && aggregate.submission_count > 0;
  const winner = hasData && aggregate.mean_red && aggregate.mean_blue
    ? aggregate.mean_red > aggregate.mean_blue
      ? 'red'
      : aggregate.mean_blue > aggregate.mean_red
      ? 'blue'
      : 'even'
    : null;
  const winnerColor = winner === 'red' ? cornerColors.red : winner === 'blue' ? cornerColors.blue : colors.textTertiary;

  const toggleExpand = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
    Animated.spring(rotateAnim, {
      toValue: isExpanded ? 0 : 1,
      tension: 100,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [isExpanded, rotateAnim]);

  const chevronRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Get dominant bucket for quick summary
  const getDominantBucket = (buckets: ScoreBuckets | undefined) => {
    if (!buckets) return null;
    let max = 0;
    let dominant: string | null = null;
    Object.entries(buckets).forEach(([key, count]) => {
      if (count && count > max) {
        max = count;
        dominant = key;
      }
    });
    return dominant;
  };

  const dominantBucket = getDominantBucket(aggregate?.buckets);

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceAlt, borderColor: isCurrent && isScoringOpen ? colors.success : colors.border }]}>
      {/* Header - Always visible */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.roundBadge, { backgroundColor: hasData ? winnerColor + '20' : colors.surface }]}>
            <Text style={[styles.roundNumber, { color: hasData ? winnerColor : colors.textTertiary }]}>
              R{roundNumber}
            </Text>
          </View>

          {hasData ? (
            <View style={styles.headerScores}>
              <Text style={[styles.headerScore, { color: cornerColors.red }]}>
                {aggregate?.mean_red?.toFixed(1)}
              </Text>
              <Text style={[styles.headerDash, { color: colors.textTertiary }]}>-</Text>
              <Text style={[styles.headerScore, { color: cornerColors.blue }]}>
                {aggregate?.mean_blue?.toFixed(1)}
              </Text>
            </View>
          ) : (
            <Text style={[styles.noDataText, { color: colors.textTertiary }]}>
              {isCurrent && isScoringOpen ? 'Scoring now...' : 'No scores yet'}
            </Text>
          )}
        </View>

        <View style={styles.headerRight}>
          {hasData && (
            <Text style={[styles.voteCount, { color: colors.textSecondary }]}>
              {aggregate?.submission_count} vote{aggregate?.submission_count !== 1 ? 's' : ''}
            </Text>
          )}
          {userScore && (
            <View style={[styles.userScoreBadge, { backgroundColor: colors.accent + '20' }]}>
              <Ionicons name="checkmark" size={12} color={colors.accent} />
            </View>
          )}
          <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={[styles.content, { borderTopColor: colors.border }]}>
          {hasData ? (
            <>
              {/* Score Distribution */}
              {aggregate?.buckets && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    Score Distribution
                  </Text>
                  <ScoreBucketBar
                    buckets={aggregate.buckets}
                    totalSubmissions={aggregate.submission_count}
                  />
                </View>
              )}

              {/* Consensus */}
              {aggregate?.consensus_index !== null && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    Consensus
                  </Text>
                  <ConsensusIndicator
                    value={aggregate.consensus_index}
                    size="md"
                    animate={false}
                    showPulse={false}
                  />
                </View>
              )}

              {/* Winner Summary */}
              <View style={[styles.winnerSection, { backgroundColor: winnerColor + '10' }]}>
                {winner === 'even' ? (
                  <Text style={[styles.winnerText, { color: colors.textSecondary }]}>
                    Even round (10-10)
                  </Text>
                ) : (
                  <>
                    <View style={[styles.winnerDot, { backgroundColor: winnerColor }]} />
                    <Text style={[styles.winnerText, { color: winnerColor }]}>
                      {winner === 'red' ? redName : blueName} wins the round
                    </Text>
                  </>
                )}
              </View>
            </>
          ) : (
            <View style={styles.noDataSection}>
              <Ionicons name="stats-chart-outline" size={24} color={colors.textTertiary} />
              <Text style={[styles.noDataMessage, { color: colors.textTertiary }]}>
                {isCurrent && isScoringOpen
                  ? 'Scores will appear as users submit them'
                  : 'No scores have been submitted for this round'}
              </Text>
            </View>
          )}

          {/* User's Score */}
          {userScore && (
            <View style={[styles.userScoreSection, { borderTopColor: colors.border }]}>
              <Text style={[styles.userScoreLabel, { color: colors.textSecondary }]}>
                Your Score
              </Text>
              <View style={styles.userScoreRow}>
                <View style={[styles.userScoreBadgeLarge, { backgroundColor: cornerColors.redSoft }]}>
                  <Text style={[styles.userScoreValue, { color: cornerColors.red }]}>
                    {userScore.score_red}
                  </Text>
                </View>
                <Text style={[styles.userScoreDash, { color: colors.textTertiary }]}>-</Text>
                <View style={[styles.userScoreBadgeLarge, { backgroundColor: cornerColors.blueSoft }]}>
                  <Text style={[styles.userScoreValue, { color: cornerColors.blue }]}>
                    {userScore.score_blue}
                  </Text>
                </View>
              </View>
              <Text style={[styles.userScoreTime, { color: colors.textTertiary }]}>
                Submitted {new Date(userScore.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  roundBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  headerScores: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerScore: {
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  headerDash: {
    fontSize: 14,
    fontWeight: '300',
  },
  noDataText: {
    fontSize: 14,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  voteCount: {
    fontSize: 12,
  },
  userScoreBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    borderTopWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  winnerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  winnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  winnerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  noDataSection: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  noDataMessage: {
    fontSize: 13,
    textAlign: 'center',
  },
  userScoreSection: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    alignItems: 'center',
    gap: spacing.sm,
  },
  userScoreLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  userScoreBadgeLarge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  userScoreValue: {
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  userScoreDash: {
    fontSize: 20,
    fontWeight: '300',
  },
  userScoreTime: {
    fontSize: 11,
  },
});

export default RoundHistoryCard;
