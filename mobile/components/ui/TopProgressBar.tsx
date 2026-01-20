/**
 * TopProgressBar - Thin 4px progress indicator
 *
 * Design: Pinned to top of SafeAreaView (under header).
 * Shows picks completion progress with spring animation.
 */

import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../lib/theme';

interface TopProgressBarProps {
  /** Current number of picks */
  current: number;
  /** Total number of bouts */
  total: number;
}

export function TopProgressBar({ current, total }: TopProgressBarProps) {
  const { colors } = useTheme();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progress = total > 0 ? current / total : 0;

  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: progress,
      useNativeDriver: false,
      tension: 50,
      friction: 10,
    }).start();
  }, [progress, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.border }]}>
      <Animated.View
        style={[
          styles.fill,
          {
            width: progressWidth,
            backgroundColor: colors.accent,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 4,
    width: '100%',
  },
  fill: {
    height: '100%',
  },
});
