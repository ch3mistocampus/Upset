/**
 * Entry point - routes to auth or main app based on authentication state
 */

import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';

export default function Index() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#d4202a" />
      </View>
    );
  }

  // Not logged in - go to sign in
  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // Logged in but no profile - create username
  if (!profile) {
    return <Redirect href="/(auth)/create-username" />;
  }

  // Fully authenticated - go to main app
  return <Redirect href="/(tabs)/home" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
