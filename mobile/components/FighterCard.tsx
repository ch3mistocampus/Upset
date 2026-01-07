/**
 * FighterCard - Display a UFC fighter summary
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../lib/theme';
import { spacing, radius, typography } from '../lib/tokens';
import { UFCFighter, UFCFighterSearchResult } from '../types/database';
import {
  formatHeight,
  formatWeight,
  formatRecord,
  getWeightClassName,
} from '../hooks/useFighterStats';

interface FighterCardProps {
  fighter: UFCFighter | UFCFighterSearchResult;
  compact?: boolean;
}

export function FighterCard({ fighter, compact = false }: FighterCardProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  // Handle both full fighter object and search result
  const fighterId = fighter.fighter_id;
  const fullName = fighter.full_name;
  const nickname = fighter.nickname;
  const weightLbs = fighter.weight_lbs;

  // Record can be a string (from search) or individual fields
  const record = 'record' in fighter && typeof fighter.record === 'string'
    ? fighter.record
    : 'record_wins' in fighter
      ? formatRecord(fighter.record_wins, fighter.record_losses, fighter.record_draws, fighter.record_nc)
      : '--';

  const weightClass = getWeightClassName(weightLbs);

  // Get ranking if available
  const ranking = 'ranking' in fighter ? fighter.ranking : null;
  const getRankingLabel = (rank: number) => {
    if (rank === 0) return 'C'; // Champion
    return `#${rank}`;
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/fighter/${fighterId}`);
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactCard, { backgroundColor: colors.surfaceAlt }]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.compactLeft}>
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={styles.avatarText}>
              {fullName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.compactInfo}>
            <Text style={[styles.compactName, { color: colors.text }]} numberOfLines={1}>
              {fullName}
            </Text>
            {nickname && (
              <Text style={[styles.compactNickname, { color: colors.textSecondary }]} numberOfLines={1}>
                "{nickname}"
              </Text>
            )}
          </View>
        </View>
        <View style={styles.compactRight}>
          <Text style={[styles.compactRecord, { color: colors.textPrimary }]}>
            {record}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.avatarLarge, { backgroundColor: colors.accent }]}>
          <Text style={styles.avatarLargeText}>
            {fullName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {fullName}
          </Text>
          {nickname && (
            <Text style={[styles.nickname, { color: colors.textSecondary }]} numberOfLines={1}>
              "{nickname}"
            </Text>
          )}
          <View style={styles.badges}>
            {ranking !== null && (
              <View style={[styles.rankBadge, { backgroundColor: ranking === 0 ? colors.gold : colors.accent }]}>
                <Text style={styles.rankBadgeText}>
                  {getRankingLabel(ranking)}
                </Text>
              </View>
            )}
            <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
              <Text style={[styles.badgeText, { color: colors.accent }]}>
                {weightClass}
              </Text>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      </View>

      <View style={[styles.divider, { backgroundColor: colors.divider }]} />

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{record}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>RECORD</Text>
        </View>
        {'height_inches' in fighter && (
          <>
            <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatHeight(fighter.height_inches)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>HEIGHT</Text>
            </View>
          </>
        )}
        {weightLbs && (
          <>
            <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatWeight(weightLbs)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>WEIGHT</Text>
            </View>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Full card styles
  card: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarLargeText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  nickname: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  rankBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    minWidth: 28,
    alignItems: 'center',
  },
  rankBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Compact card styles
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.card,
    marginBottom: spacing.xs,
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  compactInfo: {
    flex: 1,
  },
  compactName: {
    fontSize: 15,
    fontWeight: '600',
  },
  compactNickname: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  compactRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  compactRecord: {
    fontSize: 14,
    fontWeight: '600',
  },
});
