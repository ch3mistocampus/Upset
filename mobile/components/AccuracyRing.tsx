/**
 * AccuracyRing Component
 * Bold circular progress ring for accuracy visualization
 * UFC-inspired athletic aesthetic with aggressive animations
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

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
  const animatedValue = useRef(new Animated.Value(0)).current;
  const countValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Aggressive slam animation for the ring
    Animated.spring(animatedValue, {
      toValue: percentage,
      tension: 40,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Count-up animation for the percentage number
    Animated.timing(countValue, {
      toValue: percentage,
      duration: 1200,
      useNativeDriver: true,
    }).start();
  }, [percentage, animatedValue, countValue]);

  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Rotation for the progress arc
  const rotation = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: ['0deg', '360deg'],
  });

  // Animated percentage display
  const [displayPercentage, setDisplayPercentage] = React.useState(0);

  useEffect(() => {
    const listener = countValue.addListener(({ value }) => {
      setDisplayPercentage(Math.round(value * 10) / 10);
    });

    return () => countValue.removeListener(listener);
  }, [countValue]);

  // Color based on accuracy
  const getAccuracyColor = (pct: number) => {
    if (pct >= 70) return '#d4202a'; // UFC red for great accuracy
    if (pct >= 50) return '#fbbf24'; // Yellow for decent
    return '#ef4444'; // Red for poor
  };

  const progressColor = getAccuracyColor(percentage);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background ring - full circle */}
      <View
        style={[
          styles.backgroundRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
          },
        ]}
      />

      {/* Progress ring - uses rotation masking technique */}
      <View
        style={[
          styles.progressContainer,
          {
            width: size,
            height: size,
          },
        ]}
      >
        {/* Left half */}
        <View
          style={[
            styles.half,
            {
              width: size / 2,
              height: size,
              left: 0,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.progressRing,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: strokeWidth,
                borderColor: progressColor,
                transform: [
                  { translateX: size / 2 },
                  {
                    rotate: animatedValue.interpolate({
                      inputRange: [0, 50],
                      outputRange: ['0deg', '180deg'],
                      extrapolate: 'clamp',
                    }),
                  },
                  { translateX: -size / 2 },
                ],
              },
            ]}
          />
        </View>

        {/* Right half */}
        <View
          style={[
            styles.half,
            {
              width: size / 2,
              height: size,
              right: 0,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.progressRing,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: strokeWidth,
                borderColor: progressColor,
                transform: [
                  { translateX: -size / 2 },
                  {
                    rotate: animatedValue.interpolate({
                      inputRange: [50, 100],
                      outputRange: ['0deg', '180deg'],
                      extrapolate: 'clamp',
                    }),
                  },
                  { translateX: size / 2 },
                ],
                opacity: animatedValue.interpolate({
                  inputRange: [0, 50, 50.01, 100],
                  outputRange: [0, 0, 1, 1],
                }),
              },
            ]}
          />
        </View>
      </View>

      {/* Center content */}
      <View style={styles.centerContent}>
        {/* Percentage number - BOLD and MASSIVE */}
        <Animated.Text
          style={[
            styles.percentage,
            {
              color: progressColor,
              transform: [
                {
                  scale: animatedValue.interpolate({
                    inputRange: [0, 100],
                    outputRange: [0.5, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {displayPercentage.toFixed(1)}
          <Text style={styles.percentSymbol}>%</Text>
        </Animated.Text>

        {/* Label */}
        <Text style={styles.label}>{label.toUpperCase()}</Text>
      </View>

      {/* Angular accent lines for UFC aesthetic */}
      <View style={[styles.accentLine, styles.accentTop, { width: size * 0.3 }]} />
      <View style={[styles.accentLine, styles.accentBottom, { width: size * 0.3 }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundRing: {
    position: 'absolute',
    borderColor: '#333',
    backgroundColor: 'transparent',
  },
  progressContainer: {
    position: 'absolute',
    overflow: 'hidden',
  },
  half: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  progressRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  percentage: {
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: -2,
    lineHeight: 52,
    textShadowColor: 'rgba(212, 32, 42, 0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  percentSymbol: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0,
  },
  label: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#666',
    marginTop: 4,
  },
  accentLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#d4202a',
    opacity: 0.3,
  },
  accentTop: {
    top: 8,
    left: 8,
  },
  accentBottom: {
    bottom: 8,
    right: 8,
  },
});
