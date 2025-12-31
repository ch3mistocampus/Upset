/**
 * Toast Notification Component
 * Bold, UFC-inspired alert system with aggressive animations
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../lib/theme';
import { radius, spacing } from '../lib/tokens';

const { width } = Dimensions.get('window');

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  onDismiss: (id: string) => void;
  index: number;
}

const TOAST_CONFIG = {
  success: {
    icon: 'checkmark-circle' as const,
    color: '#22c55e',
    bgGradient: 'rgba(34, 197, 94, 0.15)',
  },
  error: {
    icon: 'close-circle' as const,
    color: '#ef4444',
    bgGradient: 'rgba(239, 68, 68, 0.15)',
  },
  info: {
    icon: 'information-circle' as const,
    color: '#06b6d4',
    bgGradient: 'rgba(6, 182, 212, 0.15)',
  },
};

export const Toast: React.FC<ToastProps> = ({ id, type, message, onDismiss, index }) => {
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  const config = TOAST_CONFIG[type];

  useEffect(() => {
    // Haptic feedback based on toast type
    if (type === 'error') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (type === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Aggressive slam-in animation
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 100,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss with exit animation
    const timer = setTimeout(() => {
      handleDismiss();
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(id);
    });
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }, { scale }],
          opacity,
          top: Platform.OS === 'ios' ? 60 + index * 85 : 20 + index * 85,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleDismiss}
        style={styles.touchable}
      >
        <View style={[styles.toast, { backgroundColor: colors.surface, borderLeftColor: config.color, borderColor: colors.border }]}>
          {/* Accent glow effect */}
          <View
            style={[
              styles.glowOverlay,
              { backgroundColor: config.bgGradient },
            ]}
          />

          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: config.color }]}>
            <Ionicons name={config.icon} size={22} color="#fff" />
          </View>

          {/* Message */}
          <Text style={[styles.message, { color: colors.text }]} numberOfLines={2}>
            {message}
          </Text>

          {/* Close button */}
          <TouchableOpacity
            onPress={handleDismiss}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  touchable: {
    width: '100%',
  },
  toast: {
    borderRadius: radius.sm, // Sharp, not soft
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  glowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 2, // Angular, UFC-inspired
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    zIndex: 1,
  },
  message: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
    lineHeight: 20,
    zIndex: 1,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
    zIndex: 1,
  },
});
