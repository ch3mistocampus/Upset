/**
 * Share Scorecard Component
 *
 * Allows users to share their scorecard or the global scorecard via native sharing.
 */

import { useCallback } from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import { spacing, radius } from '../../lib/tokens';
import type { RoundScore, RoundAggregate } from '../../types/scorecard';

interface ShareScorecardProps {
  /** Fight information */
  redName: string;
  blueName: string;
  eventName?: string;
  /** User's scores (optional - if not provided, shares global only) */
  userScores?: RoundScore[];
  /** Global aggregates (optional - if not provided, shares user only) */
  aggregates?: RoundAggregate[];
  /** Style variant */
  variant?: 'button' | 'icon';
  /** Custom label */
  label?: string;
}

/**
 * Format user scorecard for sharing
 */
function formatUserScorecard(
  redName: string,
  blueName: string,
  userScores: RoundScore[],
  eventName?: string
): string {
  const totalRed = userScores.reduce((sum, s) => sum + s.score_red, 0);
  const totalBlue = userScores.reduce((sum, s) => sum + s.score_blue, 0);

  const roundScores = userScores
    .map((s) => `R${s.round_number}: ${s.score_red}-${s.score_blue}`)
    .join(' | ');

  const lines = [
    eventName ? `${eventName}` : '',
    `${redName} vs ${blueName}`,
    '',
    `My Scorecard: ${totalRed}-${totalBlue}`,
    roundScores,
    '',
    '#UFC #MMA #Upset',
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Format global scorecard for sharing
 */
function formatGlobalScorecard(
  redName: string,
  blueName: string,
  aggregates: RoundAggregate[],
  eventName?: string
): string {
  const totalRed = aggregates.reduce((sum, a) => sum + (a.mean_red || 0), 0);
  const totalBlue = aggregates.reduce((sum, a) => sum + (a.mean_blue || 0), 0);
  const totalVotes = aggregates.reduce((sum, a) => sum + a.submission_count, 0);

  const roundScores = aggregates
    .map((a) => {
      let winner = 'Even';
      if (a.mean_red && a.mean_blue && a.mean_red > a.mean_blue) {
        winner = redName.split(' ').pop() ?? redName;
      } else if (a.mean_red && a.mean_blue && a.mean_blue > a.mean_red) {
        winner = blueName.split(' ').pop() ?? blueName;
      }
      return `R${a.round_number}: ${a.mean_red?.toFixed(1)}-${a.mean_blue?.toFixed(1)} (${winner})`;
    })
    .join('\n');

  const lines = [
    eventName ? `${eventName}` : '',
    `${redName} vs ${blueName}`,
    '',
    `Global Score: ${totalRed.toFixed(0)}-${totalBlue.toFixed(0)}`,
    `${totalVotes} votes`,
    '',
    roundScores,
    '',
    '#UFC #MMA #Upset',
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Format combined scorecard for sharing
 */
function formatCombinedScorecard(
  redName: string,
  blueName: string,
  userScores: RoundScore[],
  aggregates: RoundAggregate[],
  eventName?: string
): string {
  const userTotalRed = userScores.reduce((sum, s) => sum + s.score_red, 0);
  const userTotalBlue = userScores.reduce((sum, s) => sum + s.score_blue, 0);
  const globalTotalRed = aggregates.reduce((sum, a) => sum + (a.mean_red || 0), 0);
  const globalTotalBlue = aggregates.reduce((sum, a) => sum + (a.mean_blue || 0), 0);
  const totalVotes = aggregates.reduce((sum, a) => sum + a.submission_count, 0);

  const roundDetails = userScores.map((s) => {
    const agg = aggregates.find((a) => a.round_number === s.round_number);
    const globalStr = agg ? `Global: ${agg.mean_red?.toFixed(1)}-${agg.mean_blue?.toFixed(1)}` : '';
    return `R${s.round_number}: ${s.score_red}-${s.score_blue} | ${globalStr}`;
  }).join('\n');

  const lines = [
    eventName ? `${eventName}` : '',
    `${redName} vs ${blueName}`,
    '',
    `My Score: ${userTotalRed}-${userTotalBlue}`,
    `Global: ${globalTotalRed.toFixed(0)}-${globalTotalBlue.toFixed(0)} (${totalVotes} votes)`,
    '',
    roundDetails,
    '',
    '#UFC #MMA #Upset',
  ].filter(Boolean);

  return lines.join('\n');
}

export function ShareScorecard({
  redName,
  blueName,
  eventName,
  userScores,
  aggregates,
  variant = 'button',
  label = 'Share Scorecard',
}: ShareScorecardProps) {
  const { colors } = useTheme();

  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    let message: string;

    if (userScores && userScores.length > 0 && aggregates && aggregates.length > 0) {
      message = formatCombinedScorecard(redName, blueName, userScores, aggregates, eventName);
    } else if (userScores && userScores.length > 0) {
      message = formatUserScorecard(redName, blueName, userScores, eventName);
    } else if (aggregates && aggregates.length > 0) {
      message = formatGlobalScorecard(redName, blueName, aggregates, eventName);
    } else {
      message = `${redName} vs ${blueName}\n\nNo scores yet\n\n#UFC #MMA #Upset`;
    }

    try {
      const result = await Share.share({
        message,
        title: `${redName} vs ${blueName} Scorecard`,
      });

      if (result.action === Share.sharedAction) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      if (__DEV__) console.error('Error sharing:', error);
    }
  }, [redName, blueName, eventName, userScores, aggregates]);

  if (variant === 'icon') {
    return (
      <TouchableOpacity
        style={styles.iconButton}
        onPress={handleShare}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="share-outline" size={22} color={colors.accent} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
      onPress={handleShare}
      activeOpacity={0.7}
    >
      <Ionicons name="share-outline" size={18} color={colors.accent} />
      <Text style={[styles.buttonText, { color: colors.accent }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  iconButton: {
    padding: spacing.xs,
  },
});

