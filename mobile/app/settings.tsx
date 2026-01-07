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
import { spacing, radius, typography } from '../lib/tokens';
import { SettingsRow } from '../components/SettingsRow';
import { SurfaceCard, SegmentedControl } from '../components/ui';
import type { ThemeMode } from '../lib/tokens';

export default function Settings() {
  const { colors, themeMode, setThemeMode } = useTheme();
  const router = useRouter();
  const { signOut, user } = useAuth();
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
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
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

        {/* Account Section */}
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

        {/* Content Section */}
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

        {/* Privacy & Notifications Section */}
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

        {/* Sign Out Section */}
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

        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>ABOUT</Text>
          <SurfaceCard noPadding>
            <SettingsRow
              icon="shield-checkmark-outline"
              label="Privacy Policy"
              type="link"
              onPress={() => openLink('https://github.com/ch3mistocampus/Upset')}
            />
            <SettingsRow
              icon="document-text-outline"
              label="Terms of Service"
              type="link"
              onPress={() => openLink('https://github.com/ch3mistocampus/Upset')}
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

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: colors.text }]}>UFC Picks Tracker</Text>
          <Text style={[styles.versionNumber, { color: colors.textTertiary }]}>Version 1.0.0</Text>
          <Text style={[styles.versionSubtext, { color: colors.textMuted }]}>Built with React Native & Expo</Text>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    ...typography.caption,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  themeLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  versionText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  versionNumber: {
    ...typography.meta,
    marginBottom: spacing.xs,
  },
  versionSubtext: {
    fontSize: 11,
  },
});
