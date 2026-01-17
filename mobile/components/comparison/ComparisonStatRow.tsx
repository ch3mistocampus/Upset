/**
 * ComparisonStatRow - Simple side-by-side stat display
 * Used for non-bar stats like stance, age, record
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../lib/theme';
import { spacing, typography, fighterColors } from '../../lib/tokens';

interface ComparisonStatRowProps {
  label: string;
  redValue: string | null;
  blueValue: string | null;
  highlightDifference?: boolean;
  higherIsBetter?: boolean;
  numericCompare?: boolean;
}

export function ComparisonStatRow({
  label,
  redValue,
  blueValue,
  highlightDifference = false,
  higherIsBetter = true,
  numericCompare = false,
}: ComparisonStatRowProps): React.ReactElement {
  const { colors, isDark } = useTheme();

  const redColor = isDark ? fighterColors.red.solid.dark : fighterColors.red.solid.light;
  const blueColor = isDark ? fighterColors.blue.solid.dark : fighterColors.blue.solid.light;

  // Determine advantage for highlighting
  let advantage: 'red' | 'blue' | 'none' = 'none';

  if (highlightDifference && numericCompare && redValue && blueValue) {
    const redNum = parseFloat(redValue.replace(/[^0-9.-]/g, ''));
    const blueNum = parseFloat(blueValue.replace(/[^0-9.-]/g, ''));

    if (!isNaN(redNum) && !isNaN(blueNum) && redNum !== blueNum) {
      if (higherIsBetter) {
        advantage = redNum > blueNum ? 'red' : 'blue';
      } else {
        advantage = redNum < blueNum ? 'red' : 'blue';
      }
    }
  }

  return (
    <View style={styles.container}>
      {/* Red Value */}
      <Text
        style={[
          styles.value,
          {
            color: advantage === 'red' ? redColor : colors.text,
            fontWeight: advantage === 'red' ? '700' : '500',
            textAlign: 'right',
          },
        ]}
        numberOfLines={1}
      >
        {redValue || '--'}
      </Text>

      {/* Label */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>

      {/* Blue Value */}
      <Text
        style={[
          styles.value,
          {
            color: advantage === 'blue' ? blueColor : colors.text,
            fontWeight: advantage === 'blue' ? '700' : '500',
            textAlign: 'left',
          },
        ]}
        numberOfLines={1}
      >
        {blueValue || '--'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  value: {
    flex: 1,
    fontSize: 14,
  },
  label: {
    width: 80,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
