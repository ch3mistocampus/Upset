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
  Image,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { useFriends } from '../../../hooks/useFriends';
import { useBlocking } from '../../../hooks/useBlocking';
import { useMute } from '../../../hooks/useMute';
import { useShare } from '../../../hooks/useShare';
import { useToast } from '../../../hooks/useToast';
import { useTheme } from '../../../lib/theme';
import { spacing, radius, typography } from '../../../lib/tokens';
import { ErrorState } from '../../../components/ErrorState';
import { SkeletonCard } from '../../../components/SkeletonCard';
import { EmptyState, SurfaceCard } from '../../../components/ui';
import { AccuracyRing } from '../../../components/AccuracyRing';
import { MiniChart } from '../../../components/MiniChart';
import type { FriendshipStatus } from '../../../types/social';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface UserProfile {
  username: string;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  total_picks: number;
  correct_picks: number;
  accuracy: number;
  following_count: number;
  followers_count: number;
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
  const { colors, isDark } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const { follow, unfollow, followLoading, unfollowLoading } = useFriends();
  const { blockedUsers, block, unblock, blockLoading } = useBlocking();
  const { mutedUsers, mute, unmute, isMuting } = useMute();
  const { shareProfile } = useShare();

  const [activeTab, setActiveTab] = useState<TabType>('picks');
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [eventGroups, setEventGroups] = useState<EventGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // Check if viewing own profile
  const isOwnProfile = user?.id === id;

  // Check mute/block status
  const isMuted = mutedUsers?.some((m) => m.muted_user_id === id) ?? false;
  const isBlocked = blockedUsers?.some((b) => b.user_id === id) ?? false;

  // Entrance animations
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslate = useRef(new Animated.Value(6)).current;
  const modalScale = useRef(new Animated.Value(0.8)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

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

  // Animate avatar modal
  useEffect(() => {
    if (showAvatarModal) {
      Animated.parallel([
        Animated.spring(modalScale, {
          toValue: 1,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(modalOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      modalScale.setValue(0.8);
      modalOpacity.setValue(0);
    }
  }, [showAvatarModal, modalScale, modalOpacity]);

  const fetchUserData = async () => {
    if (!id || !user) return;

    try {
      setError(null);

      // Fetch user's profile and stats
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

      // Get following count (users this person follows)
      const { count: followingCount } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', id)
        .eq('status', 'accepted');

      // Get followers count (users following this person)
      const { count: followersCount } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .eq('friend_id', id)
        .eq('status', 'accepted');

      setProfile({
        username: profileData.username,
        bio: profileData.bio,
        avatar_url: profileData.avatar_url || null,
        banner_url: null, // Not stored in DB yet, use gradient fallback
        total_picks: totalPicks,
        correct_picks: correctPicks,
        accuracy,
        following_count: followingCount || 0,
        followers_count: followersCount || 0,
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

  const handleMuteToggle = async () => {
    setShowActionMenu(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (isMuted) {
        await unmute(id!);
        toast.showNeutral(`Unmuted @${profile?.username}`);
      } else {
        await mute(id!);
        toast.showNeutral(`Muted @${profile?.username}`);
      }
    } catch (error: any) {
      toast.showError(error.message || 'Failed to update mute status');
    }
  };

  const handleBlockToggle = async () => {
    setShowActionMenu(false);
    if (isBlocked) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        await unblock(id!);
        toast.showNeutral(`Unblocked @${profile?.username}`);
      } catch (error: any) {
        toast.showError(error.message || 'Failed to unblock');
      }
    } else {
      Alert.alert(
        'Block User',
        `Are you sure you want to block @${profile?.username}? They won't be able to see your profile or activity.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block',
            style: 'destructive',
            onPress: async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              try {
                await block(id!);
                toast.showNeutral(`Blocked @${profile?.username}`);
                router.back();
              } catch (error: any) {
                toast.showError(error.message || 'Failed to block');
              }
            },
          },
        ]
      );
    }
  };

  const handleShare = async () => {
    setShowActionMenu(false);
    if (profile) {
      await shareProfile(id!, profile.username);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderFollowAction = () => {
    // If viewing own profile, show "This is you" badge
    if (isOwnProfile) {
      return (
        <View style={[styles.followBadge, { backgroundColor: colors.surfaceAlt }]}>
          <Ionicons name="person" size={14} color={colors.textSecondary} />
          <Text style={[styles.followBadgeText, { color: colors.textSecondary }]}>This is you</Text>
        </View>
      );
    }

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
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
          {!isOwnProfile ? (
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowActionMenu(true);
              }}
              style={styles.menuButton}
            >
              <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>

        {/* Hero Section with Banner */}
        <View style={styles.heroSection}>
          {/* Banner */}
          <View style={styles.bannerContainer}>
            {profile.banner_url ? (
              <Image
                source={{ uri: profile.banner_url }}
                style={styles.bannerImage}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={isDark ? ['#2A1A1A', '#1A1A2A'] : ['#FEE2E2', '#E0E7FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.bannerGradient}
              />
            )}
          </View>

          {/* Avatar - Rounded square, clickable to enlarge */}
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowAvatarModal(true);
            }}
            activeOpacity={0.8}
          >
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={[styles.avatarSquare, { backgroundColor: colors.accent }]} />
            ) : (
              <View style={[styles.avatarSquare, { backgroundColor: colors.accent }]}>
                <Text style={styles.avatarText}>
                  {profile.username.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Username */}
          <View style={styles.usernameRow}>
            <Text style={[styles.username, { color: colors.text }]}>@{profile.username}</Text>
            {isMuted && (
              <View
                style={[styles.mutedBadge, { backgroundColor: colors.surfaceAlt }]}
                accessibilityLabel="This user is muted"
              >
                <Ionicons name="volume-mute" size={12} color={colors.textTertiary} />
                <Text style={[styles.mutedBadgeText, { color: colors.textTertiary }]}>Muted</Text>
              </View>
            )}
          </View>

          {/* Bio */}
          {profile.bio && (
            <Text style={[styles.bio, { color: colors.textSecondary }]}>
              {profile.bio}
            </Text>
          )}

          {/* Main Stats Row - balanced spacing */}
          <View style={styles.mainStatsRow}>
            <View style={styles.mainStatItem}>
              <Text style={[styles.mainStatValue, { color: colors.accent }]}>
                {profile.accuracy.toFixed(1)}%
              </Text>
              <Text style={[styles.mainStatLabel, { color: colors.textSecondary }]}>ACCURACY</Text>
            </View>
            <View style={[styles.mainStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.mainStatItem}>
              <Text style={[styles.mainStatValue, { color: colors.text }]}>
                {profile.total_picks}
              </Text>
              <Text style={[styles.mainStatLabel, { color: colors.textSecondary }]}>PICKS</Text>
            </View>
            <View style={[styles.mainStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.mainStatItem}>
              <Text style={[styles.mainStatValue, { color: colors.success }]}>
                {profile.correct_picks}
              </Text>
              <Text style={[styles.mainStatLabel, { color: colors.textSecondary }]}>CORRECT</Text>
            </View>
          </View>

          {/* Followers/Following - Inline */}
          <View style={styles.socialRow}>
            <TouchableOpacity
              style={styles.socialItem}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/user/${id}/follows?tab=followers`);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.socialNumber, { color: colors.text }]}>
                {profile.followers_count.toLocaleString()}
              </Text>
              <Text style={[styles.socialLabel, { color: colors.textSecondary }]}>followers</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialItem}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/user/${id}/follows?tab=following`);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.socialNumber, { color: colors.text }]}>
                {profile.following_count.toLocaleString()}
              </Text>
              <Text style={[styles.socialLabel, { color: colors.textSecondary }]}>following</Text>
            </TouchableOpacity>
          </View>

          {/* Follow action */}
          <View style={styles.actionContainer}>
            {renderFollowAction()}
          </View>

          {/* Red Divider */}
          <View style={[styles.sectionDivider, { backgroundColor: colors.danger }]} />
        </View>

        {/* Tabs */}
        <View style={[styles.tabContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]} accessibilityRole="tablist">
          <TouchableOpacity
            style={[styles.tab, activeTab === 'picks' && { borderBottomColor: colors.accent }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab('picks');
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'picks' }}
            accessibilityLabel="Picks tab - View user's picks"
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
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'stats' }}
            accessibilityLabel="Stats tab - View user's statistics"
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

      {/* Avatar Preview Modal */}
      <Modal
        visible={showAvatarModal}
        transparent
        animationType="none"
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <TouchableOpacity
          style={styles.avatarModalBackdrop}
          activeOpacity={1}
          onPress={() => setShowAvatarModal(false)}
        >
          <Animated.View
            style={[
              styles.avatarModalContent,
              {
                transform: [{ scale: modalScale }],
                opacity: modalOpacity,
              },
            ]}
          >
            {/* Large avatar preview */}
            <View style={[styles.avatarPreview, { backgroundColor: colors.surface }]}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarPreviewImage} />
              ) : (
                <View style={[styles.avatarPreviewPlaceholder, { backgroundColor: colors.accent }]}>
                  <Text style={styles.avatarPreviewText}>
                    {profile?.username?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
              )}
            </View>

            {/* Username */}
            <Text style={[styles.avatarModalUsername, { color: '#fff' }]}>
              @{profile?.username}
            </Text>

            {/* Close hint */}
            <Text style={styles.avatarModalHint}>
              Tap anywhere to close
            </Text>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Action Menu Modal */}
      <Modal
        visible={showActionMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionMenu(false)}
      >
        <TouchableOpacity
          style={styles.actionMenuBackdrop}
          activeOpacity={1}
          onPress={() => setShowActionMenu(false)}
        >
          <View style={[styles.actionMenuContainer, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Ionicons name="share-outline" size={22} color={colors.text} />
              <Text style={[styles.actionMenuText, { color: colors.text }]}>
                Share Profile
              </Text>
            </TouchableOpacity>

            <View style={[styles.actionMenuDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={handleMuteToggle}
              disabled={isMuting}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isMuted ? 'volume-high-outline' : 'volume-mute-outline'}
                size={22}
                color={colors.text}
              />
              <Text style={[styles.actionMenuText, { color: colors.text }]}>
                {isMuted ? 'Unmute User' : 'Mute User'}
              </Text>
            </TouchableOpacity>

            <View style={[styles.actionMenuDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={handleBlockToggle}
              disabled={blockLoading}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isBlocked ? 'checkmark-circle-outline' : 'ban-outline'}
                size={22}
                color={isBlocked ? colors.text : colors.danger}
              />
              <Text
                style={[
                  styles.actionMenuText,
                  { color: isBlocked ? colors.text : colors.danger },
                ]}
              >
                {isBlocked ? 'Unblock User' : 'Block User'}
              </Text>
            </TouchableOpacity>

            <View style={[styles.actionMenuDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => setShowActionMenu(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close-outline" size={22} color={colors.textSecondary} />
              <Text style={[styles.actionMenuText, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    paddingBottom: spacing.sm,
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
  // Hero Section
  heroSection: {
    alignItems: 'center',
  },
  bannerContainer: {
    width: '100%',
    height: 100,
    position: 'relative',
  },
  bannerGradient: {
    width: '100%',
    height: '100%',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  avatarContainer: {
    marginTop: -40,
    marginBottom: spacing.sm,
  },
  avatarSquare: {
    width: 80,
    height: 80,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff',
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  username: {
    fontSize: 18,
    fontWeight: '700',
  },
  mutedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  mutedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bio: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  // Main Stats Row - balanced spacing
  mainStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    marginBottom: 4,
  },
  mainStatItem: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  mainStatValue: {
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    lineHeight: 20,
  },
  mainStatLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 1,
  },
  mainStatDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 0,
  },
  // Social row - balanced
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 6,
    marginBottom: 8,
  },
  socialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  socialNumber: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  socialLabel: {
    fontSize: 11,
  },
  actionContainer: {
    marginTop: 2,
    marginBottom: spacing.md,
  },
  // Section Divider
  sectionDivider: {
    height: 1,
    marginHorizontal: spacing.md,
    width: SCREEN_WIDTH - spacing.md * 2,
  },
  // Avatar Modal
  avatarModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarModalContent: {
    alignItems: 'center',
  },
  avatarPreview: {
    width: 180,
    height: 180,
    borderRadius: 36,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  avatarPreviewImage: {
    width: '100%',
    height: '100%',
  },
  avatarPreviewPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPreviewText: {
    fontSize: 72,
    fontWeight: '600',
    color: '#fff',
  },
  avatarModalUsername: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  avatarModalHint: {
    marginTop: spacing.lg,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
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
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
    minWidth: 88,
  },
  followBadgeText: {
    fontSize: 13,
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
  // Menu button
  menuButton: {
    padding: 4,
  },
  // Action Menu
  actionMenuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  actionMenuContainer: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.md,
    paddingBottom: 34,
    paddingHorizontal: spacing.md,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  actionMenuText: {
    fontSize: 16,
    fontWeight: '500',
  },
  actionMenuDivider: {
    height: 1,
    marginHorizontal: -spacing.md,
  },
});
