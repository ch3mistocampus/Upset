/**
 * Toast Notification Component
 * Premium floating pill design matching app theme
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';
import { radius, spacing, typography } from '../lib/tokens';

export type ToastType = 'success' | 'error' | 'info' | 'neutral';

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  onDismiss: (id: string) => void;
  index: number;
}

const TOAST_CONFIG = {
  success: {
    icon: 'checkmark' as const,
    lightBg: 'rgba(31, 122, 61, 0.12)',
    darkBg: 'rgba(52, 211, 153, 0.15)',
    lightColor: '#1F7A3D',
    darkColor: '#34D399',
  },
  error: {
    icon: 'close' as const,
    lightBg: 'rgba(176, 68, 63, 0.12)',
    darkBg: 'rgba(224, 90, 85, 0.15)',
    lightColor: '#B0443F',
    darkColor: '#E05A55',
  },
  info: {
    icon: 'information' as const,
    lightBg: 'rgba(6, 182, 212, 0.12)',
    darkBg: 'rgba(6, 182, 212, 0.15)',
    lightColor: '#0891B2',
    darkColor: '#22D3EE',
  },
  neutral: {
    icon: 'checkmark' as const,
    lightBg: 'rgba(176, 68, 63, 0.08)',
    darkBg: 'rgba(224, 90, 85, 0.10)',
    lightColor: '#B0443F',
    darkColor: '#E05A55',
  },
};

export const Toast: React.FC<ToastProps> = ({ id, type, message, onDismiss, index }) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  const config = TOAST_CONFIG[type];
  const iconColor = isDark ? config.darkColor : config.lightColor;
  const pillBg = isDark ? config.darkBg : config.lightBg;

  const handleDismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 80,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(id);
    });
  }, [id, onDismiss, translateY, opacity, scale]);

  // Haptic feedback on mount
  useEffect(() => {
    if (type === 'error') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (type === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [type]);

  // Entrance animation and auto-dismiss
  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 120,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 150,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      handleDismiss();
    }, 2800);

    return () => clearTimeout(timer);
  }, [handleDismiss, translateY, opacity, scale]);

  // Position above tab bar (80px) + stacking for multiple toasts
  const bottomPosition = Math.max(insets.bottom, 16) + 90 + (index * 60);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }, { scale }],
          opacity,
          bottom: bottomPosition,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={handleDismiss}
        style={styles.touchable}
      >
        {/* Glassmorphism background */}
        <BlurView
          intensity={isDark ? 40 : 60}
          tint={isDark ? 'dark' : 'light'}
          style={styles.blurContainer}
        >
          <View
            style={[
              styles.toast,
              {
                backgroundColor: isDark
                  ? 'rgba(18, 21, 27, 0.85)'
                  : 'rgba(255, 255, 255, 0.9)',
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(0, 0, 0, 0.06)',
              },
            ]}
          >
            {/* Icon pill */}
            <View style={[styles.iconPill, { backgroundColor: pillBg }]}>
              <Ionicons name={config.icon} size={16} color={iconColor} />
            </View>

            {/* Message */}
            <Text
              style={[styles.message, { color: colors.text }]}
              numberOfLines={1}
            >
              {message}
            </Text>
          </View>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  touchable: {
    maxWidth: 340,
  },
  blurContainer: {
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.md + 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    gap: spacing.sm,
    // Subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.2,
  },
});
