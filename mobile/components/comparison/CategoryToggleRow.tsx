/**
 * CategoryToggleRow - Horizontal chip toggles for stat categories
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';

export type StatCategory = 'physical' | 'record' | 'striking' | 'grappling' | 'finish';

interface CategoryConfig {
  key: StatCategory;
  label: string;
}

const CATEGORIES: CategoryConfig[] = [
  { key: 'physical', label: 'Physical' },
  { key: 'record', label: 'Record' },
  { key: 'striking', label: 'Striking' },
  { key: 'grappling', label: 'Grappling' },
  { key: 'finish', label: 'Finish %' },
];

interface CategoryToggleRowProps {
  enabledCategories: Set<StatCategory>;
  onToggle: (category: StatCategory) => void;
}

export function CategoryToggleRow({
  enabledCategories,
  onToggle,
}: CategoryToggleRowProps): React.ReactElement {
  const { colors } = useTheme();

  const handlePress = (category: StatCategory): void => {
    Haptics.selectionAsync();
    onToggle(category);
  };

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CATEGORIES.map((cat) => {
          const isEnabled = enabledCategories.has(cat.key);
          return (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.chip,
                {
                  backgroundColor: isEnabled ? colors.accent : colors.surfaceAlt,
                  borderColor: isEnabled ? colors.accent : colors.border,
                },
              ]}
              onPress={() => handlePress(cat.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipLabel,
                  { color: isEnabled ? '#fff' : colors.textSecondary },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
