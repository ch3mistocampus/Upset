/**
 * Profile screen - username, stats summary, settings
 */

import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useUserStats } from '../../hooks/useQueries';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { Card, Button, SegmentedControl } from '../../components/ui';
import { ErrorState } from '../../components/ErrorState';
import { SkeletonProfileCard, SkeletonStats } from '../../components/SkeletonStats';
import type { ThemeMode } from '../../lib/tokens';

export default function Profile() {
  const router = useRouter();
  const { colors, themeMode, setThemeMode } = useTheme();
  const { profile, user, signOut } = useAuth();
  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useUserStats(user?.id || null);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchStats();
    setRefreshing(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (statsLoading) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <SkeletonProfileCard />
        <SkeletonStats />
      </ScrollView>
    );
  }

  if (statsError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ErrorState
          message="Failed to load your profile. Check your connection and try again."
          onRetry={() => refetchStats()}
        />
      </View>
    );
  }

  const hasStats = stats && stats.total_picks > 0;

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
      <Card>
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: colors.accentSoft }]}>
            <Text style={[styles.avatarText, { color: colors.accent }]}>
              {profile?.username.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>

          <View style={styles.profileInfo}>
            <Text style={[styles.username, { color: colors.textPrimary }]}>
              {profile?.username || 'Unknown'}
            </Text>
            <Text style={[styles.email, { color: colors.textSecondary }]}>
              {user?.email || ''}
            </Text>
          </View>
        </View>
      </Card>

      {/* Stats Summary */}
      <Card>
        <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
          YOUR STATS
        </Text>

        {hasStats ? (
          <>
            <View style={styles.statRow}>
              <Text style={[styles.statRowLabel, { color: colors.textPrimary }]}>
                Total Picks
              </Text>
              <Text style={[styles.statRowValue, { color: colors.textPrimary }]}>
                {stats.total_picks}
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text style={[styles.statRowLabel, { color: colors.textPrimary }]}>
                Correct Picks
              </Text>
              <Text style={[styles.statRowValue, { color: colors.success }]}>
                {stats.correct_winner}
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text style={[styles.statRowLabel, { color: colors.textPrimary }]}>
                Accuracy
              </Text>
              <Text style={[styles.statRowValue, { color: colors.accent }]}>
                {stats.accuracy_pct.toFixed(1)}%
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            <View style={styles.statRow}>
              <Text style={[styles.statRowLabel, { color: colors.textPrimary }]}>
                Current Streak
              </Text>
              <Text style={[styles.statRowValue, { color: colors.textPrimary }]}>
                {stats.current_streak}
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text style={[styles.statRowLabel, { color: colors.textPrimary }]}>
                Best Streak
              </Text>
              <Text style={[styles.statRowValue, { color: colors.warning }]}>
                {stats.best_streak}
              </Text>
            </View>
          </>
        ) : (
          <Text style={[styles.noStatsText, { color: colors.textSecondary }]}>
            No picks yet. Make some predictions!
          </Text>
        )}
      </Card>

      {/* Appearance */}
      <Card>
        <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
          APPEARANCE
        </Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="moon-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
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
      </Card>

      {/* Sign Out */}
      <Button
        title="Sign Out"
        onPress={handleSignOut}
        variant="secondary"
      />

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
    gap: spacing.lg,
  },
  cardLabel: {
    ...typography.caption,
    marginBottom: spacing.md,
  },
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
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  statRowLabel: {
    ...typography.body,
  },
  statRowValue: {
    ...typography.body,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm,
  },
  noStatsText: {
    ...typography.body,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
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
  appInfo: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  appInfoText: {
    ...typography.meta,
  },
});
