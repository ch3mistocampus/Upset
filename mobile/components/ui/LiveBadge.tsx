/**
 * LiveBadge - Animated badge for live/in-progress fights
 *
 * Shows a pulsing indicator with phase-specific colors and text
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '../../lib/theme';
import { radius } from '../../lib/tokens';
import type { RoundPhase } from '../../types/scorecard';

interface LiveBadgeProps {
  phase: RoundPhase;
  currentRound?: number;
  size?: 'sm' | 'md' | 'lg';
  showRound?: boolean;
}

export const LiveBadge: React.FC<LiveBadgeProps> = ({
  phase,
  currentRound,
  size = 'md',
  showRound = false,
}) => {
  const { colors, isDark } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for live phases
  const isLive = phase === 'ROUND_LIVE' || phase === 'ROUND_BREAK';

  useEffect(() => {
    if (isLive) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
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
  }, [isLive, pulseAnim]);

  const getPhaseConfig = () => {
    switch (phase) {
      case 'ROUND_LIVE':
        return {
          text: showRound && currentRound ? `R${currentRound} LIVE` : 'LIVE',
          color: colors.danger,
          bgColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)',
          showDot: true,
        };
      case 'ROUND_BREAK':
        return {
          text: showRound && currentRound ? `SCORE R${currentRound}` : 'SCORE NOW',
          color: colors.success,
          bgColor: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.15)',
          showDot: true,
        };
      case 'PRE_FIGHT':
        return {
          text: 'UPCOMING',
          color: colors.textSecondary,
          bgColor: isDark ? 'rgba(156, 163, 175, 0.2)' : 'rgba(156, 163, 175, 0.15)',
          showDot: false,
        };
      case 'ROUND_CLOSED':
        return {
          text: 'SCORING CLOSED',
          color: colors.textTertiary,
          bgColor: isDark ? 'rgba(156, 163, 175, 0.15)' : 'rgba(156, 163, 175, 0.1)',
          showDot: false,
        };
      case 'FIGHT_ENDED':
        return {
          text: 'ENDED',
          color: colors.textTertiary,
          bgColor: isDark ? 'rgba(156, 163, 175, 0.15)' : 'rgba(156, 163, 175, 0.1)',
          showDot: false,
        };
      default:
        return {
          text: phase,
          color: colors.textSecondary,
          bgColor: isDark ? 'rgba(156, 163, 175, 0.15)' : 'rgba(156, 163, 175, 0.1)',
          showDot: false,
        };
    }
  };

  const config = getPhaseConfig();
  const sizeStyles = getSizeStyles(size);

  return (
    <View style={[styles.container, { backgroundColor: config.bgColor }, sizeStyles.container]}>
      {config.showDot && (
        <Animated.View
          style={[
            styles.dot,
            { backgroundColor: config.color, opacity: pulseAnim },
            sizeStyles.dot,
          ]}
        />
      )}
      <Text style={[styles.text, { color: config.color }, sizeStyles.text]}>
        {config.text}
      </Text>
    </View>
  );
};

const getSizeStyles = (size: 'sm' | 'md' | 'lg') => {
  switch (size) {
    case 'sm':
      return {
        container: { paddingHorizontal: 6, paddingVertical: 2 },
        dot: { width: 5, height: 5 },
        text: { fontSize: 9 },
      };
    case 'lg':
      return {
        container: { paddingHorizontal: 12, paddingVertical: 6 },
        dot: { width: 8, height: 8 },
        text: { fontSize: 13 },
      };
    default: // md
      return {
        container: { paddingHorizontal: 8, paddingVertical: 3 },
        dot: { width: 6, height: 6 },
        text: { fontSize: 11 },
      };
  }
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    gap: 4,
  },
  dot: {
    borderRadius: 100,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default LiveBadge;
