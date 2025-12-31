import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { Card } from './Card';
import { FighterPickRow } from './FighterPickRow';

interface Fighter {
  id: string;
  name: string;
}

interface FightPickCardProps {
  label: string;
  weightClass?: string;
  fighter1: Fighter;
  fighter2: Fighter;
  selectedFighterId?: string | null;
  onSelectFighter: (fighterId: string) => void;
  disabled?: boolean;
  result?: {
    winnerId: string | null;
  } | null;
}

export function FightPickCard({
  label,
  weightClass,
  fighter1,
  fighter2,
  selectedFighterId,
  onSelectFighter,
  disabled = false,
  result,
}: FightPickCardProps) {
  const { colors } = useTheme();

  const getFighterResult = (fighterId: string): 'win' | 'loss' | null => {
    if (!result) return null;
    if (result.winnerId === fighterId) return 'win';
    if (result.winnerId && result.winnerId !== fighterId) return 'loss';
    return null;
  };

  return (
    <Card>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label}
        </Text>
        {weightClass && (
          <Text style={[styles.weightClass, { color: colors.textTertiary }]}>
            {weightClass}
          </Text>
        )}
      </View>

      <View style={styles.fighters}>
        <FighterPickRow
          fighterName={fighter1.name}
          isSelected={selectedFighterId === fighter1.id}
          onPress={() => onSelectFighter(fighter1.id)}
          disabled={disabled}
          result={getFighterResult(fighter1.id)}
        />
        <View style={styles.spacer} />
        <FighterPickRow
          fighterName={fighter2.name}
          isSelected={selectedFighterId === fighter2.id}
          onPress={() => onSelectFighter(fighter2.id)}
          disabled={disabled}
          result={getFighterResult(fighter2.id)}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  label: {
    ...typography.caption,
  },
  weightClass: {
    ...typography.meta,
  },
  fighters: {
    gap: spacing.sm,
  },
  spacer: {
    height: spacing.sm,
  },
});
