/**
 * Settings screen - app configuration and account management
 * Theme-aware design with SurfaceCard
 */

import { View, Text, StyleSheet, ScrollView, Alert, Animated, Easing, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useIsAdmin } from '../../hooks/useAdmin';
import { useSubscription } from '../../hooks/useSubscription';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography, displayTypography } from '../../lib/tokens';
import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';
import { supabase } from '../../lib/supabase';
import { SettingsRow } from '../../components/SettingsRow';
import { SurfaceCard, SegmentedControl } from '../../components/ui';
import { GlobalTabBar } from '../../components/navigation/GlobalTabBar';
import type { ThemeMode } from '../../lib/tokens';

export default function Settings() {
  const { colors, themeMode, setThemeMode } = useTheme();
  const router = useRouter();
  const { signOut, user, isGuest, resetForTesting } = useAuth();
  const toast = useToast();
  const { data: isAdmin } = useIsAdmin();
  const { isPro, showPaywall, setSubscriptionStatus } = useSubscription();
  const queryClient = useQueryClient();

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
    <SafeAreaView style={[styles.wrapper, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.surface }]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

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
                icon="person-outline"
                label="Account Settings"
                type="link"
                subtitle="Manage your account and data"
                onPress={handleAccountSettings}
              />
            </SurfaceCard>
          </View>
        )}

        {/* Subscription Section */}
        {!isGuest && user && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>SUBSCRIPTION</Text>
            <SurfaceCard noPadding>
              {isPro ? (
                <>
                  <SettingsRow
                    icon="diamond-outline"
                    label="Upset Pro"
                    type="link"
                    subtitle="Active"
                    onPress={() => router.push('/settings/subscription')}
                  />
                  <SettingsRow
                    icon="card-outline"
                    label="Manage Subscription"
                    type="link"
                    onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
                  />
                </>
              ) : (
                <SettingsRow
                  icon="diamond-outline"
                  label="Upgrade to Pro"
                  type="button"
                  subtitle="Unlimited picks, posts, and more"
                  onPress={() => showPaywall('app_open', () => {})}
                />
              )}
              <SettingsRow
                icon="refresh-outline"
                label="Restore Purchases"
                type="button"
                onPress={() => {
                  // Superwall handles restore internally via paywall UI
                  showPaywall('app_open', () => {
                    toast.showSuccess('Purchases restored');
                  });
                }}
              />
            </SurfaceCard>
          </View>
        )}

        {/* Preferences Section - Authenticated users only */}
        {!isGuest && user && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>PREFERENCES</Text>
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

        {/* Admin Section - Admin users only */}
        {isAdmin && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>ADMIN</Text>
            <SurfaceCard noPadding>
              <SettingsRow
                icon="shield-outline"
                label="Admin Portal"
                type="link"
                subtitle="Manage reports, users, and content"
                onPress={() => router.push('/admin')}
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
              onPress={() => openLink('https://upsetmma.app/privacy')}
            />
            <SettingsRow
              icon="document-text-outline"
              label="Terms of Service"
              type="link"
              onPress={() => openLink('https://upsetmma.app/terms')}
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
              <SettingsRow
                icon="diamond-outline"
                label={isPro ? 'Revoke Pro (Testing)' : 'Grant Pro (Testing)'}
                type="button"
                subtitle="Toggle subscription status for testing"
                onPress={async () => {
                  if (isPro) {
                    await setSubscriptionStatus({ status: 'INACTIVE' });
                    toast.showSuccess('Pro revoked (testing)');
                  } else {
                    await setSubscriptionStatus({ status: 'ACTIVE' });
                    toast.showSuccess('Pro granted (testing)');
                  }
                }}
              />
              <SettingsRow
                icon="trash-outline"
                label="Reset Usage Counters"
                type="button"
                subtitle="Reset event/post usage to 0"
                onPress={async () => {
                  if (!user?.id) return;
                  await supabase
                    .from('usage_tracking')
                    .update({
                      events_picked_count: 0,
                      posts_created_count: 0,
                      events_picked_ids: [],
                      updated_at: new Date().toISOString(),
                    })
                    .eq('user_id', user.id);
                  queryClient.invalidateQueries({ queryKey: ['usage_tracking'] });
                  toast.showSuccess('Usage counters reset');
                }}
              />
            </SurfaceCard>
          </View>
        )}

        {/* App Version & Disclaimer */}
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: colors.text }]}>Upset</Text>
          <Text style={[styles.versionNumber, { color: colors.textTertiary }]}>Version {Constants.expoConfig?.version ?? '1.0.0'}</Text>
          <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
            Fight schedules, matchups, and statistics are compiled from publicly available sources and maintained in our own database. This app is not affiliated with or endorsed by the UFC or any other promotion.
          </Text>
        </View>
      </Animated.View>
      </ScrollView>
      <GlobalTabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'BebasNeue',
    fontSize: 24,
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 36,
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
  disclaimer: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
});
