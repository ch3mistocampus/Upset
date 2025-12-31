import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../lib/theme';
import { radius } from '../../lib/tokens';

interface ProgressBarProps {
  progress: number; // 0-100
  height?: number;
}

export function ProgressBar({ progress, height = 6 }: ProgressBarProps) {
  const { colors } = useTheme();
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animatedWidth, {
      toValue: progress,
      tension: 40,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [progress, animatedWidth]);

  const width = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: colors.surfaceAlt,
          height,
          borderRadius: height / 2,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: colors.accent,
            width,
            height,
            borderRadius: height / 2,
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
