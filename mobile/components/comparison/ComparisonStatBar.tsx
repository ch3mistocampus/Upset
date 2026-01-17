/**
 * ComparisonStatBar - Dual-sided horizontal bar for stat comparisons
 * Shows percentage/numeric values with advantage highlighting
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../lib/theme';
import { spacing, typography, radius, fighterColors } from '../../lib/tokens';

interface ComparisonStatBarProps {
  label: string;
  redValue: number | null;
  blueValue: number | null;
  isPercentage?: boolean;
  higherIsBetter?: boolean;
  formatValue?: (value: number) => string;
}

export function ComparisonStatBar({
  label,
  redValue,
  blueValue,
  isPercentage = false,
  higherIsBetter = true,
  formatValue,
}: ComparisonStatBarProps): React.ReactElement {
  const { colors, isDark } = useTheme();

  const redBarWidth = useRef(new Animated.Value(0)).current;
  const blueBarWidth = useRef(new Animated.Value(0)).current;

  const redColor = isDark ? fighterColors.red.solid.dark : fighterColors.red.solid.light;
  const blueColor = isDark ? fighterColors.blue.solid.dark : fighterColors.blue.solid.light;

  // Determine advantage
  const redVal = redValue ?? 0;
  const blueVal = blueValue ?? 0;
  const hasData = redValue !== null || blueValue !== null;

  let advantage: 'red' | 'blue' | 'equal' | 'none' = 'none';
  let advantageDiff = 0;

  if (hasData && redValue !== null && blueValue !== null) {
    if (redVal === blueVal) {
      advantage = 'equal';
    } else if (higherIsBetter) {
      advantage = redVal > blueVal ? 'red' : 'blue';
      advantageDiff = Math.abs(redVal - blueVal);
    } else {
      advantage = redVal < blueVal ? 'red' : 'blue';
      advantageDiff = Math.abs(redVal - blueVal);
    }
  }

  // Calculate bar percentages (relative to max for visualization)
  const maxVal = Math.max(redVal, blueVal, 1);
  const redPercent = hasData ? (redVal / maxVal) * 100 : 0;
  const bluePercent = hasData ? (blueVal / maxVal) * 100 : 0;

  // Animate bars on mount
  useEffect(() => {
    Animated.parallel([
      Animated.spring(redBarWidth, {
        toValue: redPercent,
        useNativeDriver: false,
        tension: 50,
        friction: 10,
      }),
      Animated.spring(blueBarWidth, {
        toValue: bluePercent,
        useNativeDriver: false,
        tension: 50,
        friction: 10,
      }),
    ]).start();
  }, [redPercent, bluePercent]);

  const defaultFormat = (val: number): string => {
    if (isPercentage) {
      return `${Math.round(val)}%`;
    }
    return val.toFixed(2);
  };

  const format = formatValue || defaultFormat;

  const formatDiff = (): string => {
    if (isPercentage) {
      return `+${Math.round(advantageDiff)}%`;
    }
    return `+${advantageDiff.toFixed(2)}`;
  };

  return (
    <View style={styles.container}>
      {/* Label */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>

      {/* Values Row */}
      <View style={styles.valuesRow}>
        <Text
          style={[
            styles.value,
            {
              color: advantage === 'red' ? redColor : colors.text,
              fontWeight: advantage === 'red' ? '700' : '500',
            },
          ]}
        >
          {redValue !== null ? format(redValue) : '--'}
        </Text>

        <View style={styles.barContainer}>
          {/* Red Bar (right-aligned, grows left from center) */}
          <View style={styles.redBarWrapper}>
            <Animated.View
              style={[
                styles.bar,
                styles.redBar,
                {
                  backgroundColor: advantage === 'red' ? redColor : colors.surfaceAlt,
                  width: redBarWidth.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          {/* Center divider */}
          <View style={[styles.centerDivider, { backgroundColor: colors.border }]} />

          {/* Blue Bar (left-aligned, grows right from center) */}
          <View style={styles.blueBarWrapper}>
            <Animated.View
              style={[
                styles.bar,
                styles.blueBar,
                {
                  backgroundColor: advantage === 'blue' ? blueColor : colors.surfaceAlt,
                  width: blueBarWidth.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>

        <Text
          style={[
            styles.value,
            {
              color: advantage === 'blue' ? blueColor : colors.text,
              fontWeight: advantage === 'blue' ? '700' : '500',
            },
          ]}
        >
          {blueValue !== null ? format(blueValue) : '--'}
        </Text>
      </View>

      {/* Advantage indicator */}
      {advantage !== 'none' && advantage !== 'equal' && advantageDiff > 0 && (
        <Text
          style={[
            styles.advantage,
            {
              color: advantage === 'red' ? redColor : blueColor,
              alignSelf: advantage === 'red' ? 'flex-start' : 'flex-end',
            },
          ]}
        >
          {formatDiff()}
        </Text>
      )}

      {advantage === 'equal' && (
        <Text style={[styles.advantage, { color: colors.textTertiary, alignSelf: 'center' }]}>
          =
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  label: {
    ...typography.caption,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  valuesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  value: {
    width: 50,
    fontSize: 14,
    textAlign: 'center',
  },
  barContainer: {
    flex: 1,
    flexDirection: 'row',
    height: 8,
    alignItems: 'center',
  },
  redBarWrapper: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  blueBarWrapper: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
  redBar: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  blueBar: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  centerDivider: {
    width: 2,
    height: 14,
  },
  advantage: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    paddingHorizontal: 50 + spacing.sm,
  },
});
