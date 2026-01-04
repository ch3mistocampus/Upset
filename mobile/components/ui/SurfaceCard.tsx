/**
 * SurfaceCard - Premium card with layered gradients and soft shadow
 *
 * Structure:
 * - Outer container: handles shadow (no clip)
 * - Inner container: handles radius + overflow hidden
 * - Layer 1: base white background
 * - Layer 2: muted red wash gradient (fades from top-left corner)
 * - Content layer with padding
 */

import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ViewStyle, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../lib/theme';
import { spacing, radius, shadows } from '../../lib/tokens';

interface SurfaceCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Enable the muted red wash overlay (default: true for hero cards) */
  showWash?: boolean;
  /** Reduce wash intensity for secondary cards */
  weakWash?: boolean;
  /** Disable padding */
  noPadding?: boolean;
  /** Custom padding size: 'lg' (default 18px), 'md' (14px), 'sm' (10px) */
  paddingSize?: 'lg' | 'md' | 'sm';
  /** Enhanced glow for primary hero cards */
  heroGlow?: boolean;
  /** Animated pulsing border effect */
  animatedBorder?: boolean;
}

export function SurfaceCard({
  children,
  style,
  showWash = true,
  weakWash = false,
  noPadding = false,
  paddingSize = 'lg',
  heroGlow = false,
  animatedBorder = false,
}: SurfaceCardProps) {
  const { colors, isDark } = useTheme();
  const cardShadow = isDark ? shadows.dark.card : shadows.light.card;

  // Animated border pulse
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animatedBorder) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(borderAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false, // borderColor doesn't support native driver
          }),
          Animated.timing(borderAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [animatedBorder, borderAnim]);

  // Interpolate border color
  const animatedBorderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      isDark ? 'rgba(224, 90, 85, 0.15)' : 'rgba(176, 68, 63, 0.12)',
      isDark ? 'rgba(224, 90, 85, 0.45)' : 'rgba(176, 68, 63, 0.35)',
    ],
  });

  // Refined wash alpha - constrained to top portion only
  // Hero cards: 22% at origin, fades quickly
  // Standard cards: 16%
  // Weak wash: 6% for secondary/quieter cards
  const washAlpha = heroGlow ? 0.22 : weakWash ? 0.06 : 0.16;
  const washStart = isDark
    ? `rgba(200, 80, 75, ${washAlpha})`
    : `rgba(140, 60, 55, ${washAlpha})`; // Muted warm tone

  // Outer glow for hero cards - very subtle ambient
  const glowAlpha = isDark ? 0.06 : 0.08;
  const outerGlow = isDark
    ? `rgba(200, 80, 75, ${glowAlpha})`
    : `rgba(140, 60, 55, ${glowAlpha})`;

  // Common inner container styles
  const innerContainerStyle = [
    styles.innerContainer,
    {
      borderRadius: radius.card,
      backgroundColor: colors.cardBaseTop,
    },
  ];

  // Wrapper component based on animated border
  const InnerContainer = animatedBorder ? Animated.View : View;
  const borderStyle = animatedBorder
    ? { borderWidth: 1.5, borderColor: animatedBorderColor }
    : {};

  return (
    // Outer container for shadow (no clipping)
    <View style={[styles.shadowContainer, cardShadow, style]}>
      {/* Inner container with radius and overflow hidden */}
      <InnerContainer
        style={[
          ...innerContainerStyle,
          borderStyle,
        ]}
      >
        {/* Layer 1: Outer glow for hero cards - constrained to top-left */}
        {heroGlow && (
          <LinearGradient
            colors={[outerGlow, 'transparent'] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.5, y: 0.35 }}
            style={styles.glowLayer}
          />
        )}

        {/* Layer 2: Warm wash - constrained to top 30-40%, fades to neutral */}
        {(showWash || heroGlow) && (
          <LinearGradient
            colors={[washStart, 'transparent'] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.7, y: 0.4 }}
            style={styles.washLayer}
          />
        )}

        {/* Content */}
        <View style={[
          styles.content,
          !noPadding && {
            padding: paddingSize === 'lg' ? spacing.lg : paddingSize === 'md' ? spacing.md : spacing.sm
          }
        ]}>
          {children}
        </View>
      </InnerContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowContainer: {
    // Shadow applied here, no overflow clipping
  },
  innerContainer: {
    overflow: 'hidden',
  },
  glowLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  washLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  padding: {
    padding: spacing.lg,
  },
});
