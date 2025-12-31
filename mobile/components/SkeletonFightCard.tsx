/**
 * SkeletonFightCard Component
 * Skeleton loader for fight cards in pick screen
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
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

      {/* Red corner fighter */}
      <View style={[styles.fighterButton, { backgroundColor: colors.surfaceAlt }]}>
        <View style={styles.redIndicator} />
        <SkeletonLine width="70%" height={16} marginBottom={0} />
      </View>

      {/* VS separator */}
      <View style={styles.vsSpacer} />

      {/* Blue corner fighter */}
      <View style={[styles.fighterButton, { backgroundColor: colors.surfaceAlt }]}>
        <View style={styles.blueIndicator} />
        <SkeletonLine width="65%" height={16} marginBottom={0} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  fighterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: 8,
    position: 'relative',
  },
  redIndicator: {
    width: 4,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#dc2626',
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
    marginRight: spacing.sm,
  },
  blueIndicator: {
    width: 4,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#2563eb',
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
    marginRight: spacing.sm,
  },
  vsSpacer: {
    height: 8,
  },
});
