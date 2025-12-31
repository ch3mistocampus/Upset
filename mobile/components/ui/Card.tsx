import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../lib/theme';
import { spacing, radius } from '../../lib/tokens';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
}

export function Card({ children, style, noPadding }: CardProps) {
  const { colors, shadows } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          ...shadows.card,
        },
        !noPadding && styles.padding,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
  },
  padding: {
    padding: spacing.lg,
  },
});
