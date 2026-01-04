/**
 * SettingsRow Component
 * Reusable row for settings items - theme-aware
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { spacing, radius } from '../lib/tokens';

type SettingsRowType = 'button' | 'toggle' | 'link' | 'danger';

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  type?: SettingsRowType;
  value?: boolean; // For toggle type
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
  subtitle?: string;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  label,
  type = 'button',
  value,
  onPress,
  onToggle,
  subtitle,
}) => {
  const { colors, isDark } = useTheme();
  const isDanger = type === 'danger';
  const isLink = type === 'link';

  const handlePress = () => {
    if (type !== 'toggle' && onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.row,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
      onPress={handlePress}
      disabled={type === 'toggle'}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: isDanger
              ? colors.dangerSoft
              : colors.surfaceAlt,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={22}
          color={isDanger ? colors.danger : colors.text}
        />
      </View>

      <View style={styles.content}>
        <Text
          style={[
            styles.label,
            { color: isDanger ? colors.danger : colors.text },
          ]}
        >
          {label}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
            {subtitle}
          </Text>
        )}
      </View>

      {type === 'toggle' && (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={value ? '#fff' : colors.textTertiary}
          ios_backgroundColor={colors.border}
        />
      )}

      {(type === 'button' || type === 'link' || type === 'danger') && (
        <Ionicons
          name={isLink ? 'open-outline' : 'chevron-forward'}
          size={20}
          color={isDanger ? colors.danger : colors.textTertiary}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 2,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});
