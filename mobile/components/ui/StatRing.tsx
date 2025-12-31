import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../lib/theme';
import { spacing, typography } from '../../lib/tokens';

interface StatRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function StatRing({
  percentage,
  size = 140,
  strokeWidth = 10,
  label = 'ACCURACY',
}: StatRingProps) {
  const { colors } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: percentage,
      tension: 20,
      friction: 7,
      useNativeDriver: false,
    }).start();
  }, [percentage, animatedValue]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={styles.container}>
      <View style={[styles.ringContainer, { width: size, height: size }]}>
        <Svg width={size} height={size} style={styles.svg}>
          {/* Background track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.surfaceAlt}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress arc */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.accent}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>

        <View style={styles.centerContent}>
          <Text style={[styles.percentage, { color: colors.textPrimary }]}>
            {Math.round(percentage)}%
          </Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {label}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  ringContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  centerContent: {
    alignItems: 'center',
  },
  percentage: {
    ...typography.h1,
    fontSize: 32,
  },
  label: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
