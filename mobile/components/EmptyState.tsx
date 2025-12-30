/**
 * EmptyState Component
 * Refined empty/no-data states with optional actions
 * UFC-inspired but calm and informative (not alarming)
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Gentle fade and slide in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Icon - large but muted */}
        <View style={styles.iconContainer}>
          <View style={styles.iconBg}>
            <Ionicons name={icon} size={88} color="#444" />
          </View>
        </View>

        {/* Title - bold and clear */}
        <Text style={styles.title}>{title}</Text>

        {/* Message - helpful and conversational */}
        <Text style={styles.message}>{message}</Text>

        {/* Optional action button */}
        {actionLabel && onAction && (
          <TouchableOpacity style={styles.actionButton} onPress={onAction} activeOpacity={0.8}>
            <View style={styles.buttonInner}>
              <Ionicons name="refresh" size={18} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.actionText}>{actionLabel}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Subtle decorative elements */}
        <View style={styles.decorTop} />
        <View style={styles.decorBottom} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 32,
  },
  content: {
    alignItems: 'center',
    maxWidth: 360,
    width: '100%',
  },
  iconContainer: {
    marginBottom: 28,
  },
  iconBg: {
    width: 140,
    height: 140,
    borderRadius: 4,
    backgroundColor: 'rgba(68, 68, 68, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  message: {
    fontSize: 15,
    fontWeight: '500',
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    letterSpacing: 0.2,
  },
  actionButton: {
    backgroundColor: '#d4202a',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    minWidth: 160,
    shadowColor: '#d4202a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  actionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  decorTop: {
    position: 'absolute',
    top: -20,
    left: -20,
    width: 60,
    height: 1,
    backgroundColor: '#222',
  },
  decorBottom: {
    position: 'absolute',
    bottom: -20,
    right: -20,
    width: 60,
    height: 1,
    backgroundColor: '#222',
  },
});
