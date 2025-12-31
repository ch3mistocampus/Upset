/**
 * Settings screen - app configuration and account management
 */

import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import * as Linking from 'expo-linking';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { SettingsRow } from '../components/SettingsRow';

export default function Settings() {
  const router = useRouter();
  const { signOut } = useAuth();
  const toast = useToast();

  // Settings state (these would be persisted in a real app)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

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
    <ScrollView style={styles.container}>
      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.sectionContent}>
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
        </View>
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.sectionContent}>
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
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.sectionContent}>
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
        </View>
      </View>

      {/* App Version */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>UFC Picks Tracker</Text>
        <Text style={styles.versionNumber}>Version 1.0.0</Text>
        <Text style={styles.versionSubtext}>Built with React Native & Expo</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  section: {
    marginTop: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    letterSpacing: 1,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionContent: {
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#2a2a2a',
    overflow: 'hidden',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  versionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  versionNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  versionSubtext: {
    fontSize: 11,
    color: '#444',
  },
});
