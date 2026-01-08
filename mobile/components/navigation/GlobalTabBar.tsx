/**
 * GlobalTabBar - Standalone floating tab bar for screens outside tabs group
 *
 * Use this component on screens like /user/[id], /fighters, /settings
 * to maintain consistent navigation with the main tab bar
 */

import React from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';

const TAB_CONFIG = [
  { name: 'home', route: '/(tabs)/home', icon: 'home', iconOutline: 'home-outline', label: 'Home' },
  { name: 'pick', route: '/(tabs)/pick', icon: 'calendar', iconOutline: 'calendar-outline', label: 'Events' },
  { name: 'discover', route: '/(tabs)/discover', icon: 'compass', iconOutline: 'compass-outline', label: 'Discover' },
  { name: 'leaderboards', route: '/(tabs)/leaderboards', icon: 'trophy', iconOutline: 'trophy-outline', label: 'Ranks' },
] as const;

export function GlobalTabBar() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  // Determine which tab is "active" based on current path
  const getActiveTab = () => {
    if (pathname.includes('/home')) return 'home';
    if (pathname.includes('/pick')) return 'pick';
    if (pathname.includes('/discover')) return 'discover';
    if (pathname.includes('/leaderboards')) return 'leaderboards';
    return null; // None active when on other screens
  };

  const activeTab = getActiveTab();

  const handlePress = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  };

  return (
    <View style={[styles.container, { bottom: Math.max(insets.bottom, 16) + 8 }]}>
      <View
        style={[
          styles.tabBarContainer,
          {
            backgroundColor: isDark ? '#1A1F27' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          },
        ]}
      >
        <View style={styles.tabsRow}>
          {TAB_CONFIG.map((tab) => {
            const isFocused = activeTab === tab.name;
            const iconName = isFocused ? tab.icon : tab.iconOutline;

            return (
              <Pressable
                key={tab.name}
                onPress={() => handlePress(tab.route)}
                style={styles.tabButton}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={tab.label}
              >
                <View style={styles.tabContent}>
                  <Ionicons
                    name={iconName}
                    size={22}
                    color={isFocused ? colors.tabActive : colors.tabInactive}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: isFocused ? colors.tabActive : colors.tabInactive },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </View>
              </Pressable>
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
    zIndex: 100,
  },
  tabBarContainer: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
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
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
});
