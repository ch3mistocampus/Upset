/**
 * Entry point - routes to auth or main app
 */

import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';

export default function Index() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Not logged in -> go to sign in
      router.replace('/(auth)/sign-in');
    } else if (!profile) {
      // Logged in but no profile -> create username
      router.replace('/(auth)/create-username');
    } else {
      // Fully authenticated -> go to main app
      router.replace('/(tabs)/home');
    }
  }, [user, profile, loading]);

  // Show loading spinner while checking auth
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#d4202a" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
