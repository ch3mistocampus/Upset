/**
 * AppDrawer - X-style sidebar navigation drawer
 * Slides in from left edge with profile header and navigation items
 * Uses PanResponder + Reanimated for smooth gestures in Expo Go
 */

import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  ScrollView,
  PanResponder,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import { useAuth } from '../../hooks/useAuth';
import { useDrawer } from '../../lib/DrawerContext';
import { useUserStats } from '../../hooks/useQueries';
import { spacing, radius } from '../../lib/tokens';
import type { ThemeMode } from '../../lib/tokens';
import { MmaGloveIcon } from '../icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.8;
const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 0.5;
const EDGE_WIDTH = 25;

// Spring config for smooth X-like animations
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.5,
  overshootClamping: false,
};

interface NavItem {
  icon?: keyof typeof Ionicons.glyphMap;
  customIcon?: 'mma-glove';
  label: string;
  route: string;
  requiresAuth?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { icon: 'person-outline', label: 'Profile', route: '/user/', requiresAuth: true },
  { customIcon: 'mma-glove', label: 'Fighters', route: '/fighters', requiresAuth: false },
  { icon: 'settings-outline', label: 'Settings', route: '/settings', requiresAuth: false },
];

export function AppDrawer() {
  const { colors, themeMode, setThemeMode } = useTheme();
  const { isOpen, isEnabled, closeDrawer, openDrawer, setEnabled } = useDrawer();
  const { user, profile, isGuest, signOut } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { data: stats } = useUserStats(user?.id || null);

  // Determine if we're on a top-level tab screen where drawer swipe should be enabled
  // Top-level screens are: (tabs)/home, (tabs)/pick, (tabs)/discover, (tabs)/leaderboards, etc.
  // Deeper screens like event/[id], fighter/[id], settings/*, etc. should allow swipe-back instead
  const isTopLevelScreen = useMemo(() => {
    // Check if first segment is "(tabs)" - this means we're on a main tab screen
    // Also allow drawer on index (splash/redirect) and auth screens
    const firstSegment = segments[0];
    return firstSegment === '(tabs)' || firstSegment === 'index' || firstSegment === undefined;
  }, [segments]);

  // Update drawer enabled state based on navigation
  useEffect(() => {
    setEnabled(isTopLevelScreen);
  }, [isTopLevelScreen, setEnabled]);

  // Shared value for smooth UI-thread animations
  const translateX = useSharedValue(-DRAWER_WIDTH);

  // Track if currently dragging to prevent state conflicts
  const isDragging = useRef(false);
  const startX = useRef(0);

  // Sync with React state when isOpen changes programmatically
  useEffect(() => {
    if (!isDragging.current) {
      translateX.value = withSpring(isOpen ? 0 : -DRAWER_WIDTH, SPRING_CONFIG);
    }
  }, [isOpen, translateX]);

  // Helper to update shared value directly (called from gesture handlers)
  const updateTranslateX = useCallback((value: number) => {
    'worklet';
    translateX.value = value;
  }, [translateX]);

  const animateOpen = useCallback(() => {
    translateX.value = withSpring(0, SPRING_CONFIG);
  }, [translateX]);

  const animateClose = useCallback(() => {
    translateX.value = withSpring(-DRAWER_WIDTH, SPRING_CONFIG);
  }, [translateX]);

  // Edge swipe PanResponder (for opening)
  const edgePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dx > 5 && Math.abs(gestureState.dy) < 30;
      },
      onPanResponderGrant: () => {
        isDragging.current = true;
        startX.current = -DRAWER_WIDTH;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (_, gestureState) => {
        const newX = Math.max(-DRAWER_WIDTH, Math.min(0, startX.current + gestureState.dx));
        translateX.value = newX;
      },
      onPanResponderRelease: (_, gestureState) => {
        isDragging.current = false;
        const shouldOpen =
          gestureState.dx > SWIPE_THRESHOLD ||
          gestureState.vx > VELOCITY_THRESHOLD;

        if (shouldOpen) {
          animateOpen();
          openDrawer();
        } else {
          animateClose();
        }
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
        animateClose();
      },
    })
  ).current;

  // Drawer PanResponder (for closing when open)
  const drawerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dx < -10 && Math.abs(gestureState.dy) < 30;
      },
      onPanResponderGrant: () => {
        isDragging.current = true;
        startX.current = 0;
      },
      onPanResponderMove: (_, gestureState) => {
        const newX = Math.max(-DRAWER_WIDTH, Math.min(0, startX.current + gestureState.dx));
        translateX.value = newX;
      },
      onPanResponderRelease: (_, gestureState) => {
        isDragging.current = false;
        const shouldClose =
          gestureState.dx < -SWIPE_THRESHOLD ||
          gestureState.vx < -VELOCITY_THRESHOLD;

        if (shouldClose) {
          animateClose();
          closeDrawer();
        } else {
          animateOpen();
        }
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
        animateOpen();
      },
    })
  ).current;

  // Animated styles running on UI thread
  const drawerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-DRAWER_WIDTH, 0],
      [0, 0.5],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const handleNavigation = (item: NavItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Start closing animation immediately
    animateClose();

    // Close drawer state and navigate after animation starts
    setTimeout(() => {
      closeDrawer();

      // Navigate after drawer is mostly closed
      setTimeout(() => {
        if (item.route === '/user/' && user?.id) {
          router.push(`/user/${user.id}`);
        } else if (!item.requiresAuth || !isGuest) {
          router.push(item.route as any);
        } else {
          router.push('/(auth)/sign-in');
        }
      }, 150);
    }, 100);
  };

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    animateClose();
    setTimeout(() => {
      closeDrawer();
      setTimeout(async () => {
        await signOut();
        router.replace('/(auth)/sign-in');
      }, 150);
    }, 100);
  };

  const handleSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateClose();
    setTimeout(() => {
      closeDrawer();
      setTimeout(() => {
        router.push('/(auth)/sign-in');
      }, 150);
    }, 100);
  };

  const cycleTheme = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const modes: ThemeMode[] = ['system', 'light', 'dark'];
    const currentIndex = modes.indexOf(themeMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setThemeMode(modes[nextIndex]);
  };

  const getThemeIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (themeMode) {
      case 'light':
        return 'sunny';
      case 'dark':
        return 'moon';
      default:
        return 'contrast-outline';
    }
  };

  const getThemeLabel = (): string => {
    switch (themeMode) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      default:
        return 'Auto';
    }
  };

  const handleBackdropPress = useCallback(() => {
    closeDrawer();
  }, [closeDrawer]);

  const accuracy = stats?.accuracy_pct || 0;
  const totalPicks = stats?.total_picks || 0;

  return (
    <>
      {/* Edge swipe zone - only visible on top-level screens for opening */}
      {!isOpen && isEnabled && (
        <View
          style={styles.edgeSwipeZone}
          {...edgePanResponder.panHandlers}
        />
      )}

      {/* Backdrop - always rendered but opacity controlled by animation */}
      <Animated.View
        style={[styles.backdrop, backdropAnimatedStyle]}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleBackdropPress}
        />
      </Animated.View>

      {/* Drawer Content */}
      <Animated.View
        style={[
          styles.drawer,
          {
            backgroundColor: colors.surface,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
          drawerAnimatedStyle,
        ]}
        {...drawerPanResponder.panHandlers}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Header */}
          {isGuest ? (
            <View style={styles.guestHeader}>
              <View style={[styles.guestAvatar, { backgroundColor: colors.accent + '20' }]}>
                <Ionicons name="person-outline" size={32} color={colors.accent} />
              </View>
              <Text style={[styles.guestTitle, { color: colors.text }]}>Guest Mode</Text>
              <Text style={[styles.guestSubtitle, { color: colors.textSecondary }]}>
                Sign in to save your picks
              </Text>
              <TouchableOpacity
                style={[styles.signInButton, { backgroundColor: colors.accent }]}
                onPress={handleSignIn}
                activeOpacity={0.8}
              >
                <Text style={styles.signInText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.profileHeader}
              onPress={() => handleNavigation({ icon: 'person-outline', label: 'Profile', route: '/user/', requiresAuth: true })}
              activeOpacity={0.8}
            >
              {/* Avatar */}
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={[styles.avatar, { backgroundColor: colors.accent }]}
                />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
                  <Text style={styles.avatarText}>
                    {profile?.username?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
              )}

              {/* User Info */}
              <View style={styles.userInfo}>
                <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>
                  {profile?.username || 'Unknown'}
                </Text>
                <Text style={[styles.username, { color: colors.textSecondary }]} numberOfLines={1}>
                  @{profile?.username || 'unknown'}
                </Text>
              </View>

              {/* Stats Summary */}
              <View style={styles.statsSummary}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.accent }]}>
                    {accuracy.toFixed(1)}%
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Accuracy</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{totalPicks}</Text>
                  <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Picks</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Navigation Items */}
          <View style={styles.navSection}>
            {NAV_ITEMS.map((item) => {
              if (item.requiresAuth && isGuest) return null;

              return (
                <TouchableOpacity
                  key={item.route}
                  style={styles.navItem}
                  onPress={() => handleNavigation(item)}
                  activeOpacity={0.7}
                >
                  {item.customIcon === 'mma-glove' ? (
                    <MmaGloveIcon size={24} color={colors.text} />
                  ) : (
                    <Ionicons name={item.icon!} size={24} color={colors.text} />
                  )}
                  <Text style={[styles.navLabel, { color: colors.text }]}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              );
            })}

            {/* Theme Toggle Row */}
            <TouchableOpacity
              style={styles.navItem}
              onPress={cycleTheme}
              activeOpacity={0.7}
            >
              <Ionicons name={getThemeIcon()} size={24} color={colors.text} />
              <Text style={[styles.navLabel, { color: colors.text }]}>Appearance</Text>
              <Text style={[styles.themeValue, { color: colors.textTertiary }]}>{getThemeLabel()}</Text>
            </TouchableOpacity>
          </View>

          {/* Sign Out (only for authenticated users) */}
          {!isGuest && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <TouchableOpacity
                style={styles.signOutButton}
                onPress={handleSignOut}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={24} color={colors.danger} />
                <Text style={[styles.signOutText, { color: colors.danger }]}>Sign Out</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        {/* App Version */}
        <View style={styles.footer}>
          <Text style={[styles.versionText, { color: colors.textTertiary }]}>
            Upset v1.0.0
          </Text>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  edgeSwipeZone: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: EDGE_WIDTH,
    zIndex: 999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 1000,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    zIndex: 1001,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },

  // Guest Header
  guestHeader: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  guestAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  guestSubtitle: {
    fontSize: 14,
    marginBottom: spacing.md,
  },
  signInButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.button,
  },
  signInText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  // Profile Header
  profileHeader: {
    paddingVertical: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
  },
  userInfo: {
    marginBottom: spacing.md,
  },
  displayName: {
    fontSize: 18,
    fontWeight: '700',
  },
  username: {
    fontSize: 14,
    marginTop: 2,
  },
  statsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    marginHorizontal: spacing.md,
  },

  // Divider
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },

  // Navigation
  navSection: {
    gap: spacing.xs,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  navLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  themeValue: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Sign Out
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Footer
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
  },
});
