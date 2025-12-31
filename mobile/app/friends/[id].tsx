/**
 * Friend Profile screen - view friend's picks and stats
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
import { useFriends } from '../../hooks/useFriends';
import { useToast } from '../../hooks/useToast';
import { ErrorState } from '../../components/ErrorState';
import { SkeletonCard } from '../../components/SkeletonCard';
import { EmptyState } from '../../components/EmptyState';
import { AccuracyRing } from '../../components/AccuracyRing';

interface FriendProfile {
  username: string;
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
  const { removeFriend, removeFriendLoading } = useFriends();

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
        .select('username')
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
      console.error('Error fetching friend data:', err);
      setError(err.message || 'Failed to load friend profile');
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

  const handleUnfriend = () => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${profile?.username} as a friend?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await removeFriend(id!);
              toast.showSuccess('Friend removed');
              router.back();
            } catch (error: any) {
              toast.showError(error.message || 'Failed to remove friend');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
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
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Error</Text>
          <View style={styles.placeholder} />
        </View>
        <ErrorState
          message={error || 'Failed to load friend profile'}
          onRetry={fetchFriendData}
        />
      </View>
    );
  }

  const renderPickItem = (pick: FriendPick) => {
    const pickedFighter = pick.picked_corner === 'red' ? pick.red_name : pick.blue_name;
    const isGraded = pick.is_correct !== null;

    return (
      <View key={pick.id} style={styles.pickCard}>
        <View style={styles.pickHeader}>
          <Text style={styles.eventName} numberOfLines={1}>
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
          <Text style={[styles.fighterName, pick.picked_corner === 'red' && styles.selectedFighter]}>
            {pick.red_name}
          </Text>
          <Text style={styles.vs}>vs</Text>
          <Text style={[styles.fighterName, pick.picked_corner === 'blue' && styles.selectedFighter]}>
            {pick.blue_name}
          </Text>
        </View>

        <Text style={styles.pickLabel}>
          Picked: <Text style={styles.pickedFighter}>{pickedFighter}</Text>
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{profile.username}</Text>
        <TouchableOpacity onPress={handleUnfriend} style={styles.unfriendButton}>
          <Ionicons name="person-remove-outline" size={22} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Profile Summary */}
      <View style={styles.profileSummary}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile.username.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.username}>{profile.username}</Text>
        <Text style={styles.statsText}>
          {profile.accuracy.toFixed(1)}% accuracy • {profile.total_picks} picks
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'picks' && styles.tabActive]}
          onPress={() => setActiveTab('picks')}
        >
          <Text style={[styles.tabText, activeTab === 'picks' && styles.tabTextActive]}>
            Picks
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.tabActive]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>
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
            tintColor="#d4202a"
            colors={['#d4202a']}
          />
        }
      >
        {activeTab === 'picks' ? (
          picks.length === 0 ? (
            <EmptyState
              icon="clipboard-outline"
              title="No Picks Yet"
              message={`${profile.username} hasn't made any picks yet.`}
            />
          ) : (
            picks.map(renderPickItem)
          )
        ) : (
          <View style={styles.statsContainer}>
            <View style={styles.accuracyRingContainer}>
              <AccuracyRing percentage={profile.accuracy} label="Accuracy" />
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile.total_picks}</Text>
                <Text style={styles.statLabel}>Total Picks</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile.correct_picks}</Text>
                <Text style={styles.statLabel}>Correct</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile.total_picks - profile.correct_picks}</Text>
                <Text style={styles.statLabel}>Missed</Text>
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
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#1a1a1a',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 32,
  },
  unfriendButton: {
    padding: 4,
  },
  profileSummary: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#d4202a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statsText: {
    fontSize: 14,
    color: '#999',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#d4202a',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  pickCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  pickHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventName: {
    fontSize: 12,
    color: '#999',
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
    marginBottom: 12,
  },
  fighterName: {
    fontSize: 14,
    color: '#fff',
    flex: 1,
  },
  selectedFighter: {
    color: '#d4202a',
    fontWeight: '600',
  },
  vs: {
    fontSize: 12,
    color: '#666',
    marginHorizontal: 12,
  },
  pickLabel: {
    fontSize: 13,
    color: '#999',
  },
  pickedFighter: {
    color: '#d4202a',
    fontWeight: '600',
  },
  statsContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  accuracyRingContainer: {
    alignItems: 'center',
    marginBottom: 24,
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
    color: '#fff',
  },
  statLabel: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
});
