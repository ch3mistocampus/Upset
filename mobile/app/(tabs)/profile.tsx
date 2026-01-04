/**
 * Profile screen - Public profile style for own profile
 * Shows upcoming events with picks, recent events with accuracy bars
 */

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
  Easing,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActionSheetIOS,
  Alert,
  Dimensions,
} from 'react-native';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useGuestPicks } from '../../hooks/useGuestPicks';
import {
  useUserStats,
  useRecentPicksSummary,
  useUpcomingEvents,
  useUserPicksCount,
  useBoutsCount,
} from '../../hooks/useQueries';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { spacing, radius } from '../../lib/tokens';
import { isEventSubmitted } from '../../lib/storage';
import { SurfaceCard, Button, SegmentedControl, EmptyState } from '../../components/ui';
import { ErrorState } from '../../components/ErrorState';
import { SkeletonProfileCard, SkeletonStats } from '../../components/SkeletonStats';
import type { ThemeMode } from '../../lib/tokens';
import type { Event } from '../../types/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Type for recent picks summary from useRecentPicksSummary
interface RecentEventSummary {
  event: Event;
  correct: number;
  total: number;
}

export default function Profile() {
  const router = useRouter();
  const toast = useToast();
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const { profile, user, signOut, isGuest, updateProfile } = useAuth();
  const { getTotalPickCount, getEventsPickedCount } = useGuestPicks();
  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useUserStats(user?.id || null);
  const { data: recentSummary, isLoading: summaryLoading, refetch: refetchSummary } = useRecentPicksSummary(
    user?.id || null,
    5
  );
  const { data: upcomingEvents, refetch: refetchUpcoming } = useUpcomingEvents();

  const [refreshing, setRefreshing] = useState(false);
  const [showBioModal, setShowBioModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [bioText, setBioText] = useState(profile?.bio || '');
  const [savingBio, setSavingBio] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Animations
  const headerScale = useRef(new Animated.Value(0.95)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.8)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerScale, {
        toValue: 1,
        tension: 100,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 300,
        delay: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Animate modal
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
  }, [showAvatarModal]);

  // Fetch follower/following counts
  const fetchSocialCounts = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { count: following } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      const { count: followers } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .eq('friend_id', user.id)
        .eq('status', 'accepted');

      setFollowingCount(following || 0);
      setFollowersCount(followers || 0);
    } catch (error) {
      console.error('Failed to fetch social counts:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSocialCounts();
  }, [fetchSocialCounts]);

  useEffect(() => {
    setBioText(profile?.bio || '');
  }, [profile?.bio]);

  const handleSaveBio = async () => {
    try {
      setSavingBio(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await updateProfile({ bio: bioText.trim() || null });
      setShowBioModal(false);
      toast.showNeutral('Bio updated');
    } catch (error: any) {
      toast.showError(error.message || 'Failed to update bio');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSavingBio(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (!isGuest) {
      await Promise.all([refetchStats(), refetchSummary(), refetchUpcoming(), fetchSocialCounts()]);
    }
    setRefreshing(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleSignIn = () => {
    router.push('/(auth)/sign-in');
  };

  const navigateToFollows = (tab: 'followers' | 'following') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/user/${user?.id}/follows?tab=${tab}`);
  };

  const navigateToEvent = (eventId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/event/${eventId}`);
  };

  // Avatar tap - show enlarged preview modal
  const handleAvatarPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowAvatarModal(true);
  };

  // Show action sheet for changing avatar
  const showAvatarOptions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library', 'Remove Photo'],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
          title: 'Change Profile Picture',
        },
        (buttonIndex) => {
          if (buttonIndex === 1) pickImage('camera', 'avatar');
          else if (buttonIndex === 2) pickImage('library', 'avatar');
          else if (buttonIndex === 3) removeAvatar();
        }
      );
    } else {
      Alert.alert('Change Profile Picture', undefined, [
        { text: 'Take Photo', onPress: () => pickImage('camera', 'avatar') },
        { text: 'Choose from Library', onPress: () => pickImage('library', 'avatar') },
        { text: 'Remove Photo', onPress: removeAvatar, style: 'destructive' },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  // Show action sheet for changing banner
  const showBannerOptions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library', 'Remove Banner'],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
          title: 'Change Banner',
        },
        (buttonIndex) => {
          if (buttonIndex === 1) pickImage('camera', 'banner');
          else if (buttonIndex === 2) pickImage('library', 'banner');
          else if (buttonIndex === 3) removeBanner();
        }
      );
    } else {
      Alert.alert('Change Banner', undefined, [
        { text: 'Take Photo', onPress: () => pickImage('camera', 'banner') },
        { text: 'Choose from Library', onPress: () => pickImage('library', 'banner') },
        { text: 'Remove Banner', onPress: removeBanner, style: 'destructive' },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const pickImage = async (source: 'camera' | 'library', type: 'avatar' | 'banner') => {
    try {
      const ImagePicker = await import('expo-image-picker');

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          toast.showError('Camera permission is required');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          toast.showError('Photo library permission is required');
          return;
        }
      }

      const aspect: [number, number] = type === 'avatar' ? [1, 1] : [3, 1];

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect,
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect,
            quality: 0.8,
          });

      if (!result.canceled && result.assets[0]) {
        if (type === 'avatar') {
          await uploadAvatar(result.assets[0].uri);
        } else {
          await uploadBanner(result.assets[0].uri);
        }
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      toast.showError('Profile photo requires a development build');
    }
  };

  const uploadAvatar = async (uri: string) => {
    if (!user?.id) return;

    try {
      setUploadingAvatar(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `avatar-${user.id}-${Date.now()}.${ext}`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          contentType: `image/${ext}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      await updateProfile({ avatar_url: publicUrl });

      toast.showNeutral('Profile picture updated');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast.showError(error.message || 'Failed to upload photo');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const uploadBanner = async (uri: string) => {
    if (!user?.id) return;

    try {
      setUploadingBanner(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `banner-${user.id}-${Date.now()}.${ext}`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          contentType: `image/${ext}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      await updateProfile({ banner_url: publicUrl });

      toast.showNeutral('Banner updated');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('Banner upload error:', error);
      toast.showError(error.message || 'Failed to upload banner');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setUploadingBanner(false);
    }
  };

  const removeAvatar = async () => {
    try {
      setUploadingAvatar(true);
      await updateProfile({ avatar_url: null });
      setShowAvatarModal(false);
      toast.showNeutral('Profile picture removed');
    } catch (error: any) {
      toast.showError(error.message || 'Failed to remove photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeBanner = async () => {
    try {
      setUploadingBanner(true);
      await updateProfile({ banner_url: null });
      toast.showNeutral('Banner removed');
    } catch (error: any) {
      toast.showError(error.message || 'Failed to remove banner');
    } finally {
      setUploadingBanner(false);
    }
  };

  // Guest mode profile
  if (isGuest) {
    const guestPickCount = getTotalPickCount();
    const guestEventsCount = getEventsPickedCount();

    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.guestContent}
      >
        <SurfaceCard heroGlow style={styles.guestBanner}>
          <View style={[styles.guestIconContainer, { backgroundColor: colors.accent + '20' }]}>
            <Ionicons name="person-outline" size={32} color={colors.accent} />
          </View>
          <Text style={[styles.guestTitle, { color: colors.text }]}>Guest Mode</Text>
          <Text style={[styles.guestSubtext, { color: colors.textSecondary }]}>
            Picks saved on this device only
          </Text>
          <Button title="Create Account" onPress={handleSignIn} variant="primary" />
        </SurfaceCard>

        <SurfaceCard weakWash>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>THIS SESSION</Text>
          <View style={styles.guestStatsRow}>
            <View style={styles.guestStatItem}>
              <Text style={[styles.guestStatValue, { color: colors.accent }]}>{guestPickCount}</Text>
              <Text style={[styles.guestStatLabel, { color: colors.textSecondary }]}>Picks</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.guestStatItem}>
              <Text style={[styles.guestStatValue, { color: colors.accent }]}>{guestEventsCount}</Text>
              <Text style={[styles.guestStatLabel, { color: colors.textSecondary }]}>Events</Text>
            </View>
          </View>
        </SurfaceCard>

        <SurfaceCard weakWash>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>APPEARANCE</Text>
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

        <Text style={[styles.appVersion, { color: colors.textTertiary }]}>UFC Picks Tracker v1.0.0</Text>
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
      </ScrollView>
    );
  }

  if (statsError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ErrorState
          message="Failed to load your profile."
          onRetry={() => {
            refetchStats();
            refetchSummary();
          }}
        />
      </View>
    );
  }

  const accuracy = stats?.accuracy_pct || 0;

  // Event card with color bar
  const renderEventCard = (
    eventId: string,
    eventName: string,
    picksCount: number,
    totalBouts: number,
    correctCount?: number,
    isUpcoming: boolean = false,
    isSubmitted: boolean = false
  ) => {
    const eventAccuracy = !isUpcoming && totalBouts > 0
      ? Math.round(((correctCount || 0) / totalBouts) * 100)
      : null;

    const getAccuracyColor = (acc: number) => {
      if (acc >= 70) return colors.success;
      if (acc >= 50) return colors.warning;
      return colors.danger;
    };

    // Badge logic for upcoming events
    const getBadgeContent = () => {
      if (isSubmitted) {
        return { text: 'Submitted', color: colors.accent, bgColor: colors.accent + '20' };
      }
      if (picksCount === totalBouts && totalBouts > 0) {
        return { text: 'Complete', color: colors.success, bgColor: colors.successSoft };
      }
      if (picksCount > 0) {
        return { text: 'In Progress', color: colors.accent, bgColor: colors.accent + '20' };
      }
      return null;
    };

    // Red glow style for submitted cards - more pronounced
    const submittedGlow = isSubmitted ? {
      shadowColor: '#C54A50',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 16,
      elevation: 10,
    } : {};

    return (
      <TouchableOpacity
        key={eventId}
        style={[
          styles.eventCard,
          { backgroundColor: colors.surfaceAlt },
          submittedGlow,
        ]}
        onPress={() => navigateToEvent(eventId)}
        activeOpacity={0.7}
      >
        <View style={styles.eventCardTop}>
          <Text style={[styles.eventCardName, { color: colors.text }]} numberOfLines={1}>
            {eventName}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
        </View>

        <View style={styles.eventCardBottom}>
          {isUpcoming ? (
            <>
              <Text style={[styles.eventCardScore, { color: colors.textSecondary }]}>
                {picksCount}/{totalBouts} picks
              </Text>
              {(() => {
                const badge = getBadgeContent();
                return badge ? (
                  <View style={[styles.picksBadge, { backgroundColor: badge.bgColor }]}>
                    <Text style={[styles.picksBadgeText, { color: badge.color }]}>
                      {badge.text}
                    </Text>
                  </View>
                ) : null;
              })()}
            </>
          ) : (
            <>
              <View style={styles.eventCardStats}>
                <Text style={[styles.eventCardScore, { color: colors.textSecondary }]}>
                  {correctCount}/{totalBouts}
                </Text>
                <View style={[styles.eventCardBar, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.eventCardBarFill,
                      {
                        width: `${eventAccuracy || 0}%`,
                        backgroundColor: getAccuracyColor(eventAccuracy || 0),
                      },
                    ]}
                  />
                </View>
              </View>
              <Text style={[styles.eventCardAccuracy, { color: getAccuracyColor(eventAccuracy || 0) }]}>
                {eventAccuracy}%
              </Text>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {/* Hero Section with Banner */}
        <Animated.View style={[styles.heroSection, { transform: [{ scale: headerScale }] }]}>
          {/* Banner - Clickable for upload */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={showBannerOptions}
            style={styles.bannerContainer}
          >
            {profile?.banner_url ? (
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
            {uploadingBanner && (
              <View style={styles.bannerOverlay}>
                <Ionicons name="cloud-upload" size={24} color="#fff" />
              </View>
            )}
            {/* Banner edit hint */}
            <View style={[styles.bannerEditHint, { backgroundColor: colors.surface + 'CC' }]}>
              <Ionicons name="camera" size={12} color={colors.text} />
            </View>
          </TouchableOpacity>

          {/* Settings Button - In banner corner */}
          <TouchableOpacity
            style={[styles.settingsButton, { backgroundColor: colors.surface + 'CC' }]}
            onPress={() => setShowSettings(!showSettings)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showSettings ? 'close' : 'settings-outline'}
              size={18}
              color={colors.text}
            />
          </TouchableOpacity>

          {/* Avatar - Large rounded square */}
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handleAvatarPress}
            activeOpacity={0.8}
          >
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={[styles.avatarSquare, { backgroundColor: colors.accent }]} />
            ) : (
              <View style={[styles.avatarSquare, { backgroundColor: colors.accent }]}>
                <Text style={styles.avatarText}>
                  {profile?.username?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Username */}
          <Text style={[styles.username, { color: colors.text }]}>
            @{profile?.username || 'Unknown'}
          </Text>

          {/* Bio - tap to edit */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowBioModal(true);
            }}
            activeOpacity={0.7}
          >
            {profile?.bio ? (
              <Text style={[styles.bio, { color: colors.textSecondary }]} numberOfLines={2}>
                {profile.bio}
              </Text>
            ) : (
              <Text style={[styles.bioPlaceholder, { color: colors.textTertiary }]}>
                + Add bio
              </Text>
            )}
          </TouchableOpacity>

          {/* Main Stats Row - Large & Prominent */}
          <View style={styles.mainStatsRow}>
            <View style={styles.mainStatItem}>
              <Text style={[styles.mainStatValue, { color: colors.accent }]}>
                {accuracy.toFixed(1)}%
              </Text>
              <Text style={[styles.mainStatLabel, { color: colors.textSecondary }]}>ACCURACY</Text>
            </View>
            <View style={[styles.mainStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.mainStatItem}>
              <Text style={[styles.mainStatValue, { color: colors.text }]}>
                {stats?.total_picks || 0}
              </Text>
              <Text style={[styles.mainStatLabel, { color: colors.textSecondary }]}>PICKS</Text>
            </View>
            <View style={[styles.mainStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.mainStatItem}>
              <Text style={[styles.mainStatValue, { color: colors.success }]}>
                {stats?.correct_winner || 0}
              </Text>
              <Text style={[styles.mainStatLabel, { color: colors.textSecondary }]}>CORRECT</Text>
            </View>
          </View>

          {/* Followers/Following - Inline below stats */}
          <View style={styles.socialRow}>
            <TouchableOpacity
              style={styles.socialItem}
              onPress={() => navigateToFollows('followers')}
              activeOpacity={0.7}
            >
              <Text style={[styles.socialNumber, { color: colors.text }]}>
                {followersCount.toLocaleString()}
              </Text>
              <Text style={[styles.socialLabel, { color: colors.textSecondary }]}>followers</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialItem}
              onPress={() => navigateToFollows('following')}
              activeOpacity={0.7}
            >
              <Text style={[styles.socialNumber, { color: colors.text }]}>
                {followingCount.toLocaleString()}
              </Text>
              <Text style={[styles.socialLabel, { color: colors.textSecondary }]}>following</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={[styles.sectionDivider, { backgroundColor: colors.danger }]} />
        </Animated.View>

        {/* Content Area */}
        <Animated.View style={[styles.contentArea, { opacity: contentOpacity }]}>
          {showSettings ? (
            /* Settings Panel */
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>APPEARANCE</Text>
              <SurfaceCard weakWash>
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

              <View style={{ height: spacing.lg }} />

              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ACCOUNT</Text>
              <TouchableOpacity
                style={[styles.menuRow, { backgroundColor: colors.surface }]}
                onPress={() => router.push(`/user/${user?.id}`)}
                activeOpacity={0.7}
              >
                <Ionicons name="eye-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.menuText, { color: colors.text }]}>View Public Profile</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuRow, { backgroundColor: colors.surface }]}
                onPress={handleSignOut}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                <Text style={[styles.menuText, { color: colors.danger }]}>Sign Out</Text>
                <View style={{ width: 16 }} />
              </TouchableOpacity>

              <Text style={[styles.appVersion, { color: colors.textTertiary }]}>
                UFC Picks Tracker v1.0.0
              </Text>
            </View>
          ) : (
            /* Picks Content */
            <>
              {/* Upcoming Events */}
              {upcomingEvents && upcomingEvents.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    UPCOMING EVENTS
                  </Text>
                  {upcomingEvents.map((event) => (
                    <UpcomingEventCard
                      key={event.id}
                      eventId={event.id}
                      eventName={event.name}
                      userId={user?.id || null}
                      renderCard={renderEventCard}
                    />
                  ))}
                </View>
              )}

              {/* Recent Events */}
              {recentSummary && recentSummary.length > 0 ? (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    RECENT EVENTS
                  </Text>
                  <View style={styles.eventsList}>
                    {(recentSummary as RecentEventSummary[]).map((summary) =>
                      renderEventCard(
                        summary.event.id,
                        summary.event.name,
                        summary.total,
                        summary.total,
                        summary.correct,
                        false
                      )
                    )}
                  </View>
                </View>
              ) : !upcomingEvents?.length && (
                <EmptyState
                  icon="stats-chart-outline"
                  title="No Picks Yet"
                  message="Make picks on upcoming events to see your history here."
                />
              )}
            </>
          )}
        </Animated.View>
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

            {/* Edit button */}
            <TouchableOpacity
              style={[styles.avatarEditButton, { backgroundColor: colors.accent }]}
              onPress={() => {
                setShowAvatarModal(false);
                setTimeout(showAvatarOptions, 300);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.avatarEditText}>Change Photo</Text>
            </TouchableOpacity>

            {/* Close hint */}
            <Text style={[styles.avatarModalHint, { color: colors.textTertiary }]}>
              Tap anywhere to close
            </Text>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Bio Edit Modal */}
      <Modal
        visible={showBioModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBioModal(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowBioModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Bio</Text>
            <TouchableOpacity onPress={handleSaveBio} disabled={savingBio}>
              <Text style={[styles.modalSave, { color: savingBio ? colors.textTertiary : colors.accent }]}>
                {savingBio ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <TextInput
              style={[
                styles.bioInput,
                { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border },
              ]}
              value={bioText}
              onChangeText={setBioText}
              placeholder="Tell us about yourself..."
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={280}
              autoFocus
            />
            <Text style={[styles.bioCharCount, { color: colors.textTertiary }]}>
              {bioText.length}/280
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// Component to fetch and display upcoming event with picks count
function UpcomingEventCard({
  eventId,
  eventName,
  userId,
  renderCard,
}: {
  eventId: string;
  eventName: string;
  userId: string | null;
  renderCard: (
    eventId: string,
    eventName: string,
    picksCount: number,
    totalBouts: number,
    correctCount: number | undefined,
    isUpcoming: boolean,
    isSubmitted: boolean
  ) => React.ReactNode;
}) {
  const { data: picksCount } = useUserPicksCount(eventId, userId);
  const { data: boutsCount } = useBoutsCount(eventId);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Re-check submission status when screen is focused
  useFocusEffect(
    useCallback(() => {
      isEventSubmitted(eventId).then(setIsSubmitted);
    }, [eventId])
  );

  return renderCard(eventId, eventName, picksCount || 0, boutsCount || 0, undefined, true, isSubmitted);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 100,
    gap: spacing.lg,
  },
  guestContent: {
    padding: spacing.lg,
    paddingTop: 80,
    paddingBottom: 100,
    gap: spacing.lg,
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
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerEditHint: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButton: {
    position: 'absolute',
    top: 8,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
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
  username: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  bio: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  bioPlaceholder: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: spacing.md,
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

  // Section Divider
  sectionDivider: {
    height: 1,
    marginHorizontal: spacing.md,
    width: SCREEN_WIDTH - spacing.md * 2,
  },

  // Content Area
  contentArea: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },

  // Event cards
  eventsList: {
    gap: spacing.sm,
  },
  eventCard: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.card,
    marginBottom: spacing.sm,
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
  picksBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  picksBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Menu Rows
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.card,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
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
    width: 160,
    height: 160,
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: spacing.lg,
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
    fontSize: 64,
    fontWeight: '600',
    color: '#fff',
  },
  avatarEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    gap: spacing.sm,
  },
  avatarEditText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  avatarModalHint: {
    marginTop: spacing.xl,
    fontSize: 13,
  },

  // Guest
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
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  guestSubtext: {
    fontSize: 14,
    marginBottom: spacing.lg,
  },
  guestStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: spacing.md,
  },
  guestStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  guestStatValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  guestStatLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalCancel: {
    fontSize: 16,
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    padding: spacing.lg,
  },
  bioInput: {
    fontSize: 16,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  bioCharCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: spacing.sm,
  },

  appVersion: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: spacing.xl,
  },
});
