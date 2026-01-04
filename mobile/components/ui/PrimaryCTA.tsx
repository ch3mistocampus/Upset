/**
 * PrimaryCTA - Premium tactile primary action button
 *
 * Features:
 * - Full-width pill button with maroon gradient
 * - Subtle press animation (scale + opacity)
 * - Haptic feedback on press
 */

import React, { useRef } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import { spacing, radius, shadows } from '../../lib/tokens';

interface PrimaryCTAProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function PrimaryCTA({
  title,
  onPress,
  disabled = false,
  loading = false,
  style,
}: PrimaryCTAProps) {
  const { colors, isDark } = useTheme();
  const buttonShadow = isDark ? shadows.dark.button : shadows.light.button;

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const pressYAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    if (disabled || loading) return;

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Scale down + opacity + subtle Y shift (gradient appears to compress)
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.985,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.94,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(pressYAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    // Return to normal with ease
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(pressYAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      onPress();
    }
  };

  // Gradient colors
  const gradientColors = disabled
    ? ['#9CA3AF', '#6B7280'] as const
    : [colors.ctaGradientTop, colors.ctaGradientBottom] as const;

  return (
    <Animated.View
      style={[
        styles.shadowContainer,
        buttonShadow,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
        style,
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={styles.pressable}
      >
        <Animated.View
          style={{
            transform: [{
              translateY: pressYAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              }),
            }],
          }}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.gradient}
          >
            <Text style={styles.text}>
              {loading ? 'Loading...' : title}
            </Text>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadowContainer: {
    width: '100%',
    borderRadius: radius.button,
  },
  pressable: {
    borderRadius: radius.button,
    overflow: 'hidden',
  },
  gradient: {
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
