/**
 * UpsetTicker - Bloomberg-style scrolling ticker for community pick percentages
 * Shows the leading fighter pick % for each bout in the next event
 * Phase 1: Percentages only (no momentum arrows until we have more user data)
 */

import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, ActivityIndicator } from 'react-native';
import { useTheme } from '../../lib/theme';
import { spacing, radius } from '../../lib/tokens';

export interface TickerItem {
  boutId: string;
  fighterName: string;
  pct: number;
}

interface UpsetTickerProps {
  items: TickerItem[];
  isLoading?: boolean;
}

export function UpsetTicker({ items, isLoading }: UpsetTickerProps) {
  const { colors } = useTheme();
  const scrollAnim = useRef(new Animated.Value(0)).current;

  // Duplicate items for seamless loop
  const tickerItems = [...items, ...items];

  // Calculate total width (approximate)
  const itemWidth = 120; // Approximate width per item
  const totalWidth = items.length * itemWidth;

  useEffect(() => {
    if (items.length === 0) return;

    // Reset animation
    scrollAnim.setValue(0);

    // Continuous scroll animation
    const animation = Animated.loop(
      Animated.timing(scrollAnim, {
        toValue: -totalWidth,
        duration: items.length * 3500, // Slightly faster scroll
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    animation.start();

    return () => animation.stop();
  }, [items.length, totalWidth, scrollAnim]);

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={[styles.label, { color: colors.textTertiary }]}>COMMUNITY PICKS</Text>
        <View
          style={[
            styles.tickerSurface,
            styles.loadingContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <ActivityIndicator size="small" color={colors.textTertiary} />
          <Text style={[styles.loadingText, { color: colors.textTertiary }]}>
            Loading picks...
          </Text>
        </View>
      </View>
    );
  }

  // Empty state - no picks yet
  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={[styles.label, { color: colors.textTertiary }]}>COMMUNITY PICKS</Text>
        <View
          style={[
            styles.tickerSurface,
            styles.emptyContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            No picks yet - be the first to call the fights!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Section Label */}
      <Text style={[styles.label, { color: colors.textTertiary }]}>COMMUNITY PICKS</Text>

      {/* Ticker Surface */}
      <View
        style={[
          styles.tickerSurface,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.tickerContent,
            {
              transform: [{ translateX: scrollAnim }],
            },
          ]}
        >
          {tickerItems.map((item, index) => (
            <View key={`${item.boutId}-${index}`} style={styles.tickerItem}>
              <Text style={[styles.fighterName, { color: colors.text }]}>
                {item.fighterName}
              </Text>
              <Text
                style={[
                  styles.percentage,
                  { color: item.pct >= 60 ? colors.accent : colors.textSecondary },
                ]}
              >
                {item.pct}%
              </Text>
              <View style={[styles.separator, { backgroundColor: colors.border }]} />
            </View>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  tickerSurface: {
    borderWidth: 1,
    borderRadius: radius.card - 4,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
  },
  tickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: 6,
  },
  fighterName: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  percentage: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  separator: {
    width: 1,
    height: 16,
    marginLeft: spacing.md,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});
