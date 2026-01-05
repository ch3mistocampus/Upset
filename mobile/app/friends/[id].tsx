/**
 * User Profile screen - view user's picks and stats
 */

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useFriends } from '../../hooks/useFriends';
import { useToast } from '../../hooks/useToast';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { ErrorState } from '../../components/ErrorState';
import { SkeletonCard } from '../../components/SkeletonCard';
import { EmptyState } from '../../components/EmptyState';
import { AccuracyRing } from '../../components/AccuracyRing';
import { Avatar } from '../../components/Avatar';

interface FriendProfile {
  username: string;
  bio: string | null;
  avatar_url: string | null;
  total_picks: number;
  correct_picks: number;
  accuracy: number;
}

interface FriendPick {
  id: string;
  event_name: string;
  event_date: string;
  red_name: string;
  blue_name: string;
  picked_corner: 'red' | 'blue';
  is_correct: boolean | null;
  winner_corner: 'red' | 'blue' | null;
}

type TabType = 'picks' | 'stats';

export default function FriendProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();
  const { unfollow, unfollowLoading } = useFriends();

  const [activeTab, setActiveTab] = useState<TabType>('picks');
  const [profile, setProfile] = useState<FriendProfile | null>(null);
  const [picks, setPicks] = useState<FriendPick[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFriendData = async () => {
    if (!id) return;

    try {
      setError(null);

      // Fetch friend's profile and stats
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username, bio, avatar_url')
        .eq('user_id', id)
        .single();

      if (profileError) throw profileError;

      const { data: statsData } = await supabase
        .from('user_stats')
        .select('total_picks, correct_winner')
        .eq('user_id', id)
        .single();

      const totalPicks = statsData?.total_picks || 0;
      const correctPicks = statsData?.correct_winner || 0;
      const accuracy = totalPicks > 0 ? (correctPicks / totalPicks) * 100 : 0;

      setProfile({
        username: profileData.username,
        bio: profileData.bio,
        avatar_url: profileData.avatar_url,
        total_picks: totalPicks,
        correct_picks: correctPicks,
        accuracy,
      });

      // Fetch friend's picks with event info
      const { data: picksData, error: picksError } = await supabase
        .from('picks')
        .select(`
          id,
          picked_corner,
          is_correct,
          bouts!inner (
            red_name,
            blue_name,
            winner_corner,
            events!inner (
              name,
              event_date
            )
          )
        `)
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (picksError) throw picksError;

      const formattedPicks: FriendPick[] = (picksData || []).map((pick: any) => ({
        id: pick.id,
        event_name: pick.bouts.events.name,
        event_date: pick.bouts.events.event_date,
        red_name: pick.bouts.red_name,
        blue_name: pick.bouts.blue_name,
        picked_corner: pick.picked_corner,
        is_correct: pick.is_correct,
        winner_corner: pick.bouts.winner_corner,
      }));

      setPicks(formattedPicks);
    } catch (err: any) {
      logger.error('Error fetching user data', err as Error);
      setError(err.message || 'Failed to load user profile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFriendData();
  }, [id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFriendData();
    setRefreshing(false);
  };

  const handleUnfollow = () => {
    Alert.alert(
      'Unfollow',
      `Are you sure you want to unfollow @${profile?.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unfollow',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await unfollow(id!);
              toast.showSuccess(`Unfollowed @${profile?.username}`);
              router.back();
            } catch (error: any) {
              toast.showError(error.message || 'Failed to unfollow');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Loading...</Text>
          <View style={styles.placeholder} />
        </View>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </ScrollView>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Error</Text>
          <View style={styles.placeholder} />
        </View>
        <ErrorState
          message={error || 'Failed to load user profile'}
          onRetry={fetchFriendData}
        />
      </View>
    );
  }

  const renderPickItem = (pick: FriendPick) => {
    const pickedFighter = pick.picked_corner === 'red' ? pick.red_name : pick.blue_name;
    const isGraded = pick.is_correct !== null;

    return (
      <View key={pick.id} style={[styles.pickCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.pickHeader}>
          <Text style={[styles.eventName, { color: colors.textTertiary }]} numberOfLines={1}>
            {pick.event_name}
          </Text>
          {isGraded && (
            <View style={[styles.resultBadge, pick.is_correct ? styles.winBadge : styles.lossBadge]}>
              <Text style={styles.resultBadgeText}>
                {pick.is_correct ? 'W' : 'L'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.fightInfo}>
          <Text style={[styles.fighterName, { color: colors.textPrimary }, pick.picked_corner === 'red' && { color: colors.accent, fontWeight: '600' }]}>
            {pick.red_name}
          </Text>
          <Text style={[styles.vs, { color: colors.textTertiary }]}>vs</Text>
          <Text style={[styles.fighterName, { color: colors.textPrimary }, pick.picked_corner === 'blue' && { color: colors.accent, fontWeight: '600' }]}>
            {pick.blue_name}
          </Text>
        </View>

        <Text style={[styles.pickLabel, { color: colors.textSecondary }]}>
          Picked: <Text style={[styles.pickedFighter, { color: colors.accent }]}>{pickedFighter}</Text>
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>@{profile.username}</Text>
        <TouchableOpacity onPress={handleUnfollow} style={styles.unfriendButton}>
          <Ionicons name="person-remove-outline" size={22} color={colors.danger} />
        </TouchableOpacity>
      </View>

      {/* Profile Summary */}
      <View style={[styles.profileSummary, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Avatar
          imageUrl={profile.avatar_url}
          username={profile.username}
          size="large"
          expandable
        />
        <Text style={[styles.username, { color: colors.textPrimary }]}>@{profile.username}</Text>

        {/* Bio */}
        {profile.bio && (
          <Text style={[styles.bioText, { color: colors.textSecondary }]}>
            {profile.bio}
          </Text>
        )}

        <Text style={[styles.statsText, { color: colors.textTertiary }]}>
          {profile.accuracy.toFixed(1)}% accuracy • {profile.total_picks} picks
        </Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'picks' && { borderBottomColor: colors.accent }]}
          onPress={() => setActiveTab('picks')}
        >
          <Text style={[styles.tabText, { color: colors.textTertiary }, activeTab === 'picks' && { color: colors.textPrimary }]}>
            Picks
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && { borderBottomColor: colors.accent }]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.tabText, { color: colors.textTertiary }, activeTab === 'stats' && { color: colors.textPrimary }]}>
            Stats
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
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
        {activeTab === 'picks' ? (
          picks.length === 0 ? (
            <EmptyState
              icon="clipboard-outline"
              title="No Picks Yet"
              message={`@${profile.username} hasn't made any picks yet.`}
            />
          ) : (
            picks.map(renderPickItem)
          )
        ) : (
          <View style={[styles.statsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.accuracyRingContainer}>
              <AccuracyRing percentage={profile.accuracy} label="Accuracy" />
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{profile.total_picks}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Picks</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.success }]}>{profile.correct_picks}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Correct</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.danger }]}>{profile.total_picks - profile.correct_picks}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Missed</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
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
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
  },
  placeholder: {
    width: 32,
  },
  unfriendButton: {
    padding: spacing.xs,
  },
  profileSummary: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
  },
  username: {
    ...typography.h2,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  bioText: {
    ...typography.body,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  statsText: {
    ...typography.meta,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    ...typography.body,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  pickCard: {
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  pickHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  eventName: {
    ...typography.caption,
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  winBadge: {
    backgroundColor: '#22c55e',
  },
  lossBadge: {
    backgroundColor: '#ef4444',
  },
  resultBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  fightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  fighterName: {
    ...typography.body,
    flex: 1,
  },
  vs: {
    ...typography.meta,
    marginHorizontal: spacing.md,
  },
  pickLabel: {
    ...typography.meta,
  },
  pickedFighter: {
    fontWeight: '600',
  },
  statsContainer: {
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 1,
  },
  accuracyRingContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    ...typography.meta,
    marginTop: spacing.xs,
  },
});
