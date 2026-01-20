/**
 * FightPickCard - Premium fight card container
 *
 * Design: SurfaceCard with header (weight class + main event badge),
 * stats icon, and two vertically stacked FighterPickRow components.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography, displayTypography } from '../../lib/tokens';
import { SurfaceCard } from './SurfaceCard';
import { FighterPickRow } from './FighterPickRow';

interface Fighter {
  id: string;
  name: string;
  record?: string | null;
}

interface FightPickCardProps {
  /** Fight label (e.g., "Fight 5", "Co-Main Event") */
  label?: string;
  /** Weight class (e.g., "Lightweight", "Welterweight") */
  weightClass?: string;
  /** Is this the main event? Shows red "Main Event" badge */
  isMainEvent?: boolean;
  /** Red corner fighter */
  fighter1: Fighter;
  /** Blue corner fighter */
  fighter2: Fighter;
  /** Currently selected fighter ID (if any) */
  selectedFighterId?: string | null;
  /** Callback when a fighter is selected */
  onSelectFighter: (fighterId: string) => void;
  /** Whether picks are disabled (locked event, submitted, etc.) */
  disabled?: boolean;
  /** Result data for graded fights */
  result?: {
    winnerId: string | null;
  } | null;
  /** Community pick percentages */
  communityPicks?: {
    fighter1Pct: number;
    fighter2Pct: number;
    totalPicks: number;
  } | null;
  /** Callback for stats button press */
  onStatsPress?: () => void;
  /** Show animated border (for next upcoming fight) */
  animatedBorder?: boolean;
}

// Minimum picks required to show community percentages
const MIN_COMMUNITY_PICKS = 5;

export function FightPickCard({
  label,
  weightClass,
  isMainEvent = false,
  fighter1,
  fighter2,
  selectedFighterId,
  onSelectFighter,
  disabled = false,
  result,
  communityPicks,
  onStatsPress,
  animatedBorder = false,
}: FightPickCardProps) {
  const { colors } = useTheme();

  const getFighterResult = (fighterId: string): 'win' | 'loss' | null => {
    if (!result) return null;
    if (result.winnerId === fighterId) return 'win';
    if (result.winnerId && result.winnerId !== fighterId) return 'loss';
    return null;
  };

  const handleStatsPress = () => {
    if (onStatsPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onStatsPress();
    }
  };

  // Determine if we should show community percentages
  const showCommunityPicks =
    communityPicks &&
    communityPicks.totalPicks >= MIN_COMMUNITY_PICKS &&
    !!selectedFighterId;

  // Determine which fighter is selected (for opponent dimming logic)
  const fighter1Selected = selectedFighterId === fighter1.id;
  const fighter2Selected = selectedFighterId === fighter2.id;

  return (
    <SurfaceCard
      weakWash={!isMainEvent}
      animatedBorder={animatedBorder}
      paddingSize="md"
    >
      {/* Header Row */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {/* Weight Class */}
          {weightClass && (
            <Text style={[styles.weightClass, { color: colors.textTertiary }]}>
              {weightClass}
            </Text>
          )}
          {/* Main Event Badge */}
          {isMainEvent && (
            <View style={[styles.mainEventBadge, { backgroundColor: colors.accent }]}>
              <Text style={styles.mainEventText}>MAIN EVENT</Text>
            </View>
          )}
        </View>
        {/* Stats Icon */}
        {onStatsPress && (
          <TouchableOpacity
            style={styles.statsButton}
            onPress={handleStatsPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="bar-chart" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Fight Label (optional) */}
      {label && !isMainEvent && (
        <Text style={[styles.label, { color: colors.accent }]}>
          {label}
        </Text>
      )}

      {/* Fighter Rows - Stacked Vertically */}
      <View style={styles.fighters}>
        <FighterPickRow
          fighterName={fighter1.name}
          record={fighter1.record}
          corner="red"
          isSelected={fighter1Selected}
          isOpponentSelected={fighter2Selected}
          onPress={() => onSelectFighter(fighter1.id)}
          disabled={disabled}
          result={getFighterResult(fighter1.id)}
          communityPickPct={showCommunityPicks ? communityPicks?.fighter1Pct : undefined}
        />
        <FighterPickRow
          fighterName={fighter2.name}
          record={fighter2.record}
          corner="blue"
          isSelected={fighter2Selected}
          isOpponentSelected={fighter1Selected}
          onPress={() => onSelectFighter(fighter2.id)}
          disabled={disabled}
          result={getFighterResult(fighter2.id)}
          communityPickPct={showCommunityPicks ? communityPicks?.fighter2Pct : undefined}
        />
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  weightClass: {
    ...typography.caption,
    fontSize: 11,
    letterSpacing: 0.4,
  },
  mainEventBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  mainEventText: {
    fontFamily: 'BebasNeue',
    fontSize: 11,
    color: '#fff',
    letterSpacing: 0.5,
  },
  label: {
    ...typography.caption,
    fontSize: 11,
    marginBottom: spacing.xs,
  },
  statsButton: {
    padding: 4,
  },
  fighters: {
    gap: spacing.sm,
  },
});
