/**
 * ScoreBucketChart - Horizontal stacked bar visualization for score distribution
 *
 * Shows the distribution of scores (e.g., 65% Red 10-9, 30% Blue 10-9, 5% Even)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../lib/theme';
import { spacing, radius } from '../../lib/tokens';
import type { ScoreBuckets } from '../../types/scorecard';

interface ScoreBucketChartProps {
  buckets: ScoreBuckets;
  totalSubmissions: number;
  showLabels?: boolean;
  height?: number;
}

interface BucketSegment {
  key: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
  corner: 'red' | 'blue' | 'even';
}

export const ScoreBucketChart: React.FC<ScoreBucketChartProps> = ({
  buckets,
  totalSubmissions,
  showLabels = true,
  height = 8,
}) => {
  const { colors, isDark } = useTheme();

  const cornerColors = {
    red: isDark ? '#C54A50' : '#943538',
    blue: isDark ? '#4A6FA5' : '#1E3A5F',
    even: isDark ? '#9CA3AF' : '#6B7280',
  };

  // Convert buckets to ordered segments
  const segments: BucketSegment[] = [];

  // Red scores (descending dominance: 10-7, 10-8, 10-9)
  if (buckets.red_10_7 && buckets.red_10_7 > 0) {
    segments.push({
      key: 'red_10_7',
      label: '10-7',
      count: buckets.red_10_7,
      percentage: (buckets.red_10_7 / totalSubmissions) * 100,
      color: cornerColors.red,
      corner: 'red',
    });
  }
  if (buckets.red_10_8 && buckets.red_10_8 > 0) {
    segments.push({
      key: 'red_10_8',
      label: '10-8',
      count: buckets.red_10_8,
      percentage: (buckets.red_10_8 / totalSubmissions) * 100,
      color: isDark ? 'rgba(197, 74, 80, 0.8)' : 'rgba(148, 53, 56, 0.8)',
      corner: 'red',
    });
  }
  if (buckets.red_10_9 && buckets.red_10_9 > 0) {
    segments.push({
      key: 'red_10_9',
      label: '10-9',
      count: buckets.red_10_9,
      percentage: (buckets.red_10_9 / totalSubmissions) * 100,
      color: isDark ? 'rgba(197, 74, 80, 0.6)' : 'rgba(148, 53, 56, 0.6)',
      corner: 'red',
    });
  }

  // Even scores
  if (buckets.even_10_10 && buckets.even_10_10 > 0) {
    segments.push({
      key: 'even_10_10',
      label: '10-10',
      count: buckets.even_10_10,
      percentage: (buckets.even_10_10 / totalSubmissions) * 100,
      color: cornerColors.even,
      corner: 'even',
    });
  }

  // Blue scores (ascending dominance: 10-9, 10-8, 10-7)
  if (buckets.blue_10_9 && buckets.blue_10_9 > 0) {
    segments.push({
      key: 'blue_10_9',
      label: '9-10',
      count: buckets.blue_10_9,
      percentage: (buckets.blue_10_9 / totalSubmissions) * 100,
      color: isDark ? 'rgba(74, 111, 165, 0.6)' : 'rgba(30, 58, 95, 0.6)',
      corner: 'blue',
    });
  }
  if (buckets.blue_10_8 && buckets.blue_10_8 > 0) {
    segments.push({
      key: 'blue_10_8',
      label: '8-10',
      count: buckets.blue_10_8,
      percentage: (buckets.blue_10_8 / totalSubmissions) * 100,
      color: isDark ? 'rgba(74, 111, 165, 0.8)' : 'rgba(30, 58, 95, 0.8)',
      corner: 'blue',
    });
  }
  if (buckets.blue_10_7 && buckets.blue_10_7 > 0) {
    segments.push({
      key: 'blue_10_7',
      label: '7-10',
      count: buckets.blue_10_7,
      percentage: (buckets.blue_10_7 / totalSubmissions) * 100,
      color: cornerColors.blue,
      corner: 'blue',
    });
  }

  // Calculate totals by corner
  const redTotal = (buckets.red_10_9 || 0) + (buckets.red_10_8 || 0) + (buckets.red_10_7 || 0);
  const blueTotal = (buckets.blue_10_9 || 0) + (buckets.blue_10_8 || 0) + (buckets.blue_10_7 || 0);
  const evenTotal = buckets.even_10_10 || 0;
  const redPct = totalSubmissions > 0 ? Math.round((redTotal / totalSubmissions) * 100) : 0;
  const bluePct = totalSubmissions > 0 ? Math.round((blueTotal / totalSubmissions) * 100) : 0;

  if (totalSubmissions === 0 || segments.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyBar, { height, backgroundColor: colors.surfaceAlt }]} />
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
          No scores yet
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Bar */}
      <View style={[styles.bar, { height, backgroundColor: colors.surfaceAlt }]}>
        {segments.map((segment, index) => (
          <View
            key={segment.key}
            style={[
              styles.segment,
              {
                backgroundColor: segment.color,
                width: `${segment.percentage}%`,
              },
              index === 0 && styles.firstSegment,
              index === segments.length - 1 && styles.lastSegment,
            ]}
          />
        ))}
      </View>

      {/* Labels */}
      {showLabels && (
        <View style={styles.labels}>
          {redTotal > 0 && (
            <View style={styles.labelItem}>
              <View style={[styles.labelDot, { backgroundColor: cornerColors.red }]} />
              <Text style={[styles.labelText, { color: colors.textSecondary }]}>
                Red {redPct}%
              </Text>
            </View>
          )}
          {evenTotal > 0 && (
            <View style={styles.labelItem}>
              <View style={[styles.labelDot, { backgroundColor: cornerColors.even }]} />
              <Text style={[styles.labelText, { color: colors.textSecondary }]}>
                Even {Math.round((evenTotal / totalSubmissions) * 100)}%
              </Text>
            </View>
          )}
          {blueTotal > 0 && (
            <View style={styles.labelItem}>
              <View style={[styles.labelDot, { backgroundColor: cornerColors.blue }]} />
              <Text style={[styles.labelText, { color: colors.textSecondary }]}>
                Blue {bluePct}%
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// Compact version for inline use
export const ScoreBucketBar: React.FC<{
  buckets: ScoreBuckets;
  totalSubmissions: number;
  height?: number;
}> = ({ buckets, totalSubmissions, height = 4 }) => {
  const { colors, isDark } = useTheme();

  const cornerColors = {
    red: isDark ? '#C54A50' : '#943538',
    blue: isDark ? '#4A6FA5' : '#1E3A5F',
  };

  const redTotal = (buckets.red_10_9 || 0) + (buckets.red_10_8 || 0) + (buckets.red_10_7 || 0);
  const blueTotal = (buckets.blue_10_9 || 0) + (buckets.blue_10_8 || 0) + (buckets.blue_10_7 || 0);

  if (totalSubmissions === 0) {
    return (
      <View style={[styles.bar, { height, backgroundColor: colors.surfaceAlt, borderRadius: height / 2 }]} />
    );
  }

  const redPct = (redTotal / totalSubmissions) * 100;

  return (
    <View style={[styles.bar, { height, backgroundColor: cornerColors.blue, borderRadius: height / 2 }]}>
      <View
        style={[
          styles.segment,
          styles.firstSegment,
          {
            backgroundColor: cornerColors.red,
            width: `${redPct}%`,
            borderTopRightRadius: redPct >= 98 ? height / 2 : 0,
            borderBottomRightRadius: redPct >= 98 ? height / 2 : 0,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  bar: {
    flexDirection: 'row',
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  segment: {
    height: '100%',
  },
  firstSegment: {
    borderTopLeftRadius: radius.sm,
    borderBottomLeftRadius: radius.sm,
  },
  lastSegment: {
    borderTopRightRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  labelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  labelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyContainer: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  emptyBar: {
    width: '100%',
    borderRadius: radius.sm,
  },
  emptyText: {
    fontSize: 11,
  },
});

export default ScoreBucketChart;
