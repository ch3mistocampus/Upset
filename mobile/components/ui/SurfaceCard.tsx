/**
 * SurfaceCard - Premium card with subtle texture and soft shadow
 *
 * Structure:
 * - Outer container: handles shadow (no clip)
 * - Inner container: handles radius + overflow hidden
 * - Layer 1: base background
 * - Layer 2: subtle diagonal stripe texture (instead of gradient wash)
 * - Content layer with padding
 */

import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ViewStyle, Animated } from 'react-native';
import { useTheme } from '../../lib/theme';
import { spacing, radius, shadows } from '../../lib/tokens';

interface SurfaceCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Enable the subtle texture overlay (default: true) */
  showWash?: boolean;
  /** Reduce texture intensity for secondary cards */
  weakWash?: boolean;
  /** Disable padding */
  noPadding?: boolean;
  /** Custom padding size: 'lg' (default 18px), 'md' (14px), 'sm' (10px) */
  paddingSize?: 'lg' | 'md' | 'sm';
  /** Enhanced styling for primary hero cards */
  heroGlow?: boolean;
  /** Animated pulsing border effect */
  animatedBorder?: boolean;
}

// Texture stripe component - creates diagonal lines pattern
const TextureStripes: React.FC<{ color: string; opacity: number; spacing?: number }> = ({
  color,
  opacity,
  spacing: lineSpacing = 6,
}) => {
  const stripeCount = Math.ceil(400 / lineSpacing); // Enough to cover card width
  return (
    <View style={textureStyles.container} pointerEvents="none">
      {[...Array(stripeCount)].map((_, i) => (
        <View
          key={i}
          style={[
            textureStyles.stripe,
            {
              left: i * lineSpacing,
              backgroundColor: color,
              opacity,
            },
          ]}
        />
      ))}
    </View>
  );
};

const textureStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  stripe: {
    position: 'absolute',
    top: -20,
    width: 1,
    height: '150%',
    transform: [{ rotate: '45deg' }],
  },
});

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

  // Enhanced shadow for hero cards (Main Event)
  const heroShadow = heroGlow ? {
    shadowColor: isDark ? '#E05A55' : '#B0443F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  } : {};

  // Animated border pulse
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animatedBorder) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(borderAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
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

  // Interpolate border color for animated border
  const animatedBorderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      isDark ? 'rgba(224, 90, 85, 0.15)' : 'rgba(176, 68, 63, 0.12)',
      isDark ? 'rgba(224, 90, 85, 0.45)' : 'rgba(176, 68, 63, 0.35)',
    ],
  });

  // Texture opacity based on card type
  // Hero cards: more visible texture
  // Standard cards: subtle texture
  // Weak wash: very faint texture
  const textureOpacity = heroGlow ? 0.06 : weakWash ? 0.02 : 0.04;
  const textureColor = isDark ? colors.accent : colors.accent;

  // Common inner container styles
  const innerContainerStyle = [
    styles.innerContainer,
    {
      borderRadius: radius.card,
      backgroundColor: colors.surface,
    },
  ];

  // Wrapper component based on animated border
  const InnerContainer = animatedBorder ? Animated.View : View;
  const borderStyle = animatedBorder
    ? { borderWidth: 1.5, borderColor: animatedBorderColor }
    : { borderWidth: 1, borderColor: colors.border };

  return (
    <View style={[styles.shadowContainer, cardShadow, heroShadow, style]}>
      <InnerContainer
        style={[
          ...innerContainerStyle,
          borderStyle as any,
        ]}
      >
        {/* Subtle diagonal stripe texture */}
        {showWash && (
          <TextureStripes
            color={textureColor}
            opacity={textureOpacity}
            spacing={8}
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
  content: {
    position: 'relative',
    zIndex: 1,
  },
});
