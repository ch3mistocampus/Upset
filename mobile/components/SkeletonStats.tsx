/**
 * SkeletonStats Component
 * Skeleton loader for stats grid
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonLine } from './SkeletonCard';

export const SkeletonStats: React.FC = () => {
  return (
    <View style={styles.card}>
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
  return (
    <View style={styles.card}>
      <SkeletonLine width={100} height={12} marginBottom={12} />
      <SkeletonLine width="90%" height={22} marginBottom={4} />
      <SkeletonLine width="60%" height={14} marginBottom={16} />

      <View style={styles.divider} />

      <View style={styles.countdownContainer}>
        <SkeletonLine width={80} height={14} marginBottom={4} />
        <SkeletonLine width={120} height={28} marginBottom={16} />
      </View>

      <View style={styles.divider} />

      <View style={styles.progressContainer}>
        <SkeletonLine width={70} height={14} marginBottom={0} />
        <SkeletonLine width={50} height={18} marginBottom={0} />
      </View>

      <View style={styles.progressBar}>
        <View style={styles.progressFill} />
      </View>

      <SkeletonLine width="100%" height={48} marginBottom={0} />
    </View>
  );
};

export const SkeletonProfileCard: React.FC = () => {
  return (
    <View style={styles.card}>
      <SkeletonLine width={70} height={12} marginBottom={16} />

      <View style={styles.profileHeader}>
        <View style={styles.avatar} />
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
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
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
    backgroundColor: '#333',
    marginVertical: 16,
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
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    width: '60%',
    height: '100%',
    backgroundColor: '#2a2a2a',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2a2a2a',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
});
