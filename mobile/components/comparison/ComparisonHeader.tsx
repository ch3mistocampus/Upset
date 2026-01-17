/**
 * ComparisonHeader - Fighter names with corner color indicators
 * Shows rankings and weight class for the matchup
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../lib/theme';
import { spacing, typography, radius, fighterColors } from '../../lib/tokens';

interface ComparisonHeaderProps {
  redName: string;
  blueName: string;
  redRanking?: number | null;
  blueRanking?: number | null;
  weightClass?: string;
}

export function ComparisonHeader({
  redName,
  blueName,
  redRanking,
  blueRanking,
  weightClass,
}: ComparisonHeaderProps): React.ReactElement {
  const { colors, isDark } = useTheme();

  const redColor = isDark ? fighterColors.red.solid.dark : fighterColors.red.solid.light;
  const blueColor = isDark ? fighterColors.blue.solid.dark : fighterColors.blue.solid.light;

  const formatRanking = (ranking: number | null | undefined): string => {
    if (!ranking) return '';
    if (ranking === 0) return 'C'; // Champion
    return `#${ranking}`;
  };

  return (
    <View style={styles.container}>
      {/* Red Corner */}
      <View style={styles.fighterColumn}>
        <View style={[styles.cornerIndicator, { backgroundColor: redColor }]} />
        <Text style={[styles.fighterName, { color: colors.text }]} numberOfLines={2}>
          {redName}
        </Text>
        {redRanking !== undefined && redRanking !== null && (
          <Text style={[styles.ranking, { color: redColor }]}>
            {formatRanking(redRanking)}
          </Text>
        )}
      </View>

      {/* VS */}
      <View style={styles.vsContainer}>
        <Text style={[styles.vs, { color: colors.textTertiary }]}>vs</Text>
        {weightClass && (
          <Text style={[styles.weightClass, { color: colors.textSecondary }]}>
            {weightClass}
          </Text>
        )}
      </View>

      {/* Blue Corner */}
      <View style={styles.fighterColumn}>
        <View style={[styles.cornerIndicator, { backgroundColor: blueColor }]} />
        <Text style={[styles.fighterName, { color: colors.text }]} numberOfLines={2}>
          {blueName}
        </Text>
        {blueRanking !== undefined && blueRanking !== null && (
          <Text style={[styles.ranking, { color: blueColor }]}>
            {formatRanking(blueRanking)}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  fighterColumn: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  cornerIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  fighterName: {
    ...typography.h3,
    textAlign: 'center',
  },
  ranking: {
    fontSize: 13,
    fontWeight: '700',
  },
  vsContainer: {
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.sm,
  },
  vs: {
    fontSize: 14,
    fontWeight: '600',
  },
  weightClass: {
    fontSize: 10,
    marginTop: 2,
  },
});
