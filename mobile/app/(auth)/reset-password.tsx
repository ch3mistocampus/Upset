/**
 * Password reset screen
 * Sends password reset email to user - theme-aware design
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
import { validateEmail, getAuthErrorMessage } from '../../lib/validation';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { SurfaceCard, PrimaryCTA, Button } from '../../components/ui';

export default function ResetPassword() {
  const { colors } = useTheme();
  const { resetPassword } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

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

  const handleResetPassword = async () => {
    const emailError = validateEmail(email);
    if (emailError) {
      toast.showError(emailError);
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
      toast.showSuccess('Password reset email sent!');
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error);
      toast.showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: translateAnim }],
            }}
          >
            <SurfaceCard heroGlow animatedBorder>
              <View style={styles.iconContainer}>
                <Ionicons name="mail-outline" size={48} color={colors.accent} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>
                Check Your Email
              </Text>
              <Text style={[styles.message, { color: colors.textSecondary }]}>
                We've sent password reset instructions to:
              </Text>
              <Text style={[styles.email, { color: colors.text }]}>{email}</Text>
              <Text style={[styles.hint, { color: colors.textTertiary }]}>
                Click the link in the email to reset your password. The link will expire in 1 hour.
              </Text>

              <PrimaryCTA
                title="Back to Sign In"
                onPress={() => router.push('/(auth)/sign-in')}
              />

              <Button
                title="Didn't receive it? Try again"
                onPress={() => setSent(false)}
                variant="ghost"
                style={{ marginTop: spacing.sm }}
              />
            </SurfaceCard>
          </Animated.View>
        </View>
      </View>
    );
  }

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
          <SurfaceCard>
            <Text style={[styles.title, { color: colors.text }]}>
              Reset Password
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enter your email and we'll send you instructions to reset your password
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
              placeholder="Email"
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!loading}
            />

            <PrimaryCTA
              title="Send Reset Link"
              onPress={handleResetPassword}
              loading={loading}
              disabled={loading}
            />

            <Button
              title="Back to Sign In"
              onPress={() => router.back()}
              variant="ghost"
              disabled={loading}
              style={{ marginTop: spacing.sm }}
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
  message: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  email: {
    ...typography.body,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  hint: {
    ...typography.meta,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.input,
    padding: spacing.md,
    fontSize: 16,
    marginBottom: spacing.md,
  },
});
