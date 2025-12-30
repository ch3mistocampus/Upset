/**
 * SkeletonFightCard Component
 * Skeleton loader for fight cards in pick screen
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonLine } from './SkeletonCard';

export const SkeletonFightCard: React.FC = () => {
  return (
    <View style={styles.card}>
      {/* Fight header - order and weight class */}
      <View style={styles.header}>
        <SkeletonLine width={80} height={14} marginBottom={0} />
        <SkeletonLine width={100} height={12} marginBottom={0} />
      </View>

      {/* Red corner fighter */}
      <View style={styles.fighterButton}>
        <View style={styles.redIndicator} />
        <SkeletonLine width="70%" height={16} marginBottom={0} />
      </View>

      {/* VS separator */}
      <View style={styles.vsSpacer} />

      {/* Blue corner fighter */}
      <View style={styles.fighterButton}>
        <View style={styles.blueIndicator} />
        <SkeletonLine width="65%" height={16} marginBottom={0} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fighterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626',
    borderRadius: 8,
    padding: 16,
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
    marginRight: 12,
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
    marginRight: 12,
  },
  vsSpacer: {
    height: 8,
  },
});
