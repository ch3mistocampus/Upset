/**
 * Event detail screen - shows bouts for a specific event
 * Navigate here from the events list (pick.tsx)
 * Theme-aware design with SurfaceCard and entrance animations
 */

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Animated, Easing, Modal } from 'react-native';
import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useAuthGate } from '../../hooks/useAuthGate';
import { useEvent, useBoutsForEvent, useUpsertPick, useDeletePick, isEventLocked } from '../../hooks/useQueries';
import { useEventCommunityPercentages } from '../../hooks/useLeaderboard';
import { useToast } from '../../hooks/useToast';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography, displayTypography } from '../../lib/tokens';
import { submitEvent, isEventSubmitted, unsubmitEvent } from '../../lib/storage';
import { SurfaceCard, EmptyState, LiveBadge } from '../../components/ui';
import { ErrorState } from '../../components/ErrorState';
import { GlobalTabBar } from '../../components/navigation/GlobalTabBar';
import { SkeletonFightCard } from '../../components/SkeletonFightCard';
import { LockExplainerModal } from '../../components/LockExplainerModal';
import { AuthPromptModal } from '../../components/AuthPromptModal';
import { MethodPickerModal } from '../../components/MethodPickerModal';
import { FighterComparisonModal } from '../../components/FighterComparisonModal';
import { useEventLiveStatus } from '../../hooks/useScorecard';
import { BoutWithPick, PickInsert } from '../../types/database';
import type { CommunityPickPercentages } from '../../types/social';
import type { RoundPhase } from '../../types/scorecard';

// UFC Corner Colors - theme-aware (maroon red, navy blue)
const useCornerColors = () => {
  const { isDark } = useTheme();
  return {
    // Darker maroon red matching app accent
    red: isDark ? '#C54A50' : '#943538',
    // Darker navy blue
    blue: isDark ? '#4A6FA5' : '#1E3A5F',
    redSoft: isDark ? 'rgba(197, 74, 80, 0.25)' : 'rgba(148, 53, 56, 0.15)',
    blueSoft: isDark ? 'rgba(74, 111, 165, 0.25)' : 'rgba(30, 58, 95, 0.15)',
  };
};

// Minimum community picks required before showing percentages
// Prevents misleading stats from small sample sizes
const MIN_COMMUNITY_PICKS = 5;


// Fighter Pill Button - horizontal pill with checkmark when selected
// Supports navigation to fighter info via long press or info button
// Includes smooth selection animations: color transition, checkmark bounce, pulse effect
const FighterPill: React.FC<{
  name: string;
  corner: 'red' | 'blue';
  isSelected: boolean;
  locked: boolean;
  onPress: () => void;
  fighterId?: string;
  onFighterInfo?: (fighterId: string) => void;
}> = ({ name, corner, isSelected, locked, onPress, fighterId, onFighterInfo }) => {
  const { colors } = useTheme();
  const cornerColors = useCornerColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const selectionAnim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const checkmarkAnim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const prevSelected = useRef(isSelected);

  const cornerColor = corner === 'red' ? cornerColors.red : cornerColors.blue;

  // Animate selection state changes
  useEffect(() => {
    if (isSelected !== prevSelected.current) {
      prevSelected.current = isSelected;

      if (isSelected) {
        // Selection animation sequence
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Animate background fill
        Animated.spring(selectionAnim, {
          toValue: 1,
          useNativeDriver: false,
          tension: 80,
          friction: 8,
        }).start();

        // Checkmark bounce in
        checkmarkAnim.setValue(0);
        Animated.spring(checkmarkAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 6,
        }).start();

        // Pulse effect
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 100,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
          }),
          Animated.spring(pulseAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
        ]).start();
      } else {
        // Deselection animation
        Animated.spring(selectionAnim, {
          toValue: 0,
          useNativeDriver: false,
          tension: 80,
          friction: 8,
        }).start();
        checkmarkAnim.setValue(0);
      }
    }
  }, [isSelected, selectionAnim, checkmarkAnim, pulseAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, tension: 150, friction: 5 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 150, friction: 5 }).start();
  };

  const handleLongPress = () => {
    if (fighterId && onFighterInfo) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onFighterInfo(fighterId);
    }
  };

  // Interpolate background color based on selection state
  const backgroundColor = selectionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surfaceAlt, cornerColor],
  });

  // Interpolate border opacity (fade out when selected)
  const borderOpacity = selectionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  // Checkmark scale animation
  const checkmarkScale = checkmarkAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1.2, 1],
  });

  return (
    <Animated.View style={[pillStyles.wrapper, { transform: [{ scale: scaleAnim }, { scale: pulseAnim }] }]}>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={locked}
        activeOpacity={0.85}
        delayLongPress={300}
      >
        <Animated.View
          style={[
            pillStyles.pill,
            { backgroundColor },
            locked && pillStyles.disabled,
          ]}
        >
          {/* Border overlay that fades out when selected */}
          <Animated.View
            style={[
              pillStyles.borderOverlay,
              {
                borderColor: colors.border,
                opacity: borderOpacity,
              },
            ]}
            pointerEvents="none"
          />

          {isSelected && (
            <Animated.View style={{ transform: [{ scale: checkmarkScale }] }}>
              <Ionicons name="checkmark" size={14} color="#fff" style={pillStyles.checkIcon} />
            </Animated.View>
          )}
          <Animated.Text
            style={[
              pillStyles.name,
              {
                color: selectionAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [colors.text, '#fff'],
                }),
                fontWeight: isSelected ? '700' : '500',
              },
            ]}
            numberOfLines={2}
          >
            {name}
          </Animated.Text>
          {fighterId && onFighterInfo && (
            <TouchableOpacity
              style={pillStyles.infoButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onFighterInfo(fighterId);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Animated.View>
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color={isSelected ? '#fff' : colors.textTertiary}
                />
              </Animated.View>
            </TouchableOpacity>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const pillStyles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.button,
    minHeight: 36,
    overflow: 'hidden',
  },
  borderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderRadius: radius.button,
  },
  disabled: {
    opacity: 0.5,
  },
  checkIcon: {
    marginRight: 4,
  },
  name: {
    fontSize: 13,
    textAlign: 'center',
    flexShrink: 1,
  },
  infoButton: {
    marginLeft: 4,
    padding: 2,
  },
});

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const cornerColors = useCornerColors();
  const { user, isGuest, enterGuestMode } = useAuth();
  const { showGate, gateContext, openGate, closeGate } = useAuthGate();
  const toast = useToast();
  const { state: onboardingState, markSeen } = useOnboarding();

  const [showLockExplainer, setShowLockExplainer] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [pendingPick, setPendingPick] = useState<{
    bout: BoutWithPick;
    corner: 'red' | 'blue';
  } | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonBout, setComparisonBout] = useState<BoutWithPick | null>(null);
  const submitModalScale = useRef(new Animated.Value(0.9)).current;
  const submitModalOpacity = useRef(new Animated.Value(0)).current;

  const { data: event, isLoading: eventLoading, isError: eventError, refetch: refetchEvent } = useEvent(id || null);
  const { data: bouts, isLoading: boutsLoading, isError: boutsError, refetch: refetchBouts } = useBoutsForEvent(
    id || null,
    user?.id || null,
    isGuest
  );
  const upsertPick = useUpsertPick();
  const deletePick = useDeletePick();

  const boutIds = useMemo(() => bouts?.map((b) => b.id) || [], [bouts]);
  const { data: communityPercentages, refetch: refetchPercentages } = useEventCommunityPercentages(boutIds);
  const { data: liveStatusMap, refetch: refetchLiveStatus } = useEventLiveStatus(boutIds);

  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Calculate picks progress
  const picksCount = bouts?.filter((b) => b.pick).length || 0;
  const totalBouts = bouts?.length || 0;

  // Sticky header opacity based on scroll
  const progressHeaderOpacity = scrollY.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  // Show lock explainer on first visit
  useEffect(() => {
    if (!onboardingState.hasSeenLockExplainer && event && !eventLoading) {
      setShowLockExplainer(true);
    }
  }, [onboardingState.hasSeenLockExplainer, event, eventLoading]);

  // Load submission state when event changes
  useEffect(() => {
    if (id) {
      isEventSubmitted(id).then(setIsSubmitted);
    }
  }, [id]);

  // Reset submission when picks change (user edits after submitting)
  useEffect(() => {
    if (isSubmitted && picksCount === 0) {
      // If user cleared all picks, reset submission
      if (id) {
        unsubmitEvent(id);
        setIsSubmitted(false);
      }
    }
  }, [picksCount, isSubmitted, id]);

  // Animate submit modal
  useEffect(() => {
    if (showSubmitModal) {
      Animated.parallel([
        Animated.spring(submitModalScale, {
          toValue: 1,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(submitModalOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      submitModalScale.setValue(0.9);
      submitModalOpacity.setValue(0);
    }
  }, [showSubmitModal, submitModalScale, submitModalOpacity]);

  const handleDismissLockExplainer = () => {
    setShowLockExplainer(false);
    markSeen('hasSeenLockExplainer');
  };

  // Handle opening submit modal - require account for guests
  const handleOpenSubmitModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Guests must create an account to submit picks
    if (isGuest) {
      openGate('picks');
      return;
    }

    setShowSubmitModal(true);
  };

  // Handle submitting picks
  const handleSubmitPicks = async () => {
    if (!id) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await submitEvent(id, picksCount);
    setIsSubmitted(true);
    setShowSubmitModal(false);
    toast.showNeutral('Picks submitted!');
  };

  // Handle editing picks after submission
  const handleEditPicks = async () => {
    if (!id) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await unsubmitEvent(id);
    setIsSubmitted(false);
    toast.showNeutral('You can now edit your picks');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchEvent(), refetchBouts(), refetchPercentages(), refetchLiveStatus()]);
    setRefreshing(false);
  };

  const locked = isEventLocked(event || null);

  const handlePickFighter = async (bout: BoutWithPick, corner: 'red' | 'blue') => {
    if (!event) return;

    // If not authenticated and not in guest mode, show auth prompt
    if (!user && !isGuest) {
      openGate('picks');
      return;
    }

    // Prevent rapid taps while mutation is pending
    if (upsertPick.isPending || deletePick.isPending) return;

    if (locked) {
      toast.showError('Event has already started. Picks cannot be changed.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // Block picks when card is submitted (user must click Edit first)
    if (isSubmitted) {
      toast.showNeutral('Tap "Edit" to modify your picks');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    if (bout.status === 'canceled' || bout.status === 'replaced') {
      toast.showError('This fight has been canceled or replaced.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // Check if user is tapping the already-selected fighter (unselect)
    const isUnselecting = bout.pick?.picked_corner === corner;

    // Soft haptic on tap
    Haptics.selectionAsync();

    if (isUnselecting) {
      // Delete the pick by bout_id + user_id
      try {
        await deletePick.mutateAsync({
          boutId: bout.id,
          eventId: event.id,
          userId: user?.id || null,
          isGuest,
        });
      } catch (error: any) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        toast.showError('Failed to remove pick. Please try again.');
      }
    } else {
      // Show method prediction modal
      setPendingPick({ bout, corner });
      setShowMethodModal(true);
    }
  };

  // Save pick with method and round prediction
  const savePick = async (method: string | null, round: number | null) => {
    if (!pendingPick || !event) return;

    const { bout, corner } = pendingPick;

    // Validate user_id for authenticated users
    if (!isGuest && !user?.id) {
      toast.showError('Authentication error. Please sign in again.');
      return;
    }

    try {
      const pick: PickInsert = {
        user_id: isGuest ? 'guest' : user!.id,
        event_id: event.id,
        bout_id: bout.id,
        picked_corner: corner,
        picked_method: method,
        picked_round: round,
      };

      await upsertPick.mutateAsync({ pick, isGuest });

      if (method || round) {
        const fighterName = corner === 'red' ? bout.red_name : bout.blue_name;
        const prediction = method
          ? `${method}${round ? ` R${round}` : ''}`
          : `R${round}`;
        toast.showNeutral(`${fighterName} by ${prediction}`);
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      if (error.message?.includes('locked')) {
        toast.showError('Picks are locked. Event has started.');
      } else {
        toast.showError('Failed to save pick. Please try again.');
      }
    } finally {
      setPendingPick(null);
    }
  };

  // Clear all picks for this event
  const handleClearAllPicks = async () => {
    if (!event || locked || isSubmitted || !bouts) return;

    const boutsWithPicks = bouts.filter((b) => b.pick);
    if (boutsWithPicks.length === 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Delete all picks in parallel
      await Promise.all(
        boutsWithPicks.map((bout) =>
          deletePick.mutateAsync({
            boutId: bout.id,
            eventId: event.id,
            userId: user?.id || null,
            isGuest,
          })
        )
      );
      toast.showNeutral('All picks cleared');
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.showError('Failed to clear picks');
    }
  };

  // Navigate to fighter info page
  const handleFighterInfo = (fighterId: string) => {
    router.push(`/fighter/${fighterId}`);
  };

  // Open comparison modal for a bout
  const handleOpenComparison = (bout: BoutWithPick) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setComparisonBout(bout);
    setShowComparison(true);
  };

  // Custom header with back button and sticky progress
  const Header = () => (
    <View style={[styles.headerContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {event?.name || 'Event'}
        </Text>
        <TouchableOpacity
          style={styles.scorecardsButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/event/${id}/scorecards`);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="stats-chart" size={22} color={colors.accent} />
        </TouchableOpacity>
      </View>
      {/* Sticky Progress Header */}
      <Animated.View
        style={[
          styles.progressHeader,
          {
            backgroundColor: colors.surfaceAlt,
            borderBottomColor: colors.border,
            opacity: progressHeaderOpacity
          }
        ]}
      >
        {locked ? (
          <>
            <Ionicons name="lock-closed" size={14} color={colors.warning} />
            <Text style={[styles.progressText, { color: colors.warning }]}>
              Picks locked
            </Text>
          </>
        ) : isSubmitted ? (
          <>
            <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
            <Text style={[styles.progressText, { color: colors.accent }]}>
              Card submitted
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {picksCount} of {totalBouts} picks completed
            </Text>
            {picksCount === totalBouts && totalBouts > 0 && (
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            )}
            {picksCount > 0 && (
              <TouchableOpacity
                style={styles.clearAllButton}
                onPress={handleClearAllPicks}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.clearAllText, { color: colors.textTertiary }]}>
                  Clear All
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </Animated.View>
    </View>
  );

  if (eventLoading || boutsLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header />
        <ScrollView contentContainerStyle={styles.content}>
          <SkeletonFightCard />
          <SkeletonFightCard />
          <SkeletonFightCard />
          <SkeletonFightCard />
        </ScrollView>
        <GlobalTabBar />
      </View>
    );
  }

  if (eventError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header />
        <ErrorState
          message="Failed to load event. Check your connection and try again."
          onRetry={() => refetchEvent()}
        />
        <GlobalTabBar />
      </View>
    );
  }

  if (boutsError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header />
        <ErrorState
          message="Failed to load fights. Check your connection and try again."
          onRetry={() => refetchBouts()}
        />
        <GlobalTabBar />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header />
        <EmptyState
          icon="calendar-outline"
          title="Event Not Found"
          message="This event could not be found. It may have been removed."
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
        <GlobalTabBar />
      </View>
    );
  }

  if (!bouts || bouts.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header />
        <EmptyState
          icon="radio-outline"
          title="No Fights Available"
          message="The fight card hasn't been released yet. Check back closer to the event date."
          actionLabel="Refresh"
          onAction={onRefresh}
        />
        <GlobalTabBar />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header />
      <ScrollView
        contentContainerStyle={styles.content}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* Submitted Banner - Red glow style */}
        {isSubmitted && !locked && (
          <View style={styles.submittedBannerOuter}>
            <View style={[styles.submittedBanner, { backgroundColor: colors.accent }]}>
              {/* Left side - Checkmark and text */}
              <View style={styles.submittedLeft}>
                <View style={styles.submittedCheckCircle}>
                  <Ionicons name="checkmark" size={18} color={colors.accent} />
                </View>
                <View style={styles.submittedTextContainer}>
                  <Text style={styles.submittedTitle}>Submitted</Text>
                  <Text style={styles.submittedSubtitle}>Picks Submitted!</Text>
                </View>
              </View>

              {/* Right side - Picks count and Edit */}
              <View style={styles.submittedRight}>
                <View style={styles.submittedPicksBadge}>
                  <Ionicons name="trophy" size={16} color="#FFD700" />
                  <Text style={styles.submittedPicksText}>{picksCount} picks</Text>
                </View>
                <TouchableOpacity
                  style={styles.submittedEditButton}
                  onPress={handleEditPicks}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil" size={14} color="#fff" />
                  <Text style={styles.submittedEditText}>Edit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Event Info */}
        <View style={styles.eventInfo}>
          {event.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                {event.location}
              </Text>
            </View>
          )}
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {new Date(event.event_date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
          {/* Progress row with clear button */}
          {!locked && !isSubmitted && (
            <View style={styles.picksProgressRow}>
              <Text style={[styles.picksProgressText, { color: colors.textSecondary }]}>
                {picksCount} of {totalBouts} picks
              </Text>
              {picksCount === totalBouts && totalBouts > 0 && (
                <Ionicons name="checkmark-circle" size={14} color={colors.success} style={{ marginLeft: 4 }} />
              )}
              {picksCount > 0 && (
                <TouchableOpacity
                  onPress={handleClearAllPicks}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.clearButton}
                >
                  <Text style={[styles.clearButtonText, { color: colors.textTertiary }]}>
                    Clear
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {locked && (
            <View style={[styles.lockedBanner, { backgroundColor: colors.warningSoft }]}>
              <Ionicons name="lock-closed" size={20} color={colors.warning} />
              <View style={styles.lockedContent}>
                <Text style={[styles.lockedTitle, { color: colors.warning }]}>
                  Picks Locked
                </Text>
                <Text style={[styles.lockedSubtitle, { color: colors.textSecondary }]}>
                  Enjoy the fights! Results will appear as fights complete.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Fights List */}
        {bouts.map((bout, index) => {
          const liveStatus = liveStatusMap?.get(bout.id);
          const isLive = liveStatus?.isLive || liveStatus?.isScoring;
          const canScore = liveStatus?.phase === 'ROUND_BREAK';

          return (
          <SurfaceCard
            key={bout.id}
            weakWash
            animatedBorder={index === 0 && !isSubmitted}
            paddingSize="sm"
            style={styles.fightCard}
          >
            {/* Order Index / Weight Class / Live Badge / Compare Button */}
            <View style={styles.fightHeader}>
              <View style={styles.fightHeaderLeft}>
                <Text style={[styles.fightOrder, { color: colors.accent }]}>
                  {index === 0 ? 'Main Event' : `Fight ${bouts.length - index}`}
                </Text>
                {liveStatus?.phase && (
                  <LiveBadge
                    phase={liveStatus.phase as RoundPhase}
                    currentRound={liveStatus.currentRound}
                    size="sm"
                    showRound
                  />
                )}
              </View>
              <View style={styles.fightHeaderRight}>
                {bout.weight_class && (
                  <Text style={[styles.weightClass, { color: colors.textTertiary }]}>
                    {bout.weight_class}
                  </Text>
                )}
                {bout.red_fighter_ufcstats_id && bout.blue_fighter_ufcstats_id && (
                  <TouchableOpacity
                    style={[styles.compareButton, { backgroundColor: colors.surfaceAlt }]}
                    onPress={() => handleOpenComparison(bout)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="stats-chart-outline" size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Voided/Canceled Banner */}
            {(bout.status === 'canceled' || bout.status === 'replaced' || bout.pick?.status === 'voided') && (
              <View style={[styles.canceledBanner, { backgroundColor: colors.dangerSoft }]}>
                <Text style={[styles.canceledText, { color: colors.danger }]}>
                  Fight Canceled - Pick Voided
                </Text>
              </View>
            )}

            {/* Fighters - Side by Side Pills */}
            {(() => {
              const pcts = communityPercentages?.get(bout.id);
              const userHasPicked = !!bout.pick;
              const hasEnoughPicks = (pcts?.total_picks || 0) >= MIN_COMMUNITY_PICKS;
              const showCommunity = userHasPicked && hasEnoughPicks;

              const redPct = pcts?.fighter_a_percentage || 0;
              const bluePct = pcts?.fighter_b_percentage || 0;
              const pickedRed = bout.pick?.picked_corner === 'red';
              const pickedBlue = bout.pick?.picked_corner === 'blue';

              return (
                <>
                  {/* Fighter Pills Row */}
                  <View style={styles.fightersRow}>
                    <FighterPill
                      name={bout.red_name}
                      corner="red"
                      isSelected={pickedRed}
                      locked={locked || isSubmitted || bout.status !== 'scheduled'}
                      onPress={() => handlePickFighter(bout, 'red')}
                      fighterId={bout.red_fighter_ufcstats_id}
                      onFighterInfo={handleFighterInfo}
                    />

                    <Text style={[styles.vs, { color: colors.textTertiary }]}>vs</Text>

                    <FighterPill
                      name={bout.blue_name}
                      corner="blue"
                      isSelected={pickedBlue}
                      locked={locked || isSubmitted || bout.status !== 'scheduled'}
                      onPress={() => handlePickFighter(bout, 'blue')}
                      fighterId={bout.blue_fighter_ufcstats_id}
                      onFighterInfo={handleFighterInfo}
                    />
                  </View>

                  {/* Labels Row - Your pick + prediction + percentages under each fighter */}
                  {userHasPicked && (
                    <View style={styles.labelsRow}>
                      <View style={styles.labelColumn}>
                        {pickedRed && (
                          <>
                            <Text style={[styles.pickLabel, { color: colors.textTertiary }]}>
                              Your pick
                            </Text>
                            {(bout.pick?.picked_method || bout.pick?.picked_round) && (
                              <Text style={[styles.predictionLabel, { color: colors.accent }]} numberOfLines={1}>
                                {bout.pick.picked_method?.replace('Decision - ', '').replace('Submission - ', '') || ''}
                                {bout.pick.picked_method && bout.pick.picked_round ? ' ' : ''}
                                {bout.pick.picked_round ? `R${bout.pick.picked_round}` : ''}
                              </Text>
                            )}
                          </>
                        )}
                        {showCommunity && (
                          <Text style={[styles.pctLabel, { color: colors.textSecondary }]}>
                            {redPct.toFixed(0)}%
                          </Text>
                        )}
                      </View>
                      <View style={styles.labelSpacer} />
                      <View style={styles.labelColumn}>
                        {pickedBlue && (
                          <>
                            <Text style={[styles.pickLabel, { color: colors.textTertiary }]}>
                              Your pick
                            </Text>
                            {(bout.pick?.picked_method || bout.pick?.picked_round) && (
                              <Text style={[styles.predictionLabel, { color: colors.accent }]} numberOfLines={1}>
                                {bout.pick.picked_method?.replace('Decision - ', '').replace('Submission - ', '') || ''}
                                {bout.pick.picked_method && bout.pick.picked_round ? ' ' : ''}
                                {bout.pick.picked_round ? `R${bout.pick.picked_round}` : ''}
                              </Text>
                            )}
                          </>
                        )}
                        {showCommunity && (
                          <Text style={[styles.pctLabel, { color: colors.textSecondary }]}>
                            {bluePct.toFixed(0)}%
                          </Text>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Community Bar - two-color split showing both corners */}
                  {showCommunity && (
                    <View style={styles.communityBarContainer}>
                      <View style={styles.communityBar}>
                        <View
                          style={[
                            styles.communityBarRed,
                            {
                              backgroundColor: cornerColors.red,
                              width: `${redPct}%`,
                            }
                          ]}
                        />
                        <View
                          style={[
                            styles.communityBarBlue,
                            {
                              backgroundColor: cornerColors.blue,
                              flex: 1,
                            }
                          ]}
                        />
                      </View>
                      <Text style={[styles.communityLabel, { color: colors.textTertiary }]}>
                        Community picks
                      </Text>
                    </View>
                  )}
                </>
              );
            })()}

            {/* Result (if available) */}
            {bout.result?.winner_corner && (() => {
              // Extract just the method (first line, before any extra details)
              const methodOnly = bout.result.method?.split('\n')[0]?.trim() || bout.result.method;
              return (
                <View style={[styles.resultContainer, { borderTopColor: colors.border }]}>
                  <View style={styles.resultRow}>
                    <View style={styles.resultInfo}>
                      <Text style={[styles.resultText, { color: colors.text }]} numberOfLines={1}>
                        {bout.result.winner_corner === 'draw' || bout.result.winner_corner === 'nc'
                          ? bout.result.winner_corner.toUpperCase()
                          : `${bout.result.winner_corner === 'red' ? bout.red_name : bout.blue_name} wins`}
                        {methodOnly ? ` via ${methodOnly}` : ''}
                        {bout.result.round ? ` R${bout.result.round}` : ''}
                        {bout.result.time ? ` ${bout.result.time}` : ''}
                      </Text>
                    </View>
                    {bout.pick?.status === 'graded' && (
                      <View
                        style={[
                          styles.gradeBadge,
                          { backgroundColor: bout.pick.score === 1 ? colors.success : colors.danger },
                        ]}
                      >
                        <Text style={styles.gradeText}>
                          {bout.pick.score === 1 ? 'Correct' : 'Missed'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })()}

            {/* Score Fight Button - shown when fight is live */}
            {isLive && (
              <TouchableOpacity
                style={[
                  styles.scoreFightButton,
                  {
                    backgroundColor: canScore ? colors.success : colors.surfaceAlt,
                    borderColor: canScore ? colors.success : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/bout/${bout.id}/scorecard`);
                }}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={canScore ? 'create-outline' : 'stats-chart-outline'}
                  size={16}
                  color={canScore ? '#fff' : colors.text}
                />
                <Text
                  style={[
                    styles.scoreFightButtonText,
                    { color: canScore ? '#fff' : colors.text },
                  ]}
                >
                  {canScore ? 'Score This Round' : 'View Scorecard'}
                </Text>
              </TouchableOpacity>
            )}
          </SurfaceCard>
        );
        })}

        {/* Bottom padding for tab bar and submit button */}
        <View style={{ height: 100 + (picksCount > 0 && !locked && !isSubmitted ? 70 : 0) }} />
      </ScrollView>

      {/* Lock Explainer Modal */}
      <LockExplainerModal
        visible={showLockExplainer}
        onDismiss={handleDismissLockExplainer}
      />

      {/* Auth Prompt Modal - shown when unauthenticated user tries to pick or submit */}
      <AuthPromptModal
        visible={showGate}
        onClose={closeGate}
        onSignIn={() => {
          closeGate();
          router.push('/(auth)/sign-in');
        }}
        onContinueAsGuest={isGuest ? undefined : async () => {
          await enterGuestMode();
          closeGate();
        }}
        context={gateContext || 'picks'}
      />

      {/* Method Picker Modal - shown when user picks a fighter */}
      <MethodPickerModal
        visible={showMethodModal}
        onClose={() => {
          setShowMethodModal(false);
          setPendingPick(null);
        }}
        onConfirm={savePick}
        redFighter={pendingPick?.bout.red_name || ''}
        blueFighter={pendingPick?.bout.blue_name || ''}
        selectedCorner={pendingPick?.corner || 'red'}
        currentMethod={pendingPick?.bout.pick?.picked_method}
        currentRound={pendingPick?.bout.pick?.picked_round}
        scheduledRounds={pendingPick?.bout.scheduled_rounds}
        orderIndex={bouts?.findIndex(b => b.id === pendingPick?.bout.id)}
      />

      {/* Fighter Comparison Modal */}
      <FighterComparisonModal
        visible={showComparison}
        onClose={() => {
          setShowComparison(false);
          setComparisonBout(null);
        }}
        redFighterId={comparisonBout?.red_fighter_ufcstats_id || ''}
        blueFighterId={comparisonBout?.blue_fighter_ufcstats_id || ''}
        redFighterName={comparisonBout?.red_name || ''}
        blueFighterName={comparisonBout?.blue_name || ''}
        weightClass={comparisonBout?.weight_class}
      />

      {/* Submit Button - Fixed above tab bar (only when not submitted) */}
      {!locked && picksCount > 0 && !isSubmitted && (
        <View style={[styles.submitContainer, { bottom: Math.max(insets.bottom, 16) + 80 }]}>
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.accent }]}
            onPress={handleOpenSubmitModal}
            activeOpacity={0.85}
          >
            <Text style={styles.submitButtonText}>
              Submit Card ({picksCount} {picksCount === 1 ? 'pick' : 'picks'})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Submit Confirmation Modal */}
      <Modal
        visible={showSubmitModal}
        transparent
        animationType="none"
        onRequestClose={() => setShowSubmitModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowSubmitModal(false)}
        >
          <Animated.View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.surface,
                transform: [{ scale: submitModalScale }],
                opacity: submitModalOpacity,
              },
            ]}
          >
            <TouchableOpacity activeOpacity={1}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Submit Your Picks?
              </Text>

              <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                You're submitting {picksCount} of {totalBouts} picks for {event?.name}.
              </Text>

              {picksCount < totalBouts && (
                <View style={[styles.modalHint, { backgroundColor: colors.warningSoft }]}>
                  <Ionicons name="information-circle" size={18} color={colors.warning} />
                  <Text style={[styles.modalHintText, { color: colors.warning }]}>
                    You can still pick {totalBouts - picksCount} more {totalBouts - picksCount === 1 ? 'fight' : 'fights'}
                  </Text>
                </View>
              )}

              {picksCount === totalBouts && (
                <View style={[styles.modalHint, { backgroundColor: colors.successSoft }]}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Text style={[styles.modalHintText, { color: colors.success }]}>
                    Full card complete!
                  </Text>
                </View>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalCancelButton, { backgroundColor: colors.surfaceAlt }]}
                  onPress={() => setShowSubmitModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSubmitButton, { backgroundColor: colors.accent }]}
                  onPress={handleSubmitPicks}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalSubmitText}>Submit</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Global Tab Bar for navigation consistency */}
      <GlobalTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    borderBottomWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  progressHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
  },
  progressText: {
    ...typography.meta,
    fontWeight: '500',
  },
  clearAllButton: {
    marginLeft: spacing.md,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '500',
  },
  backButton: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    ...typography.h3,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scorecardsButton: {
    width: 40,
    alignItems: 'flex-end',
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  eventInfo: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  picksProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  picksProgressText: {
    fontSize: 13,
  },
  clearButton: {
    marginLeft: 'auto',
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  locationText: {
    ...typography.body,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateText: {
    ...typography.body,
  },
  // Submitted Banner - Red glow style
  submittedBannerOuter: {
    marginBottom: spacing.md,
    // Red glow effect
    shadowColor: '#C54A50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  submittedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  submittedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  submittedCheckCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submittedTextContainer: {
    gap: 1,
  },
  submittedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  submittedSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  submittedRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  submittedPicksBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,200,100,0.4)',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  submittedPicksText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD700',
  },
  submittedEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  submittedEditText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  lockedContent: {
    flex: 1,
  },
  lockedTitle: {
    ...typography.body,
    fontWeight: '700',
    marginBottom: 2,
  },
  lockedSubtitle: {
    ...typography.meta,
  },
  lockedText: {
    ...typography.body,
    fontWeight: '600',
  },
  fightCard: {
    marginBottom: 0,
  },
  fightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  fightHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fightHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fightOrder: {
    fontSize: 11,
    fontWeight: '600',
  },
  weightClass: {
    fontSize: 11,
  },
  compareButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreFightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
    borderWidth: 1,
  },
  scoreFightButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  canceledBanner: {
    borderRadius: radius.sm,
    padding: spacing.xs,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  canceledText: {
    fontSize: 11,
    fontWeight: '600',
  },
  fightersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  vs: {
    fontSize: 11,
    fontWeight: '500',
    paddingHorizontal: 2,
  },
  labelsRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  labelColumn: {
    flex: 1,
    alignItems: 'center',
  },
  pickLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  predictionLabel: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
  },
  pctLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  labelSpacer: {
    width: 24,
  },
  communityBarContainer: {
    marginTop: 4,
  },
  communityBar: {
    flexDirection: 'row',
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  communityBarRed: {
    height: '100%',
  },
  communityBarBlue: {
    height: '100%',
  },
  communityLabel: {
    fontSize: 9,
    textAlign: 'center',
    marginTop: 3,
    fontWeight: '500',
  },
  resultContainer: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultInfo: {
    flex: 1,
  },
  resultText: {
    fontSize: 12,
    fontWeight: '600',
  },
  resultMethod: {
    fontSize: 10,
    marginTop: 1,
  },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginLeft: spacing.sm,
  },
  gradeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  // Submit Button & Modal
  submitContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    backgroundColor: 'transparent',
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  submittedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  submittedBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 12,
    borderRadius: radius.button,
  },
  submittedText: {
    fontSize: 15,
    fontWeight: '600',
  },
  editButton: {
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.button,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  modalTitle: {
    ...displayTypography.eventTitle,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  modalDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  modalHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.lg,
  },
  modalHintText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.button,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalSubmitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.button,
    alignItems: 'center',
  },
  modalSubmitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
