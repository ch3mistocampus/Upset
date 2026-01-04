/**
 * MiniChart Component
 * Horizontal bar chart showing accuracy per event
 * Clean, theme-aware design
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../lib/theme';

interface ChartData {
  eventName: string;
  accuracy: number; // 0-100
}

interface MiniChartProps {
  data: ChartData[];
}

export const MiniChart: React.FC<MiniChartProps> = ({ data }) => {
  const { colors } = useTheme();
  const maxBars = 5;
  const chartData = data.slice(0, maxBars);

  // Get color based on accuracy
  const getBarColor = (accuracy: number): string => {
    if (accuracy >= 70) return colors.success;
    if (accuracy >= 50) return colors.warning;
    return colors.danger;
  };

  // Truncate event name
  const truncateName = (name: string, maxLength = 18): string => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 1) + '…';
  };

  return (
    <View style={styles.container}>
      {chartData.map((item, index) => (
        <ChartRow
          key={index}
          eventName={truncateName(item.eventName)}
          accuracy={item.accuracy}
          color={getBarColor(item.accuracy)}
          delay={index * 60}
          colors={colors}
        />
      ))}
    </View>
  );
};

interface ChartRowProps {
  eventName: string;
  accuracy: number;
  color: string;
  delay: number;
  colors: any;
}

const ChartRow: React.FC<ChartRowProps> = ({ eventName, accuracy, color, delay, colors }) => {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: accuracy,
        delay,
        duration: 400,
        useNativeDriver: false, // width animation can't use native driver
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        delay,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [accuracy, delay]);

  const barWidth = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.row, { opacity: opacityAnim }]}>
      <Text style={[styles.eventName, { color: colors.textSecondary }]} numberOfLines={1}>
        {eventName}
      </Text>
      <View style={styles.barContainer}>
        <View style={[styles.barBackground, { backgroundColor: colors.surfaceAlt }]}>
          <Animated.View
            style={[
              styles.barFill,
              {
                width: barWidth,
                backgroundColor: color,
              },
            ]}
          />
        </View>
        <Text style={[styles.percentage, { color }]}>
          {Math.round(accuracy)}%
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  eventName: {
    width: 115,
    fontSize: 11,
    fontWeight: '500',
  },
  barContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  barBackground: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentage: {
    width: 40,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
    marginLeft: 8,
  },
});
