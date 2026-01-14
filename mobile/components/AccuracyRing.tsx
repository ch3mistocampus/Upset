/**
 * AccuracyRing Component
 * Clean circular progress ring using SVG
 * Animated fill sweeping from top + count-up number
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../lib/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface AccuracyRingProps {
  percentage: number; // 0-100
  size?: number;
  label?: string;
}

export const AccuracyRing: React.FC<AccuracyRingProps> = ({
  percentage,
  size = 180,
  label = 'Accuracy',
}) => {
  const { colors, isDark } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  // Scale based on size (180 is the base)
  const scale = size / 180;
  const strokeWidth = Math.max(8, 12 * scale);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Scaled font sizes
  const valueFontSize = Math.round(48 * scale);
  const percentFontSize = Math.round(28 * scale);
  const labelFontSize = Math.round(11 * scale);

  useEffect(() => {
    // Reset and animate
    animatedValue.setValue(0);

    Animated.timing(animatedValue, {
      toValue: percentage,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // strokeDashoffset doesn't support native driver
    }).start();

    // Update display value for count-up effect
    const listener = animatedValue.addListener(({ value }) => {
      setDisplayValue(Math.round(value * 10) / 10);
    });

    return () => animatedValue.removeListener(listener);
  }, [percentage]);

  // Always use accent color (UFC red) - the number tells the story
  const progressColor = colors.accent;
  const trackColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

  // Animate stroke dash offset
  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Track (background circle) */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      {/* Center content */}
      <View style={styles.center}>
        <Text style={[styles.value, { color: progressColor, fontSize: valueFontSize }]}>
          {displayValue.toFixed(1)}
          <Text style={[styles.percent, { fontSize: percentFontSize }]}>%</Text>
        </Text>
        <Text style={[styles.label, { color: colors.textSecondary, fontSize: labelFontSize }]}>
          {label.toUpperCase()}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  svg: {
    position: 'absolute',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: 'BebasNeue',
    fontSize: 48,
    letterSpacing: -1,
  },
  percent: {
    fontFamily: 'BebasNeue',
    fontSize: 28,
  },
  label: {
    fontFamily: 'BebasNeue',
    fontSize: 12,
    letterSpacing: 1.5,
    marginTop: 2,
  },
});
