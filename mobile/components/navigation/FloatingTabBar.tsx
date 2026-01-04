/**
 * FloatingTabBar - Premium floating pill-shaped tab bar
 *
 * Features:
 * - Solid background with soft shadow
 * - Floating 24px from bottom
 * - Pill shape with 24px radius
 * - Haptic feedback on tab press
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Text,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../../lib/theme';
import { useFriends } from '../../hooks/useFriends';
import { useAuth } from '../../hooks/useAuth';

// Tab configuration with outline (inactive) and filled (active) icons
const TAB_CONFIG: Record<string, {
  icon: keyof typeof Ionicons.glyphMap;
  iconOutline: keyof typeof Ionicons.glyphMap;
  label: string
}> = {
  home: { icon: 'home', iconOutline: 'home-outline', label: 'Home' },
  pick: { icon: 'clipboard', iconOutline: 'clipboard-outline', label: 'Picks' },
  friends: { icon: 'people', iconOutline: 'people-outline', label: 'Friends' },
  leaderboards: { icon: 'trophy', iconOutline: 'trophy-outline', label: 'Ranks' },
  profile: { icon: 'person', iconOutline: 'person-outline', label: 'Profile' },
};

// Animated tab button with bounce effect
function TabButton({
  isFocused,
  iconName,
  label,
  showGuestDot,
  showBadge,
  pendingCount,
  colors,
  onPress,
  onLongPress,
}: {
  isFocused: boolean;
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  showGuestDot: boolean;
  showBadge: boolean;
  pendingCount: number;
  colors: any;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const wasFocused = useRef(isFocused);

  useEffect(() => {
    // Only animate when becoming focused (not on initial render or unfocus)
    if (isFocused && !wasFocused.current) {
      // Bounce up and scale animation
      Animated.parallel([
        Animated.sequence([
          // Quick scale up
          Animated.spring(scaleAnim, {
            toValue: 1.2,
            tension: 400,
            friction: 8,
            useNativeDriver: true,
          }),
          // Settle back
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 200,
            friction: 12,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          // Quick bounce up
          Animated.spring(translateYAnim, {
            toValue: -4,
            tension: 400,
            friction: 8,
            useNativeDriver: true,
          }),
          // Settle back
          Animated.spring(translateYAnim, {
            toValue: 0,
            tension: 200,
            friction: 12,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
    wasFocused.current = isFocused;
  }, [isFocused, scaleAnim, translateYAnim]);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabButton}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
    >
      <Animated.View
        style={[
          styles.tabContent,
          {
            transform: [
              { scale: scaleAnim },
              { translateY: translateYAnim },
            ],
          },
        ]}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name={iconName}
            size={22}
            color={isFocused ? colors.tabActive : colors.tabInactive}
          />
          {showGuestDot && (
            <View style={[styles.guestDot, { backgroundColor: colors.accent }]} />
          )}
          {showBadge && (
            <View style={[styles.badge, { backgroundColor: colors.accent }]}>
              <Text style={styles.badgeText}>
                {pendingCount > 9 ? '9+' : pendingCount}
              </Text>
            </View>
          )}
        </View>
        <Text
          style={[
            styles.tabLabel,
            { color: isFocused ? colors.tabActive : colors.tabInactive },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { friendRequests } = useFriends();
  const { isGuest } = useAuth();
  const pendingCount = friendRequests?.length || 0;

  return (
    <View style={[styles.container, { bottom: Math.max(insets.bottom, 16) + 8 }]}>
      {/* Solid background tab bar */}
      <View
        style={[
          styles.tabBarContainer,
          {
            backgroundColor: isDark ? '#1A1F27' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          },
        ]}
      >
        {/* Tab buttons */}
        <View style={styles.tabsRow}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const config = TAB_CONFIG[route.name] || { icon: 'ellipse', iconOutline: 'ellipse-outline', label: route.name };

            // Handle profile tab guest state
            const isProfileTab = route.name === 'profile';
            const showGuestDot = isProfileTab && isGuest;
            // Use filled icon when focused, outline when not
            const iconName = (isFocused ? config.icon : config.iconOutline) as keyof typeof Ionicons.glyphMap;
            const label = isProfileTab && isGuest ? 'Guest' : config.label;

            // Handle friends badge
            const showBadge = route.name === 'friends' && pendingCount > 0;

            const handlePress = () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const handleLongPress = () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <TabButton
                key={route.key}
                isFocused={isFocused}
                iconName={iconName}
                label={label}
                showGuestDot={showGuestDot}
                showBadge={showBadge}
                pendingCount={pendingCount}
                colors={colors}
                onPress={handlePress}
                onLongPress={handleLongPress}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  tabBarContainer: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 64,
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconContainer: {
    position: 'relative',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  guestDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
