/**
 * ConsensusIndicator - Visual gauge showing scoring agreement level
 *
 * 0 = completely split, 1 = unanimous agreement
 * Now with animated fill and pulse effects for high consensus!
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '../../lib/theme';
import { spacing, radius } from '../../lib/tokens';

interface ConsensusIndicatorProps {
  value: number | null; // 0-1
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  /** Animate the fill from 0 to value */
  animate?: boolean;
  /** Show pulse animation for high consensus values */
  showPulse?: boolean;
}

export const ConsensusIndicator: React.FC<ConsensusIndicatorProps> = ({
  value,
  size = 'md',
  showLabel = true,
  animate = true,
  showPulse = true,
}) => {
  const { colors, isDark } = useTheme();
  const fillAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const prevValueRef = useRef<number | null>(null);

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

  // Animate fill on value change
  useEffect(() => {
    if (animate && prevValueRef.current !== clampedValue) {
      fillAnim.setValue(prevValueRef.current ?? 0);
      Animated.timing(fillAnim, {
        toValue: clampedValue,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
      prevValueRef.current = clampedValue;
    } else if (!animate) {
      fillAnim.setValue(clampedValue);
    }
  }, [clampedValue, animate]);

  // Pulse animation for high consensus
  useEffect(() => {
    if (showPulse && clampedValue >= 0.8) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [showPulse, clampedValue >= 0.8]);

  const animatedWidth = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={[styles.track, { backgroundColor: colors.surfaceAlt }, sizeStyles.track]}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: color,
              width: animate ? animatedWidth : `${percentage}%`,
            },
            sizeStyles.track,
          ]}
        />
      </View>

      {/* Label */}
      {showLabel && (
        <View style={styles.labelContainer}>
          <Animated.Text
            style={[
              styles.percentage,
              { color, transform: [{ scale: showPulse && clampedValue >= 0.8 ? pulseAnim : 1 }] },
              sizeStyles.text,
            ]}
          >
            {percentage}%
          </Animated.Text>
          <Text style={[styles.label, { color: colors.textTertiary }, sizeStyles.label]}>
            {label}
          </Text>
        </View>
      )}
    </View>
  );
};

// Compact circular version with animations
export const ConsensusRing: React.FC<{
  value: number | null;
  size?: number;
  animate?: boolean;
}> = ({ value, size = 40, animate = true }) => {
  const { colors, isDark } = useTheme();
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const prevValueRef = useRef<number | null>(null);

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

  // Entrance animation
  useEffect(() => {
    if (animate && prevValueRef.current === null) {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      prevValueRef.current = clampedValue;
    }
  }, [clampedValue, animate]);

  const animatedRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-180deg', '-90deg'],
  });

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: animate ? scaleAnim : 1 }],
      }}
    >
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
      {/* Progress ring */}
      <Animated.View
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
          transform: [{ rotate: animate ? animatedRotate : '-90deg' }],
        }}
      />
      <Text style={{ fontSize: size * 0.28, fontWeight: '700', color }}>
        {percentage}
      </Text>
    </Animated.View>
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
