/**
 * Sign in screen with password and email OTP options
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { validateEmail, isEmail, getAuthErrorMessage } from '../../lib/validation';

type AuthTab = 'password' | 'otp';

export default function SignIn() {
  const { signInWithPassword, signInWithUsername, signInWithOTP, verifyOTP } = useAuth();
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
      // Smart detection: email vs username
      if (isEmail(input)) {
        await signInWithPassword(input, password);
      } else {
        await signInWithUsername(input, password);
      }
      // Auth state change will trigger redirect in index.tsx
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
      // Auth state change will trigger redirect in index.tsx
    } catch (error: any) {
      toast.showError(error.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const renderPasswordTab = () => (
    <>
      <TextInput
        style={styles.input}
        placeholder="Email or Username"
        placeholderTextColor="#666"
        value={emailOrUsername}
        onChangeText={setEmailOrUsername}
        autoCapitalize="none"
        autoComplete="username"
        editable={!loading}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#666"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
        editable={!loading}
      />

      <TouchableOpacity
        style={styles.forgotButton}
        onPress={() => router.push('/(auth)/reset-password')}
        disabled={loading}
      >
        <Text style={styles.forgotText}>Forgot password?</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handlePasswordSignIn}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign In</Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderOTPTab = () => {
    if (!otpSent) {
      return (
        <>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#666"
            value={otpEmail}
            onChangeText={setOtpEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSendOTP}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send Code</Text>
            )}
          </TouchableOpacity>
        </>
      );
    }

    return (
      <>
        <TextInput
          style={styles.input}
          placeholder="6-digit code"
          placeholderTextColor="#666"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleVerifyOTP}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => setOtpSent(false)}
          disabled={loading}
        >
          <Text style={styles.linkText}>Back to email</Text>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>UFC Picks Tracker</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'password' && styles.tabActive]}
              onPress={() => setActiveTab('password')}
              disabled={loading}
            >
              <Text style={[styles.tabText, activeTab === 'password' && styles.tabTextActive]}>
                Password
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'otp' && styles.tabActive]}
              onPress={() => setActiveTab('otp')}
              disabled={loading}
            >
              <Text style={[styles.tabText, activeTab === 'otp' && styles.tabTextActive]}>
                Email Code
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {activeTab === 'password' ? renderPasswordTab() : renderOTPTab()}
          </View>

          {/* Sign Up Link */}
          <TouchableOpacity
            style={styles.signUpButton}
            onPress={() => router.push('/(auth)/sign-up')}
            disabled={loading}
          >
            <Text style={styles.signUpText}>
              Don't have an account? <Text style={styles.signUpTextBold}>Sign up</Text>
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
    backgroundColor: '#000',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 32,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#d4202a',
  },
  tabText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabContent: {
    marginTop: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotText: {
    color: '#d4202a',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#d4202a',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 16,
    padding: 8,
    alignItems: 'center',
  },
  linkText: {
    color: '#d4202a',
    fontSize: 14,
  },
  signUpButton: {
    marginTop: 24,
    padding: 8,
    alignItems: 'center',
  },
  signUpText: {
    color: '#999',
    fontSize: 14,
  },
  signUpTextBold: {
    color: '#d4202a',
    fontWeight: 'bold',
  },
});
