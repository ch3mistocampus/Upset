/**
 * MiniChart Component
 * Compact bar chart for recent events accuracy
 * UFC-inspired with aggressive staggered animations
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface ChartData {
  eventName: string;
  accuracy: number; // 0-100
}

interface MiniChartProps {
  data: ChartData[];
}

export const MiniChart: React.FC<MiniChartProps> = ({ data }) => {
  const maxBars = 5;
  const chartData = data.slice(0, maxBars);
  const maxHeight = 120;

  // Get color based on accuracy
  const getBarColor = (accuracy: number): string => {
    if (accuracy >= 70) return '#4ade80'; // Green - excellent
    if (accuracy >= 50) return '#fbbf24'; // Yellow - good
    return '#ef4444'; // Red - needs improvement
  };

  // Truncate event name to fit
  const truncateName = (name: string, maxLength = 10): string => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 2) + '..';
  };

  return (
    <View style={styles.container}>
      {/* Horizontal reference lines */}
      <View style={styles.gridLines}>
        <View style={[styles.gridLine, { bottom: maxHeight }]} />
        <View style={[styles.gridLine, { bottom: maxHeight * 0.75 }]} />
        <View style={[styles.gridLine, { bottom: maxHeight * 0.5 }]} />
        <View style={[styles.gridLine, { bottom: maxHeight * 0.25 }]} />
        <View style={[styles.gridLine, styles.baseline, { bottom: 0 }]} />
      </View>

      {/* Bars container */}
      <View style={styles.barsContainer}>
        {chartData.map((item, index) => (
          <Bar
            key={index}
            accuracy={item.accuracy}
            eventName={item.eventName}
            maxHeight={maxHeight}
            delay={index * 80}
            color={getBarColor(item.accuracy)}
          />
        ))}

        {/* Fill empty slots with placeholders if less than 5 */}
        {Array.from({ length: maxBars - chartData.length }).map((_, index) => (
          <View key={`empty-${index}`} style={styles.barSlot}>
            <View style={styles.emptyBar} />
            <Text style={styles.emptyLabel}>—</Text>
          </View>
        ))}
      </View>

      {/* Y-axis labels */}
      <View style={styles.yAxisLabels}>
        <Text style={styles.yAxisLabel}>100</Text>
        <Text style={styles.yAxisLabel}>75</Text>
        <Text style={styles.yAxisLabel}>50</Text>
        <Text style={styles.yAxisLabel}>25</Text>
        <Text style={styles.yAxisLabel}>0</Text>
      </View>
    </View>
  );
};

interface BarProps {
  accuracy: number;
  eventName: string;
  maxHeight: number;
  delay: number;
  color: string;
}

const Bar: React.FC<BarProps> = ({ accuracy, eventName, maxHeight, delay, color }) => {
  const heightAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered slam-up animation
    Animated.parallel([
      Animated.spring(heightAnim, {
        toValue: accuracy,
        delay,
        tension: 60,
        friction: 8,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        delay,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [accuracy, delay, heightAnim, opacityAnim]);

  const barHeight = heightAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [0, maxHeight],
  });

  const truncateName = (name: string, maxLength = 10): string => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 2) + '..';
  };

  return (
    <Animated.View style={[styles.barSlot, { opacity: opacityAnim }]}>
      {/* Accuracy percentage label above bar */}
      <Animated.Text
        style={[
          styles.accuracyLabel,
          {
            color,
            opacity: opacityAnim,
            transform: [
              {
                translateY: heightAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: [0, -8],
                }),
              },
            ],
          },
        ]}
      >
        {Math.round(accuracy)}%
      </Animated.Text>

      {/* The bar itself */}
      <Animated.View
        style={[
          styles.bar,
          {
            height: barHeight,
            backgroundColor: color,
            shadowColor: color,
          },
        ]}
      >
        {/* Inner highlight for depth */}
        <View style={styles.barHighlight} />
      </Animated.View>

      {/* Event name label */}
      <Text style={styles.barLabel} numberOfLines={1}>
        {truncateName(eventName, 9)}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 180,
    position: 'relative',
    paddingLeft: 28,
    paddingRight: 8,
    paddingTop: 8,
    paddingBottom: 8,
  },
  gridLines: {
    position: 'absolute',
    left: 28,
    right: 8,
    top: 8,
    bottom: 32,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#2a2a2a',
  },
  baseline: {
    backgroundColor: '#333',
    height: 2,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
    marginBottom: 8,
  },
  barSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 3,
    position: 'relative',
  },
  bar: {
    width: '100%',
    maxWidth: 32,
    minHeight: 2,
    position: 'relative',
    // Sharp, angular - no borderRadius
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  barHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: '60%',
    height: '30%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  emptyBar: {
    width: '100%',
    maxWidth: 32,
    height: 2,
    backgroundColor: '#1a1a1a',
  },
  accuracyLabel: {
    position: 'absolute',
    top: -20,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  barLabel: {
    marginTop: 6,
    fontSize: 9,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  emptyLabel: {
    marginTop: 6,
    fontSize: 9,
    color: '#333',
  },
  yAxisLabels: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 32,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 6,
  },
  yAxisLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#444',
    letterSpacing: 0.5,
  },
});
