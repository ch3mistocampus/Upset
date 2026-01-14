/**
 * Sign up screen with email + password and OAuth options
 */

import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useTheme } from '../../lib/theme';
import { spacing, typography, displayTypography } from '../../lib/tokens';
import { Button, Input } from '../../components/ui';
import { SocialAuthButtons } from '../../components/auth';
import { validateEmail, validatePassword, getAuthErrorMessage } from '../../lib/validation';

export default function SignUp() {
  const { colors } = useTheme();
  const { signUp } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    const emailError = validateEmail(email);
    if (emailError) {
      toast.showError(emailError);
      return;
    }

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
      await signUp(email.trim(), password);
      toast.showSuccess('Account created! Please create a username');
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Create Account
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign up to call the fights
          </Text>

          <Input
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!loading}
            containerStyle={styles.inputContainer}
          />

          <Input
            placeholder="Password (min 8 characters, 1 number)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password-new"
            editable={!loading}
            containerStyle={styles.inputContainer}
          />

          <Input
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password-new"
            editable={!loading}
            containerStyle={styles.inputContainer}
          />

          <Button
            title="Sign Up"
            onPress={handleSignUp}
            loading={loading}
            disabled={loading}
          />

          {/* OAuth Sign-Up Options */}
          <SocialAuthButtons
            action="Sign up"
            disabled={loading}
            onSuccess={() => router.replace('/')}
          />

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/(auth)/sign-in')}
            disabled={loading}
          >
            <Text style={[styles.linkText, { color: colors.textSecondary }]}>
              Already have an account?{' '}
              <Text style={{ color: colors.accent, fontWeight: '600' }}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  title: {
    fontFamily: 'BebasNeue',
    fontSize: 36,
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  linkButton: {
    marginTop: spacing.lg,
    padding: spacing.sm,
    alignItems: 'center',
  },
  linkText: {
    ...typography.body,
  },
});
