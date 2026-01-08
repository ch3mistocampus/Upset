/**
 * SkeletonFightCard Component
 * Skeleton loader for fight cards in pick screen
 * Matches the horizontal pill layout of actual fight cards
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SkeletonLine } from './SkeletonCard';
import { useTheme } from '../lib/theme';
import { radius, spacing } from '../lib/tokens';

export const SkeletonFightCard: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Fight header - order and weight class */}
      <View style={styles.header}>
        <SkeletonLine width={80} height={14} marginBottom={0} />
        <SkeletonLine width={100} height={12} marginBottom={0} />
      </View>

      {/* Fighter pills row - horizontal layout matching actual design */}
      <View style={styles.fightersRow}>
        {/* Fighter 1 pill */}
        <View style={[styles.fighterPill, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <SkeletonLine width="80%" height={14} marginBottom={0} />
        </View>

        {/* VS text */}
        <Text style={[styles.vs, { color: colors.textTertiary }]}>vs</Text>

        {/* Fighter 2 pill */}
        <View style={[styles.fighterPill, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <SkeletonLine width="75%" height={14} marginBottom={0} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  fightersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  fighterPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.button,
    borderWidth: 1,
    minHeight: 36,
  },
  vs: {
    fontSize: 11,
    fontWeight: '500',
    paddingHorizontal: 2,
  },
});
