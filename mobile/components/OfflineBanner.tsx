/**
 * OfflineBanner Component
 * Displays when the user is offline - theme-aware
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';

export const OfflineBanner: React.FC = () => {
  const { colors, isDark } = useTheme();
  const [isOffline, setIsOffline] = useState(false);
  const slideAnim = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // Only show offline if isInternetReachable is explicitly false
      // This avoids false positives in simulators where connection state might be ambiguous
      const offline = state.isInternetReachable === false;
      setIsOffline(offline);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOffline) {
      // Slide down
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
    } else {
      // Slide up
      Animated.spring(slideAnim, {
        toValue: -60,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
    }
  }, [isOffline, slideAnim]);

  // Use warning colors - yellow/amber tones
  const bannerBg = colors.warning;
  const textColor = isDark ? colors.background : '#000';

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          backgroundColor: bannerBg,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.content}>
        <Ionicons name="cloud-offline" size={18} color={textColor} />
        <Text style={[styles.text, { color: textColor }]}>
          You're offline - picks will sync when reconnected
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50, // Account for status bar
    paddingBottom: 10,
    paddingHorizontal: 16,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
