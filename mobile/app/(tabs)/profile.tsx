/**
 * Profile screen - username, stats summary, logout
 */

import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useUserStats } from '../../hooks/useQueries';

export default function Profile() {
  const router = useRouter();
  const { profile, user, signOut } = useAuth();
  const { data: stats, isLoading: statsLoading } = useUserStats(user?.id || null);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/(auth)/sign-in');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  if (statsLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#d4202a" />
      </View>
    );
  }

  const hasStats = stats && stats.total_picks > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
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
  signOutButton: {
    backgroundColor: '#262626',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  signOutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
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
