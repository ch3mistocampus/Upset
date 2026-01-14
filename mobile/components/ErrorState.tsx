/**
 * ErrorState Component
 * Bold UFC-inspired error display with retry capability
 * Uses theme colors for accessibility and dark mode support
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../lib/theme';
import { spacing, radius } from '../lib/tokens';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  /** Optional context about what failed */
  context?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry, context }) => {
  const { colors } = useTheme();

  const handleRetry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRetry();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.errorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Angular accent bars - use theme danger color */}
        <View style={[styles.accentTop, { backgroundColor: colors.danger }]} />
        <View style={[styles.accentBottom, { backgroundColor: colors.danger }]} />

        {/* Error Icon - Bold and unmissable */}
        <View style={styles.iconContainer}>
          <View
            style={[
              styles.iconBg,
              {
                backgroundColor: `${colors.danger}15`,
                borderColor: `${colors.danger}40`,
              },
            ]}
          >
            <Ionicons
              name="alert-circle"
              size={72}
              color={colors.danger}
              accessibilityLabel="Error icon"
            />
          </View>
        </View>

        {/* Error Label */}
        <Text
          style={[styles.errorLabel, { color: colors.danger }]}
          accessibilityRole="header"
        >
          ERROR
        </Text>

        {/* Error Message */}
        <Text
          style={[styles.message, { color: colors.text }]}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {message}
        </Text>

        {/* Context hint if provided */}
        {context && (
          <Text style={[styles.contextText, { color: colors.textSecondary }]}>
            {context}
          </Text>
        )}

        {/* Retry Button - UFC Fight Card Style */}
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.accent }]}
          onPress={handleRetry}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Try again"
          accessibilityHint="Retries the failed action"
        >
          <View style={styles.buttonInner}>
            <Ionicons name="reload" size={20} color="#fff" style={styles.reloadIcon} />
            <Text style={styles.retryText}>TRY AGAIN</Text>
          </View>
        </TouchableOpacity>

        {/* Subtle help text */}
        <Text style={[styles.helpText, { color: colors.textTertiary || colors.textSecondary }]}>
          Pull down to refresh or tap above to retry
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorCard: {
    position: 'relative',
    borderRadius: radius.lg,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  // Angular accent bars for UFC aesthetic
  accentTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  accentBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  iconContainer: {
    marginBottom: spacing.xl,
  },
  iconBg: {
    width: 120,
    height: 120,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  errorLabel: {
    fontFamily: 'BebasNeue',
    fontSize: 20,
    letterSpacing: 3,
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.lg,
    letterSpacing: 0.3,
  },
  contextText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    borderRadius: radius.md,
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  reloadIcon: {
    marginRight: 8,
  },
  retryText: {
    fontFamily: 'BebasNeue',
    color: '#fff',
    fontSize: 18,
    letterSpacing: 2,
  },
  helpText: {
    marginTop: spacing.lg,
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
