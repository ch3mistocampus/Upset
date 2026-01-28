/**
 * Admin Layout
 *
 * Protected layout for admin-only screens.
 * Redirects non-admin users to home.
 */

import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../../lib/theme';
import { useIsAdmin } from '../../hooks/useAdmin';
import { useAuth } from '../../hooks/useAuth';

export default function AdminLayout() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();

  useEffect(() => {
    // Redirect if not authenticated
    if (!authLoading && !user) {
      router.replace('/');
      return;
    }

    // Redirect if not admin (after loading)
    if (!adminLoading && isAdmin === false) {
      router.replace('/');
    }
  }, [authLoading, adminLoading, user, isAdmin, router]);

  // Show loading while checking auth/admin status
  if (authLoading || adminLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Verifying access...
        </Text>
      </View>
    );
  }

  // Don't render if not admin
  if (!isAdmin) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Admin Dashboard',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="reports"
        options={{
          title: 'Reports',
          headerBackTitle: 'Dashboard',
        }}
      />
      <Stack.Screen
        name="scorecards"
        options={{
          title: 'Live Scorecards',
          headerBackTitle: 'Dashboard',
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
  },
});
