/**
 * SubmitFooter - Sticky bottom submit button
 *
 * Design: Floating view fixed to bottom with 52px button.
 * Uses BebasNeue font and accent color background.
 * Includes spring press animation and haptic feedback.
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import { spacing, radius, shadows } from '../../lib/tokens';

interface SubmitFooterProps {
  /** Number of picks made */
  picksCount: number;
  /** Total number of bouts */
  totalBouts?: number;
  /** Submit handler */
  onSubmit: () => void;
  /** Whether button is disabled */
  disabled?: boolean;
  /** Custom label override */
  label?: string;
  /** Loading state */
  loading?: boolean;
  /** Additional bottom offset (for tab bars, etc.) */
  bottomOffset?: number;
}

export function SubmitFooter({
  picksCount,
  totalBouts,
  onSubmit,
  disabled = false,
  label,
  loading = false,
  bottomOffset = 0,
}: SubmitFooterProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!disabled && !loading) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0.98,
          useNativeDriver: true,
          tension: 300,
          friction: 10,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.9,
          duration: 80,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSubmit();
    }
  };

  // Default label shows pick count
  const buttonLabel =
    label ||
    (totalBouts
      ? `SUBMIT CARD (${picksCount}/${totalBouts} PICKS)`
      : `SUBMIT CARD (${picksCount} ${picksCount === 1 ? 'PICK' : 'PICKS'})`);

  const buttonShadow = isDark ? shadows.dark.button : shadows.light.button;

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 16) + bottomOffset,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.buttonContainer,
          buttonShadow,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: disabled ? colors.border : colors.accent,
            },
          ]}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          disabled={disabled || loading}
          activeOpacity={1}
        >
          <Text
            style={[
              styles.buttonText,
              { color: disabled ? colors.textTertiary : colors.onAccent },
            ]}
          >
            {loading ? 'SUBMITTING...' : buttonLabel}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  buttonContainer: {
    borderRadius: radius.button,
  },
  button: {
    height: 52,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  buttonText: {
    fontFamily: 'BebasNeue',
    fontSize: 18,
    letterSpacing: 0.5,
  },
});
