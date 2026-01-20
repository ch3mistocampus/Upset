/**
 * Fighter Detail Screen - View fighter stats and fight history
 */

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../../lib/theme';
import { spacing, radius, typography, displayTypography } from '../../../lib/tokens';
import { useFighterProfile } from '../../../hooks/useFighterStats';
import {
  formatHeight,
  formatWeight,
  formatReach,
  formatRecord,
  formatPercentage,
  formatStat,
  formatControlTime,
  calculateAge,
  getWeightClassName,
} from '../../../hooks/useFighterStats';
import { Card, SurfaceCard, EmptyState } from '../../../components/ui';
import { StatRing } from '../../../components/ui/StatRing';
import { SkeletonCard } from '../../../components/SkeletonCard';
import { ErrorState } from '../../../components/ErrorState';
import { GlobalTabBar } from '../../../components/navigation/GlobalTabBar';
import type { FightHistoryItem } from '../../../types/database';

export default function FighterDetailScreen() {
  const { colors, isDark } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useFighterProfile(id || null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Loading...</Text>
          <View style={styles.placeholder} />
        </View>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <SkeletonCard />
          <SkeletonCard />
        </ScrollView>
        <GlobalTabBar />
      </View>
    );
  }

  if (error || !data) {
    // Distinguish between network error and fighter not found
    const isNotFound = !error && !data;
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isNotFound ? 'Fighter Not Found' : 'Error'}
          </Text>
          <View style={styles.placeholder} />
        </View>
        <EmptyState
          icon={isNotFound ? 'person-outline' : 'alert-circle-outline'}
          title={isNotFound ? 'Stats Coming Soon' : 'Something went wrong'}
          message={
            isNotFound
              ? "This fighter's detailed stats haven't been synced yet. Check back closer to fight day!"
              : error?.message || 'Failed to load fighter profile'
          }
        />
        <GlobalTabBar />
      </View>
    );
  }

  const { fighter, history } = data;

  // Fighter can be null if not found - show empty state
  if (!fighter) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Fighter Not Found</Text>
          <View style={styles.placeholder} />
        </View>
        <EmptyState
          icon="person-outline"
          title="Stats Coming Soon"
          message="This fighter's detailed stats haven't been synced yet. Check back closer to fight day!"
        />
        <GlobalTabBar />
      </View>
    );
  }

  const age = calculateAge(fighter.dob);
  // Use database weight_class if available, otherwise calculate from weight
  const weightClass = fighter.weight_class || getWeightClassName(fighter.weight_lbs);
  const record = formatRecord(
    fighter.record.wins,
    fighter.record.losses,
    fighter.record.draws,
    fighter.record.nc
  );

  // Calculate win rate for the ring
  const totalFights = fighter.record.wins + fighter.record.losses + fighter.record.draws;
  const winRate = totalFights > 0 ? (fighter.record.wins / totalFights) * 100 : 0;

  // Get recent form (last 5 fights)
  const recentForm = history.slice(0, 5).map(h => h.result === 'Win' ? 'W' : h.result === 'Loss' ? 'L' : 'D');

  // Check if any career stats are available
  const hasCareerStats = fighter.career_stats && (
    fighter.career_stats.str_acc !== null ||
    fighter.career_stats.str_def !== null ||
    fighter.career_stats.slpm !== null ||
    fighter.career_stats.sapm !== null ||
    fighter.career_stats.td_acc !== null ||
    fighter.career_stats.td_def !== null ||
    fighter.career_stats.td_avg !== null ||
    fighter.career_stats.sub_avg !== null
  );

  // Calculate win methods from fight history
  const winMethods = history.reduce(
    (acc, fight) => {
      if (fight.result === 'Win' && fight.result_method) {
        const method = fight.result_method.toUpperCase();
        if (method.includes('KO') || method.includes('TKO')) {
          acc.ko++;
        } else if (method.includes('SUB')) {
          acc.sub++;
        } else if (method.includes('DEC') || method.includes('DECISION')) {
          acc.dec++;
        } else {
          acc.other++;
        }
      }
      return acc;
    },
    { ko: 0, sub: 0, dec: 0, other: 0 }
  );
  const totalWinMethods = winMethods.ko + winMethods.sub + winMethods.dec + winMethods.other;
  const hasWinMethods = totalWinMethods > 0;

  const renderStatBar = (
    label: string,
    value: number | null,
    maxValue: number = 100,
    color: string = colors.accent
  ) => {
    const percentage = value !== null ? Math.min((value / maxValue) * 100, 100) : 0;
    return (
      <View style={styles.statBarContainer}>
        <View style={styles.statBarHeader}>
          <Text style={[styles.statBarLabel, { color: colors.textSecondary }]}>{label}</Text>
          <Text style={[styles.statBarValue, { color: colors.text }]}>
            {value !== null ? (maxValue === 100 ? `${Math.round(value)}%` : value.toFixed(2)) : '--'}
          </Text>
        </View>
        <View style={[styles.statBarTrack, { backgroundColor: colors.surfaceAlt }]}>
          <View
            style={[styles.statBarFill, { width: `${percentage}%`, backgroundColor: color }]}
          />
        </View>
      </View>
    );
  };

  const renderFightCard = (fight: FightHistoryItem, index: number) => {
    const resultColor =
      fight.result === 'Win' ? colors.success :
      fight.result === 'Loss' ? colors.danger :
      colors.textSecondary;

    const formatTime = (seconds: number | null) => {
      if (!seconds) return '--';
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <Animated.View
        key={fight.fight_id}
        entering={FadeInDown.delay(index * 50).duration(300)}
      >
        <TouchableOpacity
          style={[styles.fightCard, { backgroundColor: colors.surfaceAlt }]}
          activeOpacity={0.7}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // Could navigate to fight details in future
          }}
        >
          <View style={styles.fightCardHeader}>
            <View style={[styles.resultBadge, { backgroundColor: resultColor + '20' }]}>
              <Text style={[styles.resultText, { color: resultColor }]}>
                {fight.result}
              </Text>
            </View>
            <Text style={[styles.fightDate, { color: colors.textTertiary }]}>
              {fight.event_date ? new Date(fight.event_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }) : '--'}
            </Text>
          </View>

          <View style={styles.fightCardBody}>
            <Text style={[styles.opponentLabel, { color: colors.textSecondary }]}>vs</Text>
            <Text style={[styles.opponentName, { color: colors.text }]} numberOfLines={1}>
              {fight.opponent_name || 'Unknown Opponent'}
            </Text>
          </View>

          <View style={styles.fightCardFooter}>
            <Text style={[styles.fightMethod, { color: colors.textSecondary }]}>
              {fight.result_method || 'Unknown'}
              {fight.result_round && ` R${fight.result_round}`}
              {fight.result_time_seconds && ` ${formatTime(fight.result_time_seconds)}`}
            </Text>
            <Text style={[styles.eventName, { color: colors.textTertiary }]} numberOfLines={1}>
              {fight.event_name}
            </Text>
          </View>

          {/* Fight stats if available */}
          {fight.totals && (
            <View style={[styles.fightStats, { borderTopColor: colors.divider }]}>
              <View style={styles.fightStatItem}>
                <Text style={[styles.fightStatValue, { color: colors.text }]}>
                  {String(fight.totals.sig_str_landed ?? '--')}
                </Text>
                <Text style={[styles.fightStatLabel, { color: colors.textTertiary }]}>
                  Sig. Str
                </Text>
              </View>
              <View style={styles.fightStatItem}>
                <Text style={[styles.fightStatValue, { color: colors.text }]}>
                  {String(fight.totals.td_landed ?? '--')}
                </Text>
                <Text style={[styles.fightStatLabel, { color: colors.textTertiary }]}>
                  TD
                </Text>
              </View>
              <View style={styles.fightStatItem}>
                <Text style={[styles.fightStatValue, { color: colors.text }]}>
                  {String(fight.totals.knockdowns ?? '--')}
                </Text>
                <Text style={[styles.fightStatLabel, { color: colors.textTertiary }]}>
                  KD
                </Text>
              </View>
              <View style={styles.fightStatItem}>
                <Text style={[styles.fightStatValue, { color: colors.text }]}>
                  {formatControlTime(Number(fight.totals.ctrl_time_seconds) || 0)}
                </Text>
                <Text style={[styles.fightStatLabel, { color: colors.textTertiary }]}>
                  Ctrl
                </Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {fighter.full_name}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <SurfaceCard heroGlow animatedBorder>
          <View style={styles.heroContent}>
            {/* Avatar */}
            <View style={[styles.avatarLarge, { backgroundColor: colors.accent }]}>
              <Text style={styles.avatarLargeText}>
                {fighter.full_name.charAt(0).toUpperCase()}
              </Text>
            </View>

            {/* Name and nickname */}
            <Text style={[styles.fighterName, { color: colors.text }]}>
              {fighter.full_name}
            </Text>
            {fighter.nickname && (
              <Text style={[styles.nickname, { color: colors.textSecondary }]}>
                "{fighter.nickname}"
              </Text>
            )}

            {/* Ranking and Weight class badges */}
            <View style={styles.badgeRow}>
              {fighter.ranking !== null && fighter.ranking !== undefined && (
                <View style={[
                  styles.rankBadge,
                  { backgroundColor: fighter.ranking === 0 ? colors.gold : colors.danger }
                ]}>
                  <Text style={styles.rankBadgeText}>
                    {fighter.ranking === 0 ? 'C' : `#${fighter.ranking}`}
                  </Text>
                </View>
              )}
              <View style={[styles.weightBadge, { backgroundColor: colors.accentSoft }]}>
                <Text style={[styles.weightBadgeText, { color: colors.accent }]}>
                  {weightClass}
                </Text>
              </View>
            </View>

            {/* Record */}
            <Text style={[styles.record, { color: colors.text }]}>{record}</Text>

            {/* Recent form */}
            {recentForm.length > 0 && (
              <View style={styles.formRow}>
                <Text style={[styles.formLabel, { color: colors.textTertiary }]}>Recent: </Text>
                {recentForm.map((result, i) => (
                  <View
                    key={i}
                    style={[
                      styles.formDot,
                      {
                        backgroundColor:
                          result === 'W' ? colors.success :
                          result === 'L' ? colors.danger :
                          colors.textTertiary,
                      },
                    ]}
                  >
                    <Text style={styles.formDotText}>{result}</Text>
                  </View>
                ))}
              </View>
            )}

          </View>
        </SurfaceCard>

        {/* Bio Stats */}
        <Card style={styles.bioCard}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            PHYSICAL ATTRIBUTES
          </Text>
          <View style={styles.bioGrid}>
            <View style={styles.bioItem}>
              <Text style={[styles.bioValue, { color: colors.text }]}>
                {formatHeight(fighter.height_inches)}
              </Text>
              <Text style={[styles.bioLabel, { color: colors.textSecondary }]}>Height</Text>
            </View>
            <View style={styles.bioItem}>
              <Text style={[styles.bioValue, { color: colors.text }]}>
                {formatWeight(fighter.weight_lbs)}
              </Text>
              <Text style={[styles.bioLabel, { color: colors.textSecondary }]}>Weight</Text>
            </View>
            <View style={styles.bioItem}>
              <Text style={[styles.bioValue, { color: colors.text }]}>
                {formatReach(fighter.reach_inches)}
              </Text>
              <Text style={[styles.bioLabel, { color: colors.textSecondary }]}>Reach</Text>
            </View>
            <View style={styles.bioItem}>
              <Text style={[styles.bioValue, { color: colors.text }]}>
                {fighter.stance || '--'}
              </Text>
              <Text style={[styles.bioLabel, { color: colors.textSecondary }]}>Stance</Text>
            </View>
            <View style={styles.bioItem}>
              <Text style={[styles.bioValue, { color: colors.text }]}>
                {age !== null ? `${age}` : '--'}
              </Text>
              <Text style={[styles.bioLabel, { color: colors.textSecondary }]}>Age</Text>
            </View>
          </View>
        </Card>

        {/* Win Methods */}
        {hasWinMethods && (
          <Card style={styles.bioCard}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              UFC WIN METHODS
            </Text>

            <View style={styles.winMethodsList}>
              {/* KO/TKO */}
              <View style={styles.winMethodRow}>
                <View style={styles.winMethodInfo}>
                  <Text style={[styles.winMethodValue, { color: colors.text }]}>
                    {winMethods.ko}
                  </Text>
                  <Text style={[styles.winMethodLabel, { color: colors.textSecondary }]}>
                    KO/TKO
                  </Text>
                </View>
                <View style={[styles.winMethodBarTrack, { backgroundColor: colors.surfaceAlt }]}>
                  <View
                    style={[
                      styles.winMethodBarFill,
                      {
                        backgroundColor: colors.danger,
                        width: `${totalWinMethods > 0 ? (winMethods.ko / totalWinMethods) * 100 : 0}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.winMethodPct, { color: colors.textTertiary }]}>
                  {totalWinMethods > 0 ? Math.round((winMethods.ko / totalWinMethods) * 100) : 0}%
                </Text>
              </View>

              {/* Submission */}
              <View style={styles.winMethodRow}>
                <View style={styles.winMethodInfo}>
                  <Text style={[styles.winMethodValue, { color: colors.text }]}>
                    {winMethods.sub}
                  </Text>
                  <Text style={[styles.winMethodLabel, { color: colors.textSecondary }]}>
                    Submission
                  </Text>
                </View>
                <View style={[styles.winMethodBarTrack, { backgroundColor: colors.surfaceAlt }]}>
                  <View
                    style={[
                      styles.winMethodBarFill,
                      {
                        backgroundColor: colors.accent,
                        width: `${totalWinMethods > 0 ? (winMethods.sub / totalWinMethods) * 100 : 0}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.winMethodPct, { color: colors.textTertiary }]}>
                  {totalWinMethods > 0 ? Math.round((winMethods.sub / totalWinMethods) * 100) : 0}%
                </Text>
              </View>

              {/* Decision */}
              <View style={styles.winMethodRow}>
                <View style={styles.winMethodInfo}>
                  <Text style={[styles.winMethodValue, { color: colors.text }]}>
                    {winMethods.dec}
                  </Text>
                  <Text style={[styles.winMethodLabel, { color: colors.textSecondary }]}>
                    Decision
                  </Text>
                </View>
                <View style={[styles.winMethodBarTrack, { backgroundColor: colors.surfaceAlt }]}>
                  <View
                    style={[
                      styles.winMethodBarFill,
                      {
                        backgroundColor: colors.success,
                        width: `${totalWinMethods > 0 ? (winMethods.dec / totalWinMethods) * 100 : 0}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.winMethodPct, { color: colors.textTertiary }]}>
                  {totalWinMethods > 0 ? Math.round((winMethods.dec / totalWinMethods) * 100) : 0}%
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Career Stats */}
        <Card style={styles.statsCard}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            CAREER STATISTICS
          </Text>

          {hasCareerStats && fighter.career_stats ? (
            <>
              <View style={styles.statsSection}>
                <Text style={[styles.statsSectionTitle, { color: colors.text }]}>Striking</Text>
                {renderStatBar('Str. Accuracy', fighter.career_stats.str_acc, 100)}
                {renderStatBar('Str. Defense', fighter.career_stats.str_def, 100)}
                {renderStatBar('SLpM', fighter.career_stats.slpm, 8, colors.accent)}
                {renderStatBar('SApM', fighter.career_stats.sapm, 8, colors.danger)}
              </View>

              <View style={[styles.divider, { backgroundColor: colors.divider }]} />

              <View style={styles.statsSection}>
                <Text style={[styles.statsSectionTitle, { color: colors.text }]}>Grappling</Text>
                {renderStatBar('TD Accuracy', fighter.career_stats.td_acc, 100)}
                {renderStatBar('TD Defense', fighter.career_stats.td_def, 100)}
                {renderStatBar('TD Avg (15min)', fighter.career_stats.td_avg, 5)}
                {renderStatBar('Sub Avg (15min)', fighter.career_stats.sub_avg, 3)}
              </View>
            </>
          ) : (
            <Text style={[styles.noStatsText, { color: colors.textTertiary }]}>
              Career statistics not available for this fighter.
            </Text>
          )}
        </Card>

        {/* Fight History */}
        <View style={styles.historySection}>
          <Text style={[styles.historySectionTitle, { color: colors.text }]}>
            Fight History
          </Text>
          <Text style={[styles.historySectionSubtitle, { color: colors.textTertiary }]}>
            {history.length} professional fight{history.length !== 1 ? 's' : ''}
          </Text>

          {history.length === 0 ? (
            <EmptyState
              icon="fitness-outline"
              title="No Fight History"
              message="No recorded fights for this fighter."
            />
          ) : (
            <View style={styles.historyList}>
              {history.map((fight, index) => renderFightCard(fight, index))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Global Tab Bar for navigation consistency */}
      <GlobalTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.md,
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },

  // Hero Section
  heroContent: {
    alignItems: 'center',
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarLargeText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  fighterName: {
    ...displayTypography.fighterNameLarge,
    marginBottom: 4,
    textAlign: 'center',
  },
  nickname: {
    fontSize: 16,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.sm,
  },
  rankBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  weightBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  weightBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  record: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  formLabel: {
    fontSize: 12,
  },
  formDot: {
    width: 22,
    height: 22,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formDotText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  // Bio Card
  bioCard: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  noStatsText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  bioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  bioItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  bioValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  bioLabel: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Stats Card
  statsCard: {
    padding: spacing.md,
  },
  statsSection: {
    marginBottom: spacing.md,
  },
  statsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  statBarContainer: {
    marginBottom: spacing.sm,
  },
  statBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statBarLabel: {
    fontSize: 12,
  },
  statBarValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  statBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  statBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },

  // Fight History
  historySection: {
    marginTop: spacing.sm,
  },
  historySectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  historySectionSubtitle: {
    fontSize: 13,
    marginBottom: spacing.md,
  },
  historyList: {
    gap: spacing.sm,
  },
  fightCard: {
    borderRadius: radius.card,
    padding: spacing.md,
  },
  fightCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  resultBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  resultText: {
    fontSize: 12,
    fontWeight: '700',
  },
  fightDate: {
    fontSize: 12,
  },
  fightCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  opponentLabel: {
    fontSize: 12,
    marginRight: spacing.xs,
  },
  opponentName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  fightCardFooter: {
    marginBottom: spacing.xs,
  },
  fightMethod: {
    fontSize: 13,
    marginBottom: 2,
  },
  eventName: {
    fontSize: 12,
  },
  fightStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: 1,
  },
  fightStatItem: {
    alignItems: 'center',
  },
  fightStatValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  fightStatLabel: {
    fontSize: 10,
    marginTop: 2,
  },

  // Win Methods
  winMethodsList: {
    gap: spacing.sm,
  },
  winMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  winMethodInfo: {
    width: 70,
  },
  winMethodValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  winMethodLabel: {
    fontSize: 11,
    marginTop: -2,
  },
  winMethodBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  winMethodBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  winMethodPct: {
    width: 40,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
});
