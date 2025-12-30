/**
 * ErrorState Component
 * Bold UFC-inspired error display with retry capability
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  return (
    <View style={styles.container}>
      <View style={styles.errorCard}>
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
        <Text style={styles.message}>{message}</Text>

        {/* Retry Button - UFC Fight Card Style */}
        <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.8}>
          <View style={styles.buttonInner}>
            <Ionicons name="reload" size={20} color="#000" style={styles.reloadIcon} />
            <Text style={styles.retryText}>TRY AGAIN</Text>
          </View>
        </TouchableOpacity>

        {/* Subtle help text */}
        <Text style={styles.helpText}>
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
    backgroundColor: '#000',
    padding: 24,
  },
  errorCard: {
    position: 'relative',
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
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
    marginBottom: 24,
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
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    letterSpacing: 0.3,
  },
  retryButton: {
    backgroundColor: '#d4202a',
    borderRadius: 2, // Sharp, not soft
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#d4202a',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  reloadIcon: {
    marginRight: 8,
  },
  retryText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  helpText: {
    marginTop: 20,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
