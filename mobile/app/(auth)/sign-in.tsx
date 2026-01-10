/**
 * Sign in screen with password, email OTP, and OAuth options
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
import { logger } from '../../lib/logger';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { Button, LinkButton, Input } from '../../components/ui';
import { SocialAuthButtons } from '../../components/auth';
import { validateEmail, isEmail, getAuthErrorMessage } from '../../lib/validation';

type AuthTab = 'password' | 'otp';

export default function SignIn() {
  const { colors } = useTheme();
  const { signInWithPassword, signInWithUsername, signInWithOTP, verifyOTP, enterGuestMode } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<AuthTab>('password');
  const [loading, setLoading] = useState(false);

  // Password tab state
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');

  // OTP tab state
  const [otpEmail, setOtpEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handlePasswordSignIn = async () => {
    const input = emailOrUsername.trim();

    if (!input) {
      toast.showError('Please enter your email or username');
      return;
    }

    if (!password) {
      toast.showError('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      if (isEmail(input)) {
        await signInWithPassword(input, password);
      } else {
        await signInWithUsername(input, password);
      }
      // Navigate to home after successful login (for test users especially)
      router.replace('/(tabs)/home');
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error);
      toast.showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    const emailError = validateEmail(otpEmail);
    if (emailError) {
      toast.showError(emailError);
      return;
    }

    setLoading(true);
    try {
      await signInWithOTP(otpEmail.trim());
      setOtpSent(true);
      toast.showSuccess('Check your email for the verification code');
    } catch (error: any) {
      toast.showError(error.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) {
      toast.showError('Please enter the verification code');
      return;
    }

    setLoading(true);
    try {
      await verifyOTP(otpEmail, otp);
    } catch (error: any) {
      toast.showError(error.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAsGuest = async () => {
    logger.info('Continuing as guest from sign-in screen');
    await enterGuestMode();
    router.replace('/(tabs)/home');
  };

  const renderPasswordTab = () => (
    <>
      <Input
        placeholder="Email or Username"
        value={emailOrUsername}
        onChangeText={setEmailOrUsername}
        autoCapitalize="none"
        autoComplete="username"
        editable={!loading}
        containerStyle={styles.inputContainer}
      />

      <Input
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
        editable={!loading}
        containerStyle={styles.inputContainer}
      />

      <View style={styles.forgotContainer}>
        <LinkButton
          title="Forgot password?"
          onPress={() => router.push('/(auth)/reset-password')}
          disabled={loading}
        />
      </View>

      <Button
        title="Sign In"
        onPress={handlePasswordSignIn}
        loading={loading}
        disabled={loading}
      />
    </>
  );

  const renderOTPTab = () => {
    if (!otpSent) {
      return (
        <>
          <Input
            placeholder="Email"
            value={otpEmail}
            onChangeText={setOtpEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!loading}
            containerStyle={styles.inputContainer}
          />

          <Button
            title="Send Code"
            onPress={handleSendOTP}
            loading={loading}
            disabled={loading}
          />
        </>
      );
    }

    return (
      <>
        <Input
          placeholder="6-digit code"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
          editable={!loading}
          containerStyle={styles.inputContainer}
        />

        <Button
          title="Verify"
          onPress={handleVerifyOTP}
          loading={loading}
          disabled={loading}
        />

        <View style={styles.linkContainer}>
          <LinkButton
            title="Back to email"
            onPress={() => setOtpSent(false)}
            disabled={loading}
          />
        </View>
      </>
    );
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
            Upset
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign in to continue
          </Text>

          {/* Tab Navigation */}
          <View style={[styles.tabContainer, { borderBottomColor: colors.divider }]}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'password' && { borderBottomColor: colors.accent },
              ]}
              onPress={() => setActiveTab('password')}
              disabled={loading}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'password' ? colors.textPrimary : colors.textSecondary },
                ]}
              >
                Password
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'otp' && { borderBottomColor: colors.accent },
              ]}
              onPress={() => setActiveTab('otp')}
              disabled={loading}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'otp' ? colors.textPrimary : colors.textSecondary },
                ]}
              >
                Email Code
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {activeTab === 'password' ? renderPasswordTab() : renderOTPTab()}
          </View>

          {/* OAuth Sign-In Options */}
          <SocialAuthButtons
            action="Sign in"
            disabled={loading}
            onSuccess={() => router.replace('/')}
          />

          {/* Sign Up Link */}
          <TouchableOpacity
            style={styles.signUpButton}
            onPress={() => router.push('/(auth)/sign-up')}
            disabled={loading}
          >
            <Text style={[styles.signUpText, { color: colors.textSecondary }]}>
              Don't have an account?{' '}
              <Text style={{ color: colors.accent, fontWeight: '600' }}>Sign up</Text>
            </Text>
          </TouchableOpacity>

          {/* Guest Mode Link */}
          <TouchableOpacity
            style={styles.guestButton}
            onPress={handleContinueAsGuest}
            disabled={loading}
          >
            <Text style={[styles.guestText, { color: colors.textTertiary }]}>
              Continue as Guest
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
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: spacing.xl,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    ...typography.body,
    fontWeight: '500',
  },
  tabContent: {
    marginTop: spacing.sm,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  forgotContainer: {
    alignSelf: 'flex-end',
    marginBottom: spacing.md,
  },
  linkContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  signUpButton: {
    marginTop: spacing.xl,
    padding: spacing.sm,
    alignItems: 'center',
  },
  signUpText: {
    ...typography.body,
  },
  guestButton: {
    marginTop: spacing.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  guestText: {
    ...typography.meta,
  },
});
