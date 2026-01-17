/**
 * Set new password screen
 * Shown after user clicks password reset link from email
 */

import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { logger } from '../../lib/logger';
import { validatePassword, getAuthErrorMessage } from '../../lib/validation';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { SurfaceCard, PrimaryCTA } from '../../components/ui';

export default function SetNewPassword() {
  const { colors } = useTheme();
  const { updatePassword, clearPasswordRecovery } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  const handleSetPassword = async () => {
    const passwordError = validatePassword(password);
    if (passwordError) {
      toast.showError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      toast.showError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      clearPasswordRecovery();
      logger.info('Password reset completed successfully');
      toast.showSuccess('Password updated successfully!');
      router.replace('/(tabs)');
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error);
      toast.showError(errorMessage);
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
            <View style={styles.iconContainer}>
              <Ionicons name="lock-closed-outline" size={48} color={colors.accent} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              Set New Password
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enter your new password below
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="New password"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                editable={!loading}
              />
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.textTertiary}
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              />
            </View>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Confirm new password"
              placeholderTextColor={colors.textTertiary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="new-password"
              editable={!loading}
            />

            <Text style={[styles.hint, { color: colors.textTertiary }]}>
              Password must be at least 8 characters
            </Text>

            <PrimaryCTA
              title="Update Password"
              onPress={handleSetPassword}
              loading={loading}
              disabled={loading || !password || !confirmPassword}
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
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
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
    lineHeight: 22,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.input,
    padding: spacing.md,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  eyeIcon: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
  },
  hint: {
    ...typography.meta,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});
