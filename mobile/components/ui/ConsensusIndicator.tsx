/**
 * ConsensusIndicator - Visual gauge showing scoring agreement level
 *
 * 0 = completely split, 1 = unanimous agreement
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../lib/theme';
import { spacing, radius } from '../../lib/tokens';

interface ConsensusIndicatorProps {
  value: number | null; // 0-1
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const ConsensusIndicator: React.FC<ConsensusIndicatorProps> = ({
  value,
  size = 'md',
  showLabel = true,
}) => {
  const { colors, isDark } = useTheme();

  if (value === null || value === undefined) {
    return null;
  }

  // Clamp value between 0 and 1
  const clampedValue = Math.max(0, Math.min(1, value));
  const percentage = Math.round(clampedValue * 100);

  // Color based on consensus level
  const getColor = () => {
    if (clampedValue >= 0.8) return colors.success; // Strong consensus
    if (clampedValue >= 0.6) return isDark ? '#22C55E' : '#16A34A'; // Good consensus
    if (clampedValue >= 0.4) return colors.warning; // Moderate
    return colors.danger; // Split
  };

  // Label based on consensus level
  const getLabel = () => {
    if (clampedValue >= 0.8) return 'Unanimous';
    if (clampedValue >= 0.6) return 'Strong';
    if (clampedValue >= 0.4) return 'Moderate';
    if (clampedValue >= 0.2) return 'Mixed';
    return 'Split';
  };

  const color = getColor();
  const label = getLabel();
  const sizeStyles = getSizeStyles(size);

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={[styles.track, { backgroundColor: colors.surfaceAlt }, sizeStyles.track]}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: color,
              width: `${percentage}%`,
            },
            sizeStyles.track,
          ]}
        />
      </View>

      {/* Label */}
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={[styles.percentage, { color }, sizeStyles.text]}>
            {percentage}%
          </Text>
          <Text style={[styles.label, { color: colors.textTertiary }, sizeStyles.label]}>
            {label}
          </Text>
        </View>
      )}
    </View>
  );
};

// Compact circular version
export const ConsensusRing: React.FC<{
  value: number | null;
  size?: number;
}> = ({ value, size = 40 }) => {
  const { colors, isDark } = useTheme();

  if (value === null || value === undefined) {
    return null;
  }

  const clampedValue = Math.max(0, Math.min(1, value));
  const percentage = Math.round(clampedValue * 100);

  const getColor = () => {
    if (clampedValue >= 0.8) return colors.success;
    if (clampedValue >= 0.6) return isDark ? '#22C55E' : '#16A34A';
    if (clampedValue >= 0.4) return colors.warning;
    return colors.danger;
  };

  const color = getColor();
  const strokeWidth = size * 0.12;
  const ringRadius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = circumference * (1 - clampedValue);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Background ring */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: colors.surfaceAlt,
        }}
      />
      {/* SVG would be better, but keeping it simple with a pseudo approach */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: color,
          borderTopColor: clampedValue < 0.25 ? 'transparent' : color,
          borderRightColor: clampedValue < 0.5 ? 'transparent' : color,
          borderBottomColor: clampedValue < 0.75 ? 'transparent' : color,
          transform: [{ rotate: '-90deg' }],
        }}
      />
      <Text style={{ fontSize: size * 0.28, fontWeight: '700', color }}>
        {percentage}
      </Text>
    </View>
  );
};

const getSizeStyles = (size: 'sm' | 'md' | 'lg') => {
  switch (size) {
    case 'sm':
      return {
        track: { height: 3 },
        text: { fontSize: 11 },
        label: { fontSize: 9 },
      };
    case 'lg':
      return {
        track: { height: 8 },
        text: { fontSize: 16 },
        label: { fontSize: 12 },
      };
    default:
      return {
        track: { height: 5 },
        text: { fontSize: 13 },
        label: { fontSize: 10 },
      };
  }
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  track: {
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: radius.full,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  percentage: {
    fontWeight: '700',
  },
  label: {
    fontWeight: '500',
  },
});

export default ConsensusIndicator;
