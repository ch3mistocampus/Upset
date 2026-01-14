/**
 * Scorecard Skeleton
 *
 * Loading placeholder for scorecard screens.
 */

import { View, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { useTheme } from '../../lib/theme';
import { spacing, radius } from '../../lib/tokens';

interface ScorecardSkeletonProps {
  /** Number of round tiles to show */
  rounds?: number;
  /** Show scoring section */
  showScoring?: boolean;
}

function SkeletonBox({
  width,
  height,
  style,
}: {
  width: number | string;
  height: number;
  style?: any;
}) {
  const { colors } = useTheme();
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: colors.skeleton,
          borderRadius: radius.sm,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
}

export function ScorecardSkeleton({ rounds = 3, showScoring = true }: ScorecardSkeletonProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {/* Fight Header Skeleton */}
      <View style={[styles.headerCard, { backgroundColor: colors.surface }]}>
        <View style={styles.fighterRow}>
          <View style={styles.fighterSkeleton}>
            <SkeletonBox width={4} height={40} />
            <View style={styles.fighterName}>
              <SkeletonBox width={100} height={18} />
              <SkeletonBox width={60} height={12} style={{ marginTop: 4 }} />
            </View>
          </View>
          <SkeletonBox width={24} height={14} />
          <View style={[styles.fighterSkeleton, styles.fighterRight]}>
            <View style={[styles.fighterName, { alignItems: 'flex-end' }]}>
              <SkeletonBox width={100} height={18} />
              <SkeletonBox width={60} height={12} style={{ marginTop: 4 }} />
            </View>
            <SkeletonBox width={4} height={40} />
          </View>
        </View>

        {/* Total Scores */}
        <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
          <View style={styles.totalItem}>
            <SkeletonBox width={50} height={28} />
            <SkeletonBox width={40} height={10} style={{ marginTop: 4 }} />
          </View>
          <View style={[styles.totalDivider, { backgroundColor: colors.border }]} />
          <View style={styles.totalItem}>
            <SkeletonBox width={50} height={28} />
            <SkeletonBox width={40} height={10} style={{ marginTop: 4 }} />
          </View>
        </View>
      </View>

      {/* Phase Badge Skeleton */}
      <View style={styles.phaseBadgeContainer}>
        <SkeletonBox width={120} height={28} style={{ borderRadius: 14 }} />
      </View>

      {/* Round Tiles Skeleton */}
      <View style={styles.roundsSection}>
        <SkeletonBox width={100} height={12} style={{ marginBottom: spacing.sm }} />
        <View style={styles.roundsGrid}>
          {Array.from({ length: rounds }, (_, i) => (
            <View
              key={i}
              style={[styles.roundTile, { backgroundColor: colors.surfaceAlt }]}
            >
              <View style={styles.roundHeader}>
                <SkeletonBox width={24} height={16} />
                <SkeletonBox width={50} height={16} />
              </View>
              <View style={styles.roundContent}>
                <SkeletonBox width={12} height={12} style={{ borderRadius: 6 }} />
                <View style={styles.roundScores}>
                  <SkeletonBox width={30} height={18} />
                  <SkeletonBox width={10} height={14} />
                  <SkeletonBox width={30} height={18} />
                </View>
                <SkeletonBox width={60} height={12} style={{ marginTop: spacing.xs }} />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Scoring Section Skeleton */}
      {showScoring && (
        <View style={[styles.scoringSection, { backgroundColor: colors.surface }]}>
          <SkeletonBox width={140} height={20} style={{ marginBottom: spacing.xs }} />
          <SkeletonBox width={180} height={14} style={{ marginBottom: spacing.md }} />
          <View style={styles.scoreOptionsGrid}>
            {Array.from({ length: 7 }, (_, i) => (
              <View key={i} style={styles.scoreOptionWrapper}>
                <SkeletonBox width="100%" height={60} style={{ borderRadius: radius.card }} />
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

/**
 * Event Scorecards List Skeleton
 */
export function EventScorecardsSkeleton({ count = 5 }: { count?: number }) {
  const { colors } = useTheme();

  return (
    <View style={styles.eventContainer}>
      {/* Event Info */}
      <View style={styles.eventInfo}>
        <SkeletonBox width={150} height={14} />
        <SkeletonBox width={200} height={14} style={{ marginTop: spacing.xs }} />
      </View>

      {/* Scorecard Cards */}
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[styles.scorecardCard, { backgroundColor: colors.surface }]}
        >
          <View style={styles.scorecardHeader}>
            <View style={styles.scorecardNames}>
              <SkeletonBox width={80} height={14} />
              <SkeletonBox width={20} height={10} />
              <SkeletonBox width={80} height={14} />
            </View>
            <SkeletonBox width={60} height={20} style={{ borderRadius: 10 }} />
          </View>
          <View style={styles.scorecardScores}>
            <SkeletonBox width={48} height={48} style={{ borderRadius: 12 }} />
            <View style={styles.scorecardMiddle}>
              <SkeletonBox width={70} height={12} />
              <SkeletonBox width={50} height={10} style={{ marginTop: 4 }} />
            </View>
            <SkeletonBox width={48} height={48} style={{ borderRadius: 12 }} />
          </View>
          <View style={styles.scorecardRounds}>
            {Array.from({ length: 3 }, (_, j) => (
              <SkeletonBox key={j} width={24} height={24} style={{ borderRadius: 12 }} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md,
  },
  headerCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  fighterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fighterSkeleton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fighterRight: {
    justifyContent: 'flex-end',
  },
  fighterName: {
    flex: 1,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: 1,
    gap: spacing.xl,
  },
  totalItem: {
    alignItems: 'center',
  },
  totalDivider: {
    width: 1,
    height: 40,
  },
  phaseBadgeContainer: {
    alignItems: 'center',
  },
  roundsSection: {},
  roundsGrid: {
    gap: spacing.sm,
  },
  roundTile: {
    padding: spacing.md,
    borderRadius: radius.card,
  },
  roundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  roundContent: {
    gap: spacing.xs,
  },
  roundScores: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  scoringSection: {
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  scoreOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  scoreOptionWrapper: {
    width: '48%',
  },

  // Event Scorecards
  eventContainer: {
    padding: spacing.md,
    gap: spacing.md,
  },
  eventInfo: {
    marginBottom: spacing.sm,
  },
  scorecardCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  scorecardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scorecardNames: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  scorecardScores: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scorecardMiddle: {
    alignItems: 'center',
  },
  scorecardRounds: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
});

export default ScorecardSkeleton;
