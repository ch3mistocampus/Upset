/**
 * FeatureTooltip - First-time user hint overlay
 *
 * Shows a small tooltip pointing to a feature with a helpful tip.
 * Only shows once per user (tracked via onboarding state).
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { spacing, radius } from '../../lib/tokens';

interface FeatureTooltipProps {
  /** Tooltip message */
  message: string;
  /** Whether to show the tooltip */
  visible: boolean;
  /** Called when user dismisses the tooltip */
  onDismiss: () => void;
  /** Arrow position */
  arrowPosition?: 'top' | 'bottom' | 'left' | 'right';
  /** Optional style for positioning */
  style?: any;
}

export function FeatureTooltip({
  message,
  visible,
  onDismiss,
  arrowPosition = 'top',
  style,
}: FeatureTooltipProps) {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible, fadeAnim, scaleAnim]);

  if (!visible) return null;

  const arrowStyle = {
    top: styles.arrowTop,
    bottom: styles.arrowBottom,
    left: styles.arrowLeft,
    right: styles.arrowRight,
  }[arrowPosition];

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={[styles.tooltip, { backgroundColor: colors.text }]}>
        {/* Arrow */}
        <View
          style={[
            styles.arrow,
            arrowStyle,
            { borderBottomColor: colors.text },
          ]}
        />

        {/* Content */}
        <View style={styles.content}>
          <Ionicons name="bulb-outline" size={16} color={colors.background} style={styles.icon} />
          <Text style={[styles.message, { color: colors.background }]}>
            {message}
          </Text>
        </View>

        {/* Dismiss button */}
        <TouchableOpacity
          onPress={onDismiss}
          style={styles.dismissButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.dismissText, { color: colors.background }]}>Got it</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1000,
  },
  tooltip: {
    borderRadius: radius.md,
    padding: spacing.md,
    minWidth: 200,
    maxWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  arrowTop: {
    top: -8,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -8,
  },
  arrowBottom: {
    bottom: -8,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -8,
    transform: [{ rotate: '180deg' }],
  },
  arrowLeft: {
    left: -12,
    top: '50%',
    marginTop: -4,
    transform: [{ rotate: '-90deg' }],
  },
  arrowRight: {
    right: -12,
    top: '50%',
    marginTop: -4,
    transform: [{ rotate: '90deg' }],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    marginRight: spacing.xs,
    marginTop: 1,
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  dismissButton: {
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  dismissText: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
  },
});
