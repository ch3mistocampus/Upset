import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';

interface FighterPickRowProps {
  fighterName: string;
  isSelected: boolean;
  onPress: () => void;
  disabled?: boolean;
  result?: 'win' | 'loss' | null;
}

export function FighterPickRow({
  fighterName,
  isSelected,
  onPress,
  disabled = false,
  result,
}: FighterPickRowProps) {
  const { colors, isDark } = useTheme();

  const handlePress = () => {
    if (!disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    }
  };

  const getBackgroundColor = () => {
    if (result === 'win') return isDark ? colors.successSoft : '#E8F5ED';
    if (result === 'loss') return isDark ? colors.dangerSoft : '#FBEAEC';
    if (isSelected) return colors.accentSoft;
    return colors.surfaceAlt;
  };

  const getBorderColor = () => {
    if (result === 'win') return colors.success;
    if (result === 'loss') return colors.danger;
    if (isSelected) return colors.accent;
    return colors.border;
  };

  const getTextColor = () => {
    if (disabled) return colors.textTertiary;
    return colors.textPrimary;
  };

  return (
    <TouchableOpacity
      style={[
        styles.row,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          opacity: disabled ? 0.6 : 1,
        },
      ]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text
        style={[styles.fighterName, { color: getTextColor() }]}
        numberOfLines={1}
      >
        {fighterName}
      </Text>

      {isSelected && !result && (
        <View style={[styles.checkContainer, { backgroundColor: colors.accent }]}>
          <Ionicons name="checkmark" size={14} color={colors.onAccent} />
        </View>
      )}

      {result === 'win' && (
        <View style={[styles.resultBadge, { backgroundColor: colors.success }]}>
          <Ionicons name="checkmark" size={12} color="#fff" />
        </View>
      )}

      {result === 'loss' && (
        <View style={[styles.resultBadge, { backgroundColor: colors.danger }]}>
          <Ionicons name="close" size={12} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 54,
    borderRadius: radius.input,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fighterName: {
    ...typography.body,
    fontWeight: '600',
    flex: 1,
  },
  checkContainer: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
