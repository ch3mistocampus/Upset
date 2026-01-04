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
import { SurfaceCard } from '../components/ui';

export default function Settings() {
  const { colors } = useTheme();
  const router = useRouter();
  const { signOut } = useAuth();
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

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This feature is coming soon. Contact support to delete your account.',
      [{ text: 'OK' }]
    );
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
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>ACCOUNT</Text>
          <SurfaceCard noPadding>
            <SettingsRow
              icon="log-out-outline"
              label="Sign Out"
              type="button"
              onPress={handleSignOut}
            />
            <SettingsRow
              icon="trash-outline"
              label="Delete Account"
              type="danger"
              subtitle="Permanently delete your account and data"
              onPress={handleDeleteAccount}
            />
          </SurfaceCard>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>PREFERENCES</Text>
          <SurfaceCard noPadding>
            <SettingsRow
              icon="shield-outline"
              label="Privacy Settings"
              type="link"
              subtitle="Control who can see your picks and stats"
              onPress={() => router.push('/settings/privacy')}
            />
            <SettingsRow
              icon="notifications-outline"
              label="Push Notifications"
              type="toggle"
              subtitle="Get notified about upcoming events"
              value={notificationsEnabled}
              onToggle={setNotificationsEnabled}
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
