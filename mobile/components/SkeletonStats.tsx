/**
 * SkeletonStats Component
 * Skeleton loader for stats grid
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonLine } from './SkeletonCard';
import { useTheme } from '../lib/theme';
import { radius, spacing } from '../lib/tokens';

export const SkeletonStats: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <SkeletonLine width={120} height={12} marginBottom={16} />

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <SkeletonLine width={50} height={32} marginBottom={4} />
          <SkeletonLine width={70} height={12} marginBottom={0} />
        </View>

        <View style={styles.statItem}>
          <SkeletonLine width={50} height={32} marginBottom={4} />
          <SkeletonLine width={60} height={12} marginBottom={0} />
        </View>

        <View style={styles.statItem}>
          <SkeletonLine width={60} height={32} marginBottom={4} />
          <SkeletonLine width={70} height={12} marginBottom={0} />
        </View>
      </View>
    </View>
  );
};

export const SkeletonEventCard: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <SkeletonLine width={100} height={12} marginBottom={12} />
      <SkeletonLine width="90%" height={22} marginBottom={4} />
      <SkeletonLine width="60%" height={14} marginBottom={16} />

      <View style={[styles.divider, { backgroundColor: colors.divider }]} />

      <View style={styles.countdownContainer}>
        <SkeletonLine width={80} height={14} marginBottom={4} />
        <SkeletonLine width={120} height={28} marginBottom={16} />
      </View>

      <View style={[styles.divider, { backgroundColor: colors.divider }]} />

      <View style={styles.progressContainer}>
        <SkeletonLine width={70} height={14} marginBottom={0} />
        <SkeletonLine width={50} height={18} marginBottom={0} />
      </View>

      <View style={[styles.progressBar, { backgroundColor: colors.divider }]}>
        <View style={[styles.progressFill, { backgroundColor: colors.skeleton }]} />
      </View>

      <SkeletonLine width="100%" height={48} marginBottom={0} />
    </View>
  );
};

export const SkeletonProfileCard: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <SkeletonLine width={70} height={12} marginBottom={16} />

      <View style={styles.profileHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.skeleton }]} />
        <View style={styles.profileInfo}>
          <SkeletonLine width={150} height={24} marginBottom={4} />
          <SkeletonLine width={200} height={14} marginBottom={0} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
  countdownContainer: {
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressFill: {
    width: '60%',
    height: '100%',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginRight: spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
});
