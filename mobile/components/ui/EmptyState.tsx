import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { spacing, typography } from '../../lib/tokens';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  secondaryOnAction?: () => void;
  hint?: string;
}

export function EmptyState({
  icon = 'albums-outline',
  title,
  message,
  actionLabel,
  onAction,
  secondaryActionLabel,
  secondaryOnAction,
  hint,
}: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name={icon} size={32} color={colors.textTertiary} />
      </View>

      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>

      {message && (
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {message}
        </Text>
      )}

      {(actionLabel && onAction) || (secondaryActionLabel && secondaryOnAction) ? (
        <View style={styles.actionContainer}>
          {actionLabel && onAction && (
            <Button
              title={actionLabel}
              onPress={onAction}
              variant="primary"
              fullWidth={false}
            />
          )}
          {secondaryActionLabel && secondaryOnAction && (
            <Button
              title={secondaryActionLabel}
              onPress={secondaryOnAction}
              variant="secondary"
              fullWidth={false}
            />
          )}
        </View>
      ) : null}

      {hint && (
        <Text style={[styles.hint, { color: colors.textTertiary }]}>
          {hint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    ...typography.body,
    textAlign: 'center',
    maxWidth: 280,
  },
  actionContainer: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  hint: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
