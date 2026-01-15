/**
 * Settings screen - app configuration and account management
 * Theme-aware design with SurfaceCard
 */

import { View, Text, StyleSheet, ScrollView, Alert, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useTheme } from '../lib/theme';
import { spacing, radius, typography, displayTypography } from '../lib/tokens';
import * as Sentry from '@sentry/react-native';
import { SettingsRow } from '../components/SettingsRow';
import { SurfaceCard, SegmentedControl } from '../components/ui';
import { GlobalTabBar } from '../components/navigation/GlobalTabBar';
import type { ThemeMode } from '../lib/tokens';

export default function Settings() {
  const { colors, themeMode, setThemeMode } = useTheme();
  const router = useRouter();
  const { signOut, user, isGuest, resetForTesting } = useAuth();
  const toast = useToast();

  // Settings state (these would be persisted in a real app)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateAnim]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.showSuccess('Signed out successfully');
      router.replace('/(auth)/sign-in');
    } catch (error: any) {
      toast.showError('Failed to sign out');
    }
  };

  const handleResetApp = () => {
    Alert.alert(
      'Reset App',
      'This will sign you out and show the onboarding screens again. Use this for testing.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetForTesting();
              router.replace('/');
            } catch (error: any) {
              toast.showError('Failed to reset app');
            }
          },
        },
      ]
    );
  };

  const handleAccountSettings = () => {
    router.push('/settings/account');
  };

  const openLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        toast.showError('Unable to open link');
      }
    } catch (error) {
      toast.showError('Failed to open link');
    }
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: translateAnim }],
        }}
      >
        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>APPEARANCE</Text>
          <SurfaceCard>
            <Text style={[styles.themeLabel, { color: colors.textSecondary }]}>Theme</Text>
            <SegmentedControl<ThemeMode>
              options={[
                { value: 'system', label: 'System' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
              selectedValue={themeMode}
              onChange={setThemeMode}
            />
          </SurfaceCard>
        </View>

        {/* Guest Mode - Create Account */}
        {isGuest && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>ACCOUNT</Text>
            <SurfaceCard noPadding>
              <SettingsRow
                icon="person-add-outline"
                label="Create Account"
                type="link"
                subtitle="Sign up to save picks and join the community"
                onPress={() => router.push('/(auth)/sign-in')}
              />
            </SurfaceCard>
          </View>
        )}

        {/* Account Section - Authenticated users only */}
        {!isGuest && user && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>ACCOUNT</Text>
            <SurfaceCard noPadding>
              <SettingsRow
                icon="eye-outline"
                label="View Public Profile"
                type="link"
                onPress={() => router.push(`/user/${user?.id}`)}
              />
              <SettingsRow
                icon="person-outline"
                label="Account Settings"
                type="link"
                subtitle="Manage your account and data"
                onPress={handleAccountSettings}
              />
            </SurfaceCard>
          </View>
        )}

        {/* Content Section - Authenticated users only */}
        {!isGuest && user && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>CONTENT</Text>
            <SurfaceCard noPadding>
              <SettingsRow
                icon="chatbubble-ellipses-outline"
                label="Post Activity"
                type="link"
                subtitle="Comments and replies on your posts"
                onPress={() => router.push('/post/notifications')}
              />
            </SurfaceCard>
          </View>
        )}

        {/* Privacy & Notifications Section - Authenticated users only */}
        {!isGuest && user && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>PRIVACY & NOTIFICATIONS</Text>
            <SurfaceCard noPadding>
              <SettingsRow
                icon="notifications-outline"
                label="Push Notifications"
                type="link"
                subtitle="Configure notification preferences"
                onPress={() => router.push('/settings/notifications')}
              />
              <SettingsRow
                icon="shield-outline"
                label="Privacy Settings"
                type="link"
                subtitle="Control who can see your picks and stats"
                onPress={() => router.push('/settings/privacy')}
              />
            </SurfaceCard>
          </View>
        )}

        {/* Sign Out Section - Authenticated users only */}
        {!isGuest && user && (
          <View style={styles.section}>
            <SurfaceCard noPadding>
              <SettingsRow
                icon="log-out-outline"
                label="Sign Out"
                type="button"
                onPress={handleSignOut}
              />
            </SurfaceCard>
          </View>
        )}

        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>ABOUT</Text>
          <SurfaceCard noPadding>
            <SettingsRow
              icon="shield-checkmark-outline"
              label="Privacy Policy"
              type="link"
              onPress={() => openLink('https://getupset.app/privacy')}
            />
            <SettingsRow
              icon="document-text-outline"
              label="Terms of Service"
              type="link"
              onPress={() => openLink('https://getupset.app/terms')}
            />
            <SettingsRow
              icon="logo-github"
              label="View on GitHub"
              type="link"
              subtitle="Open source on GitHub"
              onPress={() => openLink('https://github.com/ch3mistocampus/Upset')}
            />
          </SurfaceCard>
        </View>

        {/* Developer Section */}
        {__DEV__ && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>DEVELOPER</Text>
            <SurfaceCard noPadding>
              <SettingsRow
                icon="refresh-outline"
                label="Reset App (Testing)"
                type="button"
                subtitle="Clears data and shows onboarding"
                onPress={handleResetApp}
              />
              <SettingsRow
                icon="bug-outline"
                label="Test Sentry"
                type="button"
                subtitle="Send a test error to Sentry"
                onPress={() => {
                  console.log('[Test] Sending test to Sentry...');
                  Sentry.captureMessage('Test message from Upset app');
                  Sentry.captureException(new Error('Test error from Upset Settings'));
                  console.log('[Test] Sent! Check Sentry dashboard.');
                  toast.showSuccess('Test sent to Sentry - check dashboard');
                }}
              />
            </SurfaceCard>
          </View>
        )}

        {/* App Version & Disclaimer */}
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: colors.text }]}>Upset</Text>
          <Text style={[styles.versionNumber, { color: colors.textTertiary }]}>Version 1.0.0</Text>
          <Text style={[styles.versionSubtext, { color: colors.textMuted }]}>Built with React Native & Expo</Text>
          <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
            Fight schedules, matchups, and statistics are compiled from publicly available sources and maintained in our own database. This app is not affiliated with or endorsed by the UFC or any other promotion.
          </Text>
        </View>
      </Animated.View>
      </ScrollView>
      <GlobalTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: 100,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionLabel: {
    fontFamily: 'BebasNeue',
    fontSize: 14,
    letterSpacing: 1,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  themeLabel: {
    fontFamily: 'BebasNeue',
    fontSize: 14,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  versionText: {
    fontFamily: 'BebasNeue',
    fontSize: 20,
    marginBottom: 4,
  },
  versionNumber: {
    ...typography.meta,
    marginBottom: spacing.xs,
  },
  versionSubtext: {
    fontSize: 11,
  },
  disclaimer: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
});
