/**
 * Profile screen - username, detailed stats, settings
 * Combines profile info with detailed stats (formerly separate Stats tab)
 * Shows guest mode banner for unauthenticated users
 * Theme-aware design with SurfaceCard and entrance animations
 */

import { View, Text, StyleSheet, ScrollView, RefreshControl, Animated, Easing, TouchableOpacity } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/useAuth';
import { useGuestPicks } from '../../hooks/useGuestPicks';
import { useUserStats, useRecentPicksSummary } from '../../hooks/useQueries';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { SurfaceCard, Button, SegmentedControl, StatRing, EmptyState } from '../../components/ui';
import { ErrorState } from '../../components/ErrorState';
import { SkeletonProfileCard, SkeletonStats } from '../../components/SkeletonStats';
import { MiniChart } from '../../components/MiniChart';
import type { ThemeMode } from '../../lib/tokens';

// Animated section wrapper
function AnimatedSection({ children, index }: { children: React.ReactNode; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    const delay = 60 + index * 60;
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateAnim, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [fadeAnim, translateAnim, index]);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: translateAnim }],
      }}
    >
      {children}
    </Animated.View>
  );
}

export default function Profile() {
  const router = useRouter();
  const { colors, themeMode, setThemeMode } = useTheme();
  const { profile, user, signOut, isGuest } = useAuth();
  const { getTotalPickCount, getEventsPickedCount } = useGuestPicks();
  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useUserStats(user?.id || null);
  const { data: recentSummary, isLoading: summaryLoading, refetch: refetchSummary } = useRecentPicksSummary(
    user?.id || null,
    5
  );

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    if (!isGuest) {
      await Promise.all([refetchStats(), refetchSummary()]);
    }
    setRefreshing(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleSignIn = () => {
    router.push('/(auth)/sign-in');
  };

  // Guest mode profile
  if (isGuest) {
    const guestPickCount = getTotalPickCount();
    const guestEventsCount = getEventsPickedCount();

    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        {/* Guest Mode Banner */}
        <AnimatedSection index={0}>
          <SurfaceCard heroGlow style={styles.guestBanner}>
            <View style={[styles.guestIconContainer, { backgroundColor: colors.accent + '20' }]}>
              <Ionicons name="person-outline" size={32} color={colors.accent} />
            </View>
            <Text style={[styles.guestTitle, { color: colors.text }]}>
              Guest Mode
            </Text>
            <Text style={[styles.guestSubtext, { color: colors.textSecondary }]}>
              Picks saved on this device only
            </Text>
            <Button
              title="Create Account"
              onPress={handleSignIn}
              variant="primary"
            />
          </SurfaceCard>
        </AnimatedSection>

        {/* Local Stats */}
        <AnimatedSection index={1}>
          <SurfaceCard weakWash>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
              THIS SESSION
            </Text>

            <View style={styles.guestStatsGrid}>
              <View style={styles.guestStatItem}>
                <Text style={[styles.guestStatValue, { color: colors.accent }]}>
                  {guestPickCount}
                </Text>
                <Text style={[styles.guestStatLabel, { color: colors.textSecondary }]}>
                  Picks Made
                </Text>
              </View>

              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

              <View style={styles.guestStatItem}>
                <Text style={[styles.guestStatValue, { color: colors.accent }]}>
                  {guestEventsCount}
                </Text>
                <Text style={[styles.guestStatLabel, { color: colors.textSecondary }]}>
                  Events
                </Text>
              </View>
            </View>

            <View style={[styles.guestNotice, { backgroundColor: colors.surfaceAlt }]}>
              <Ionicons name="cloud-offline-outline" size={16} color={colors.textTertiary} />
              <Text style={[styles.guestNoticeText, { color: colors.textTertiary }]}>
                Sign in to save picks across devices
              </Text>
            </View>
          </SurfaceCard>
        </AnimatedSection>

        {/* Appearance Settings */}
        <AnimatedSection index={2}>
          <SurfaceCard weakWash>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
              APPEARANCE
            </Text>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="moon-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Theme
                </Text>
              </View>
            </View>

            <SegmentedControl<ThemeMode>
              options={[
                { value: 'system', label: 'System' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
              selectedValue={themeMode}
              onChange={setThemeMode}
            />
          </SurfaceCard>
        </AnimatedSection>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appInfoText, { color: colors.textTertiary }]}>
            UFC Picks Tracker v1.0.0
          </Text>
        </View>
      </ScrollView>
    );
  }

  if (statsLoading || summaryLoading) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <SkeletonProfileCard />
        <SkeletonStats />
        <SkeletonStats />
      </ScrollView>
    );
  }

  if (statsError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ErrorState
          message="Failed to load your profile. Check your connection and try again."
          onRetry={() => {
            refetchStats();
            refetchSummary();
          }}
        />
      </View>
    );
  }

  const hasStats = stats && stats.total_picks > 0;

  let sectionIndex = 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
    >
      {/* Profile Header */}
      <AnimatedSection index={sectionIndex++}>
        <SurfaceCard weakWash>
          <View style={styles.profileHeader}>
            <View style={[styles.avatar, { backgroundColor: colors.accentSoft }]}>
              <Text style={[styles.avatarText, { color: colors.accent }]}>
                {profile?.username.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>

            <View style={styles.profileInfo}>
              <Text style={[styles.username, { color: colors.text }]}>
                @{profile?.username || 'Unknown'}
              </Text>
              <Text style={[styles.email, { color: colors.textSecondary }]}>
                {user?.email || ''}
              </Text>
            </View>
          </View>
        </SurfaceCard>
      </AnimatedSection>

      {/* Overall Stats with Ring */}
      <AnimatedSection index={sectionIndex++}>
        <SurfaceCard heroGlow animatedBorder>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
            YOUR STATS
          </Text>

          {hasStats ? (
            <>
              {/* Accuracy Ring */}
              <View style={styles.accuracyRingContainer}>
                <StatRing percentage={stats.accuracy_pct} />
              </View>

              {/* Stats Grid */}
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {stats.total_picks}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    Total Picks
                  </Text>
                </View>

                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.success }]}>
                    {stats.correct_winner}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    Correct
                  </Text>
                </View>

                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.textTertiary }]}>
                    {stats.total_picks - stats.correct_winner}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    Missed
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <EmptyState
              icon="stats-chart-outline"
              title="No Stats Yet"
              message="Make some picks and check back after the event to see your results!"
            />
          )}
        </SurfaceCard>
      </AnimatedSection>

      {/* Streaks */}
      {hasStats && (
        <AnimatedSection index={sectionIndex++}>
          <SurfaceCard weakWash>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
              STREAKS
            </Text>

            <View style={styles.streaksContainer}>
              <View style={styles.streakItem}>
                <Text style={[styles.streakValue, { color: colors.accent }]}>
                  {stats.current_streak}
                </Text>
                <Text style={[styles.streakLabel, { color: colors.text }]}>
                  Current Streak
                </Text>
                <Text style={[styles.streakDescription, { color: colors.textTertiary }]}>
                  {stats.current_streak === 0
                    ? 'Start one with your next correct pick!'
                    : 'Consecutive correct'}
                </Text>
              </View>

              <View style={[styles.streakDivider, { backgroundColor: colors.border }]} />

              <View style={styles.streakItem}>
                <Text style={[styles.streakValue, { color: colors.warning }]}>
                  {stats.best_streak}
                </Text>
                <Text style={[styles.streakLabel, { color: colors.text }]}>
                  Best Streak
                </Text>
                <Text style={[styles.streakDescription, { color: colors.textTertiary }]}>
                  {stats.best_streak === 0
                    ? 'No best streak yet'
                    : 'Personal record'}
                </Text>
              </View>
            </View>
          </SurfaceCard>
        </AnimatedSection>
      )}

      {/* Recent Events with Chart */}
      {recentSummary && recentSummary.length > 0 && (
        <AnimatedSection index={sectionIndex++}>
          <SurfaceCard weakWash>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
              RECENT EVENTS
            </Text>

            {/* Mini Chart */}
            <View style={styles.chartContainer}>
              <MiniChart
                data={recentSummary.map((summary) => ({
                  eventName: summary.event.name,
                  accuracy: summary.total > 0 ? (summary.correct / summary.total) * 100 : 0,
                }))}
              />
            </View>

            {/* Chart Legend */}
            <Text style={[styles.chartLegend, { color: colors.textTertiary }]}>
              Your accuracy per event
            </Text>

            {/* Event list - compact cards */}
            <View style={styles.eventsList}>
              {recentSummary.map((summary) => {
                const accuracy =
                  summary.total > 0
                    ? Math.round((summary.correct / summary.total) * 100)
                    : 0;

                const getAccuracyColor = () => {
                  if (accuracy >= 70) return colors.success;
                  if (accuracy >= 50) return colors.warning;
                  return colors.danger;
                };

                const handleEventPress = () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/event/${summary.event.id}`);
                };

                return (
                  <TouchableOpacity
                    key={summary.event.id}
                    style={[styles.eventCard, { backgroundColor: colors.surfaceAlt }]}
                    onPress={handleEventPress}
                    activeOpacity={0.7}
                  >
                    <View style={styles.eventCardTop}>
                      <Text
                        style={[styles.eventCardName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {summary.event.name}
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
                    </View>

                    <View style={styles.eventCardBottom}>
                      <View style={styles.eventCardStats}>
                        <Text style={[styles.eventCardScore, { color: colors.textSecondary }]}>
                          {summary.correct}/{summary.total}
                        </Text>
                        <View style={[styles.eventCardBar, { backgroundColor: colors.border }]}>
                          <View
                            style={[
                              styles.eventCardBarFill,
                              {
                                width: `${accuracy}%`,
                                backgroundColor: getAccuracyColor(),
                              },
                            ]}
                          />
                        </View>
                      </View>
                      <Text style={[styles.eventCardAccuracy, { color: getAccuracyColor() }]}>
                        {accuracy}%
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </SurfaceCard>
        </AnimatedSection>
      )}

      {/* Appearance Settings */}
      <AnimatedSection index={sectionIndex++}>
        <SurfaceCard weakWash>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
            APPEARANCE
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="moon-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Theme
              </Text>
            </View>
          </View>

          <SegmentedControl<ThemeMode>
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            selectedValue={themeMode}
            onChange={setThemeMode}
          />
        </SurfaceCard>
      </AnimatedSection>

      {/* Sign Out */}
      <AnimatedSection index={sectionIndex++}>
        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="secondary"
        />
      </AnimatedSection>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={[styles.appInfoText, { color: colors.textTertiary }]}>
          UFC Picks Tracker v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 100, // Account for floating tab bar
    gap: spacing.lg,
  },
  cardLabel: {
    ...typography.caption,
    marginBottom: spacing.md,
  },
  // Profile Header
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  username: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  email: {
    ...typography.meta,
  },
  // Stats Ring & Grid
  accuracyRingContainer: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  statValue: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
  },
  // Streaks
  streaksContainer: {
    flexDirection: 'row',
  },
  streakItem: {
    flex: 1,
    alignItems: 'center',
  },
  streakValue: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  streakLabel: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  streakDescription: {
    ...typography.meta,
  },
  streakDivider: {
    width: 1,
    marginHorizontal: spacing.lg,
  },
  // Recent Events
  chartContainer: {
    marginVertical: spacing.md,
    marginHorizontal: -spacing.sm,
  },
  chartLegend: {
    ...typography.meta,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  // Compact event cards
  eventsList: {
    gap: spacing.sm,
  },
  eventCard: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.card,
  },
  eventCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  eventCardName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    marginRight: spacing.xs,
  },
  eventCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventCardStats: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginRight: spacing.sm,
  },
  eventCardScore: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 32,
  },
  eventCardBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  eventCardBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  eventCardAccuracy: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'right',
  },
  // Settings
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingLabel: {
    ...typography.body,
  },
  // App Info
  appInfo: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  appInfoText: {
    ...typography.meta,
  },
  // Guest Mode Styles
  guestBanner: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  guestIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  guestTitle: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  guestSubtext: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  guestStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  guestStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  guestStatValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  guestStatLabel: {
    ...typography.caption,
  },
  guestNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.card,
  },
  guestNoticeText: {
    ...typography.meta,
  },
});
