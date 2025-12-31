/**
 * Entry point - routes to auth or main app
 */

import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../lib/theme';

export default function Index() {
  const { colors } = useTheme();
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!profile) {
    return <Redirect href="/(auth)/create-username" />;
  }

  return <Redirect href="/(tabs)/home" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
