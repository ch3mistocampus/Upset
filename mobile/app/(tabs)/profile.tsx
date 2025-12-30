/**
 * Profile screen - username, stats summary, logout
 */

import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useUserStats } from '../../hooks/useQueries';
import { useToast } from '../../hooks/useToast';
import { ErrorState } from '../../components/ErrorState';
import { SkeletonProfileCard, SkeletonStats } from '../../components/SkeletonStats';

export default function Profile() {
  const router = useRouter();
  const toast = useToast();
  const { profile, user, signOut } = useAuth();
  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useUserStats(user?.id || null);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchStats();
    setRefreshing(false);
  };

  const handleOpenSettings = () => {
    router.push('/settings');
  };

  if (statsLoading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <SkeletonProfileCard />
        <SkeletonStats />
      </ScrollView>
    );
  }

  if (statsError) {
    return (
      <ErrorState
        message="Failed to load your profile. Check your connection and try again."
        onRetry={() => refetchStats()}
      />
    );
  }

  const hasStats = stats && stats.total_picks > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#d4202a"
          colors={['#d4202a']}
        />
      }
    >
      {/* Profile Header */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>PROFILE</Text>

        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.username.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.username}>{profile?.username || 'Unknown'}</Text>
            <Text style={styles.email}>{user?.email || ''}</Text>
          </View>
        </View>
      </View>

      {/* Stats Summary */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>YOUR STATS</Text>

        {hasStats ? (
          <>
            <View style={styles.statRow}>
              <Text style={styles.statRowLabel}>Total Picks</Text>
              <Text style={styles.statRowValue}>{stats.total_picks}</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statRowLabel}>Correct Picks</Text>
              <Text style={styles.statRowValue}>{stats.correct_winner}</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statRowLabel}>Accuracy</Text>
              <Text style={[styles.statRowValue, styles.accuracyValue]}>
                {stats.accuracy_pct.toFixed(1)}%
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.statRow}>
              <Text style={styles.statRowLabel}>Current Streak</Text>
              <Text style={styles.statRowValue}>{stats.current_streak}</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statRowLabel}>Best Streak</Text>
              <Text style={[styles.statRowValue, styles.bestStreakValue]}>
                {stats.best_streak}
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.noStatsText}>No picks yet. Make some predictions!</Text>
        )}
      </View>

      {/* Actions */}
      <TouchableOpacity style={styles.settingsButton} onPress={handleOpenSettings}>
        <Text style={styles.settingsText}>Settings</Text>
      </TouchableOpacity>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>UFC Picks Tracker v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#999',
    letterSpacing: 1,
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#d4202a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#999',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statRowLabel: {
    fontSize: 16,
    color: '#fff',
  },
  statRowValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  accuracyValue: {
    color: '#d4202a',
  },
  bestStreakValue: {
    color: '#fbbf24',
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 8,
  },
  noStatsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 12,
  },
  settingsButton: {
    backgroundColor: '#d4202a',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  settingsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  appInfoText: {
    fontSize: 12,
    color: '#666',
  },
});
