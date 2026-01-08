/**
 * Social authentication buttons (Apple & Google)
 * Styled according to brand guidelines
 */

import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { getAuthErrorMessage } from '../../lib/validation';

interface SocialAuthButtonsProps {
  /** Text prefix for buttons (e.g., "Sign in" or "Sign up") */
  action?: 'Sign in' | 'Sign up' | 'Continue';
  /** Called after successful sign-in (before navigation) */
  onSuccess?: () => void;
  /** Disable buttons */
  disabled?: boolean;
}

export function SocialAuthButtons({
  action = 'Continue',
  onSuccess,
  disabled = false,
}: SocialAuthButtonsProps) {
  const { colors } = useTheme();
  const toast = useToast();
  const {
    signInWithApple,
    isAppleAvailable,
    appleLoading,
    signInWithGoogle,
    isGoogleAvailable,
    googleLoading,
  } = useAuth();

  const handleAppleSignIn = async () => {
    try {
      await signInWithApple();
      onSuccess?.();
    } catch (error: any) {
      if (error.message !== 'Sign-in cancelled') {
        const errorMessage = getAuthErrorMessage(error);
        toast.showError(errorMessage);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      onSuccess?.();
    } catch (error: any) {
      if (error.message !== 'Sign-in cancelled') {
        const errorMessage = getAuthErrorMessage(error);
        toast.showError(errorMessage);
      }
    }
  };

  const isLoading = appleLoading || googleLoading;
  const isDisabled = disabled || isLoading;

  // Don't render anything if no OAuth providers are available
  if (!isAppleAvailable && !isGoogleAvailable) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Divider */}
      <View style={styles.dividerContainer}>
        <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
        <Text style={[styles.dividerText, { color: colors.textTertiary }]}>or</Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
      </View>

      {/* Apple Sign-In Button */}
      {isAppleAvailable && Platform.OS === 'ios' && (
        <TouchableOpacity
          style={[
            styles.socialButton,
            styles.appleButton,
            isDisabled && styles.disabledButton,
          ]}
          onPress={handleAppleSignIn}
          disabled={isDisabled}
          activeOpacity={0.8}
        >
          {appleLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="logo-apple" size={20} color="#FFFFFF" style={styles.icon} />
              <Text style={styles.appleButtonText}>{action} with Apple</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Google Sign-In Button */}
      {isGoogleAvailable && (
        <TouchableOpacity
          style={[
            styles.socialButton,
            styles.googleButton,
            { borderColor: colors.border },
            isDisabled && styles.disabledButton,
          ]}
          onPress={handleGoogleSignIn}
          disabled={isDisabled}
          activeOpacity={0.8}
        >
          {googleLoading ? (
            <ActivityIndicator color={colors.text} size="small" />
          ) : (
            <>
              <GoogleIcon />
              <Text style={[styles.googleButtonText, { color: colors.text }]}>
                {action} with Google
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

// Google "G" logo as a simple component
function GoogleIcon() {
  return (
    <View style={styles.googleIconContainer}>
      <Text style={styles.googleIconText}>G</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: spacing.lg,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: spacing.md,
    ...typography.meta,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.button,
    marginBottom: spacing.sm,
    minHeight: 50,
  },
  appleButton: {
    backgroundColor: '#000000',
  },
  appleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  icon: {
    marginRight: spacing.sm,
  },
  googleIconContainer: {
    width: 20,
    height: 20,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4285F4',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
