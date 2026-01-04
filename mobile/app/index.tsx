/**
 * Entry point - routes to auth, welcome, or main app
 * Supports guest mode for progressive authentication
 */

import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../lib/theme';

export default function Index() {
  const { colors } = useTheme();
  const { user, profile, loading, isGuest, isFirstLaunch } = useAuth();

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // Guest mode - go straight to main app
  if (isGuest) {
    return <Redirect href="/(tabs)/home" />;
  }

  // Authenticated with profile - go to main app
  if (user && profile) {
    return <Redirect href="/(tabs)/home" />;
  }

  // Authenticated but no profile - create username
  if (user && !profile) {
    return <Redirect href="/(auth)/create-username" />;
  }

  // First launch - show welcome screen with guest/sign-in options
  if (isFirstLaunch) {
    return <Redirect href="/(auth)/welcome" />;
  }

  // Returning user without session - go to sign-in
  return <Redirect href="/(auth)/sign-in" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
