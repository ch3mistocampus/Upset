/**
 * Create username screen - theme-aware design
 */

import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { SurfaceCard, PrimaryCTA } from '../../components/ui';

export default function CreateUsername() {
  const { colors } = useTheme();
  const { createProfile } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleCreateProfile = async () => {
    if (!username) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    if (username.length < 3 || username.length > 30) {
      Alert.alert('Error', 'Username must be 3-30 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      Alert.alert('Error', 'Username can only contain letters, numbers, hyphens, and underscores');
      return;
    }

    setLoading(true);
    try {
      await createProfile(username);
      // Auth state change will trigger redirect in index.tsx
      router.replace('/(tabs)/home');
    } catch (error: any) {
      if (error.code === '23505') {
        Alert.alert('Error', 'Username already taken. Please choose another.');
      } else {
        Alert.alert('Error', error.message || 'Failed to create profile');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: translateAnim }],
          }}
        >
          <SurfaceCard heroGlow>
            <Text style={[styles.title, { color: colors.text }]}>
              Choose a Username
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              This will be your display name. 3-30 characters.
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Username"
              placeholderTextColor={colors.textTertiary}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              maxLength={30}
              editable={!loading}
            />

            <PrimaryCTA
              title="Continue"
              onPress={handleCreateProfile}
              loading={loading}
              disabled={loading}
            />
          </SurfaceCard>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  title: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.input,
    padding: spacing.md,
    fontSize: 16,
    marginBottom: spacing.md,
  },
});
