/**
 * User Profile screen - view any user's picks and stats from leaderboard
 * Shows appropriate friendship action based on relationship
 */

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useFriends } from '../../hooks/useFriends';
import { useToast } from '../../hooks/useToast';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { ErrorState } from '../../components/ErrorState';
import { SkeletonCard } from '../../components/SkeletonCard';
import { EmptyState, SurfaceCard } from '../../components/ui';
import { AccuracyRing } from '../../components/AccuracyRing';
import { MiniChart } from '../../components/MiniChart';
import type { FriendshipStatus } from '../../types/social';

interface UserProfile {
  username: string;
  total_picks: number;
  correct_picks: number;
  accuracy: number;
}

interface UserPick {
  id: string;
  red_name: string;
  blue_name: string;
  picked_corner: 'red' | 'blue';
  is_correct: boolean | null;
  winner_corner: 'red' | 'blue' | null;
}

interface EventGroup {
  event_id: string;
  event_name: string;
  event_date: string;
  picks: UserPick[];
  correct: number;
  total: number;
}

type TabType = 'picks' | 'stats';
type RelationshipStatus = 'none' | 'following';

export default function UserProfile() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const { follow, unfollow, followLoading, unfollowLoading } = useFriends();

  const [activeTab, setActiveTab] = useState<TabType>('picks');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [eventGroups, setEventGroups] = useState<EventGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false);

  // Entrance animations
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslate = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslate, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, 60);
  }, [headerOpacity, contentOpacity, contentTranslate]);

  const fetchUserData = async () => {
    if (!id || !user) return;

    try {
      setError(null);

      // Fetch user's profile and stats
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

      // Check if current user is following this user
      const { data: followData } = await supabase
        .from('friendships')
        .select('id')
        .eq('user_id', user.id)
        .eq('friend_id', id)
        .eq('status', 'accepted')
        .maybeSingle();

      setIsFollowing(!!followData);

      // Fetch user's picks with event info
      const { data: picksData, error: picksError } = await supabase
        .from('picks')
        .select(`
          id,
          picked_corner,
          score,
          bouts!inner (
            id,
            red_name,
            blue_name,
            event_id,
            results (
              winner_corner
            ),
            events!inner (
              id,
              name,
              event_date
            )
          )
        `)
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (picksError) throw picksError;

      // Group picks by event
      const eventMap = new Map<string, EventGroup>();

      (picksData || []).forEach((pick: any) => {
        const eventId = pick.bouts.events.id;
        const eventName = pick.bouts.events.name;
        const eventDate = pick.bouts.events.event_date;

        if (!eventMap.has(eventId)) {
          eventMap.set(eventId, {
            event_id: eventId,
            event_name: eventName,
            event_date: eventDate,
            picks: [],
            correct: 0,
            total: 0,
          });
        }

        const group = eventMap.get(eventId)!;
        const isCorrect = pick.score === 1;
        const isGraded = pick.score !== null;

        group.picks.push({
          id: pick.id,
          red_name: pick.bouts.red_name,
          blue_name: pick.bouts.blue_name,
          picked_corner: pick.picked_corner,
          is_correct: isGraded ? isCorrect : null,
          winner_corner: pick.bouts.results?.[0]?.winner_corner || null,
        });

        group.total++;
        if (isCorrect) group.correct++;
      });

      // Sort events by date (most recent first)
      const sortedGroups = Array.from(eventMap.values()).sort(
        (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
      );

      setEventGroups(sortedGroups);
    } catch (err: any) {
      console.error('Error fetching user data:', err);
      setError(err.message || 'Failed to load user profile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [id, user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
    setRefreshing(false);
  };

  const handleFollow = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await follow(id!);
      setIsFollowing(true);
      toast.showNeutral('Now following @' + profile?.username);
    } catch (error: any) {
      toast.showError(error.message || 'Failed to follow');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleFollowingTap = () => {
    // First tap: show unfollow confirmation state
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowUnfollowConfirm(true);
    // Auto-reset after 3 seconds if user doesn't confirm
    setTimeout(() => setShowUnfollowConfirm(false), 3000);
  };

  const handleUnfollow = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await unfollow(id!);
      setIsFollowing(false);
      setShowUnfollowConfirm(false);
      toast.showNeutral('Unfollowed @' + profile?.username);
    } catch (error: any) {
      toast.showError(error.message || 'Failed to unfollow');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderFollowAction = () => {
    const isActionLoading = followLoading || unfollowLoading;

    if (isFollowing) {
      // Two-tap unfollow: first tap shows "Unfollow", second tap confirms
      if (showUnfollowConfirm) {
        return (
          <TouchableOpacity
            onPress={handleUnfollow}
            disabled={isActionLoading}
            activeOpacity={0.8}
            style={[styles.followBadge, { backgroundColor: colors.danger }]}
          >
            {unfollowLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[styles.followBadgeText, { color: '#fff' }]}>Unfollow</Text>
            )}
          </TouchableOpacity>
        );
      }

      return (
        <TouchableOpacity
          onPress={handleFollowingTap}
          disabled={isActionLoading}
          activeOpacity={0.8}
          style={[styles.followBadge, { backgroundColor: colors.surfaceAlt }]}
        >
          <Ionicons name="checkmark-circle" size={14} color={colors.textSecondary} />
          <Text style={[styles.followBadgeText, { color: colors.textSecondary }]}>Following</Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        onPress={handleFollow}
        disabled={isActionLoading}
        activeOpacity={0.8}
        style={[styles.followBadge, { backgroundColor: colors.accent }]}
      >
        {followLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={[styles.followBadgeText, { color: '#fff' }]}>Follow</Text>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Loading...</Text>
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
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Error</Text>
          <View style={styles.placeholder} />
        </View>
        <ErrorState
          message={error || 'Failed to load user profile'}
          onRetry={fetchUserData}
        />
      </View>
    );
  }

  const renderEventCard = (group: EventGroup, index: number) => {
    const accuracy = group.total > 0 ? Math.round((group.correct / group.total) * 100) : 0;

    const getAccuracyColor = () => {
      if (accuracy >= 70) return colors.success;
      if (accuracy >= 50) return colors.warning;
      return colors.danger;
    };

    return (
      <TouchableOpacity
        key={group.event_id}
        style={[styles.eventCard, { backgroundColor: colors.surfaceAlt }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/event/${group.event_id}`);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.eventCardTop}>
          <Text
            style={[styles.eventCardName, { color: colors.text }]}
            numberOfLines={1}
          >
            {group.event_name}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
        </View>

        <View style={styles.eventCardBottom}>
          <View style={styles.eventCardStats}>
            <Text style={[styles.eventCardScore, { color: colors.textSecondary }]}>
              {group.correct}/{group.total}
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
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header */}
      <Animated.View style={{ opacity: headerOpacity }}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>@{profile.username}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Profile Summary */}
        <View style={[styles.profileSummary, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={styles.avatarText}>
              {profile.username.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.username, { color: colors.text }]}>@{profile.username}</Text>

          {/* Professional Stats Row */}
          <View style={styles.profileStatsRow}>
            <View style={styles.profileStatItem}>
              <Text style={[styles.profileStatValue, { color: colors.accent }]}>
                {profile.accuracy.toFixed(1)}%
              </Text>
              <Text style={[styles.profileStatLabel, { color: colors.textTertiary }]}>
                Accuracy
              </Text>
            </View>
            <View style={[styles.profileStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.profileStatItem}>
              <Text style={[styles.profileStatValue, { color: colors.text }]}>
                {profile.total_picks}
              </Text>
              <Text style={[styles.profileStatLabel, { color: colors.textTertiary }]}>
                Picks
              </Text>
            </View>
            <View style={[styles.profileStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.profileStatItem}>
              <Text style={[styles.profileStatValue, { color: colors.success }]}>
                {profile.correct_picks}
              </Text>
              <Text style={[styles.profileStatLabel, { color: colors.textTertiary }]}>
                Correct
              </Text>
            </View>
          </View>

          <View style={styles.actionContainer}>
            {renderFollowAction()}
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'picks' && { borderBottomColor: colors.accent }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab('picks');
            }}
          >
            <Text style={[
              styles.tabText,
              { color: colors.textTertiary },
              activeTab === 'picks' && { color: colors.text }
            ]}>
              Picks
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'stats' && { borderBottomColor: colors.accent }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab('stats');
            }}
          >
            <Text style={[
              styles.tabText,
              { color: colors.textTertiary },
              activeTab === 'stats' && { color: colors.text }
            ]}>
              Stats
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

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
          eventGroups.length === 0 ? (
            <EmptyState
              icon="clipboard-outline"
              title="No Picks Yet"
              message={`@${profile.username} hasn't made any picks yet.`}
            />
          ) : (
            <View style={styles.eventsList}>
              {eventGroups.map((group, index) => renderEventCard(group, index))}
            </View>
          )
        ) : (
          <Animated.View
            style={{
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslate }],
              gap: spacing.md,
            }}
          >
            <SurfaceCard heroGlow animatedBorder>
              <View style={styles.accuracyRingContainer}>
                <AccuracyRing percentage={profile.accuracy} label="Accuracy" size={120} />
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{profile.total_picks}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Picks</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.success }]}>{profile.correct_picks}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Correct</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.textTertiary }]}>
                    {profile.total_picks - profile.correct_picks}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Missed</Text>
                </View>
              </View>
            </SurfaceCard>

            {/* Recent Events Chart */}
            {eventGroups.length > 0 && (
              <SurfaceCard weakWash>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  RECENT EVENTS
                </Text>

                <View style={styles.chartContainer}>
                  <MiniChart
                    data={eventGroups.slice(0, 5).map((group) => ({
                      eventName: group.event_name,
                      accuracy: group.total > 0 ? (group.correct / group.total) * 100 : 0,
                    }))}
                  />
                </View>

                <Text style={[styles.chartLegend, { color: colors.textTertiary }]}>
                  Accuracy per event
                </Text>

                {/* Event List */}
                {eventGroups.slice(0, 5).map((group, index) => {
                  const accuracy = group.total > 0 ? Math.round((group.correct / group.total) * 100) : 0;
                  const getAccuracyColor = () => {
                    if (accuracy >= 70) return colors.success;
                    if (accuracy >= 50) return colors.warning;
                    return colors.danger;
                  };

                  return (
                    <TouchableOpacity
                      key={group.event_id}
                      style={styles.recentEventItem}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push(`/event/${group.event_id}`);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.recentEventHeader}>
                        <Text
                          style={[styles.recentEventName, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {group.event_name}
                        </Text>
                        <View style={styles.recentEventRight}>
                          <Text style={[styles.recentEventDate, { color: colors.textTertiary }]}>
                            {new Date(group.event_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </Text>
                          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                        </View>
                      </View>
                      <View style={styles.recentEventStats}>
                        <Text style={[styles.recentEventScore, { color: colors.text }]}>
                          {group.correct} / {group.total}
                        </Text>
                        <Text style={[styles.recentEventAccuracy, { color: getAccuracyColor() }]}>
                          {accuracy}%
                        </Text>
                      </View>
                      {index < Math.min(eventGroups.length, 5) - 1 && (
                        <View style={[styles.recentEventDivider, { backgroundColor: colors.border }]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </SurfaceCard>
            )}
          </Animated.View>
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
    paddingHorizontal: spacing.md,
    paddingTop: 60,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  placeholder: {
    width: 32,
  },
  profileSummary: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  username: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  // Professional stats row
  profileStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  profileStatItem: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  profileStatValue: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  profileStatLabel: {
    fontSize: 9,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  profileStatDivider: {
    width: 1,
    height: 22,
  },
  actionContainer: {
    marginTop: 2,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  pendingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  followBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
    minWidth: 100,
  },
  followBadgeText: {
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 15,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 40,
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
  // Stats Tab Styles
  accuracyRingContainer: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statsGrid: {
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
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  // Chart and Recent Events Styles
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  chartContainer: {
    marginVertical: spacing.sm,
    marginHorizontal: -spacing.sm,
  },
  chartLegend: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  recentEventItem: {
    paddingVertical: spacing.sm,
  },
  recentEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  recentEventName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  recentEventRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  recentEventDate: {
    fontSize: 12,
  },
  recentEventStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentEventScore: {
    fontSize: 14,
    fontWeight: '600',
  },
  recentEventAccuracy: {
    fontSize: 14,
    fontWeight: '700',
  },
  recentEventDivider: {
    height: 1,
    marginTop: spacing.sm,
  },
});
