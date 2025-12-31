import React, { useState } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  containerStyle,
  style,
  ...props
}: InputProps) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const getBorderColor = () => {
    if (error) return colors.danger;
    if (isFocused) return colors.accent;
    return colors.border;
  };

  return (
    <View style={containerStyle}>
      {label && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surfaceAlt,
            borderColor: getBorderColor(),
            color: colors.textPrimary,
          },
          isFocused && {
            borderWidth: 2,
          },
          style,
        ]}
        placeholderTextColor={colors.textTertiary}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
      {error && (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  input: {
    height: 52,
    borderRadius: radius.input,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    ...typography.body,
  },
  error: {
    ...typography.meta,
    marginTop: spacing.xs,
  },
});
