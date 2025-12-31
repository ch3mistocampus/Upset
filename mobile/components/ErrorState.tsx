/**
 * ErrorState Component
 * Bold UFC-inspired error display with retry capability
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { spacing, radius } from '../lib/tokens';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.errorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Angular accent bars */}
        <View style={styles.accentTop} />
        <View style={styles.accentBottom} />

        {/* Error Icon - Bold and unmissable */}
        <View style={styles.iconContainer}>
          <View style={styles.iconBg}>
            <Ionicons name="alert-circle" size={72} color="#ef4444" />
          </View>
        </View>

        {/* Error Label */}
        <Text style={styles.errorLabel}>ERROR</Text>

        {/* Error Message */}
        <Text style={[styles.message, { color: colors.text }]}>{message}</Text>

        {/* Retry Button - UFC Fight Card Style */}
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.accent }]}
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <View style={styles.buttonInner}>
            <Ionicons name="reload" size={20} color="#fff" style={styles.reloadIcon} />
            <Text style={styles.retryText}>TRY AGAIN</Text>
          </View>
        </TouchableOpacity>

        {/* Subtle help text */}
        <Text style={[styles.helpText, { color: colors.textMuted }]}>
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
    borderRadius: radius.sm,
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
    backgroundColor: '#ef4444',
  },
  accentBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#ef4444',
  },
  iconContainer: {
    marginBottom: spacing.xl,
  },
  iconBg: {
    width: 120,
    height: 120,
    borderRadius: 2, // Sharp, angular
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorLabel: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 3,
    color: '#ef4444',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xxl,
    letterSpacing: 0.3,
  },
  retryButton: {
    borderRadius: radius.sm, // Sharp, not soft
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  helpText: {
    marginTop: spacing.lg,
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
