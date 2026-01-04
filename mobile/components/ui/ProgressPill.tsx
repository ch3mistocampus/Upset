/**
 * ProgressPill - Pill progress bar with animated fill
 *
 * Features:
 * - Smooth animated width transitions
 * - Fully rounded track and fill
 * - Uses muted accent color
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../lib/theme';
import { radius } from '../../lib/tokens';

interface ProgressPillProps {
  /** Progress value from 0 to 100 */
  progress: number;
  /** Height of the pill (default: 7) */
  height?: number;
}

export function ProgressPill({ progress, height = 7 }: ProgressPillProps) {
  const { colors } = useTheme();
  const animatedWidth = useRef(new Animated.Value(0)).current;

  // Clamp progress to 0-100
  const clampedProgress = Math.max(0, Math.min(100, progress));

  useEffect(() => {
    Animated.spring(animatedWidth, {
      toValue: clampedProgress,
      tension: 50,
      friction: 12,
      useNativeDriver: false,
    }).start();
  }, [clampedProgress, animatedWidth]);

  const fillWidth = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={[
        styles.track,
        {
          height,
          borderRadius: height / 2,
          backgroundColor: 'rgba(0, 0, 0, 0.06)',
        },
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            width: fillWidth,
            height,
            borderRadius: height / 2,
            backgroundColor: colors.accent,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
