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
import { spacing, radius, typography } from '../../lib/tokens';
import { submitEvent, isEventSubmitted, unsubmitEvent } from '../../lib/storage';
import { SurfaceCard, EmptyState } from '../../components/ui';
import { ErrorState } from '../../components/ErrorState';
import { SkeletonFightCard } from '../../components/SkeletonFightCard';
import { LockExplainerModal } from '../../components/LockExplainerModal';
import { AuthPromptModal } from '../../components/AuthPromptModal';
import { BoutWithPick, PickInsert } from '../../types/database';
import type { CommunityPickPercentages } from '../../types/social';

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
const FighterPill: React.FC<{
  name: string;
  corner: 'red' | 'blue';
  isSelected: boolean;
  locked: boolean;
  onPress: () => void;
}> = ({ name, corner, isSelected, locked, onPress }) => {
  const { colors } = useTheme();
  const cornerColors = useCornerColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const cornerColor = corner === 'red' ? cornerColors.red : cornerColors.blue;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, tension: 150, friction: 5 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 150, friction: 5 }).start();
  };

  return (
    <Animated.View style={[pillStyles.wrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={[
          pillStyles.pill,
          isSelected
            ? { backgroundColor: cornerColor }
            : { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
          locked && pillStyles.disabled,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={locked}
        activeOpacity={0.85}
      >
        {isSelected && (
          <Ionicons name="checkmark" size={14} color="#fff" style={pillStyles.checkIcon} />
        )}
        <Text
          style={[
            pillStyles.name,
            {
              color: isSelected ? '#fff' : colors.text,
              fontWeight: isSelected ? '700' : '500',
            },
          ]}
          numberOfLines={2}
        >
          {name}
        </Text>
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

  // Handle opening submit modal
  const handleOpenSubmitModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    await Promise.all([refetchEvent(), refetchBouts(), refetchPercentages()]);
    setRefreshing(false);
  };

  const locked = isEventLocked(event || null);

  const handlePickFighter = async (bout: BoutWithPick, corner: 'red' | 'blue') => {
    if (!event) return;

    // If not authenticated and not in guest mode, show auth prompt
    if (!user && !isGuest) {
      openGate('history');
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

    try {
      if (isUnselecting) {
        // Delete the pick by bout_id + user_id
        await deletePick.mutateAsync({
          boutId: bout.id,
          eventId: event.id,
          userId: user?.id || null,
          isGuest,
        });
      } else {
        // Create or update pick
        const pick: PickInsert = {
          user_id: user?.id || 'guest',
          event_id: event.id,
          bout_id: bout.id,
          picked_corner: corner,
        };

        await upsertPick.mutateAsync({ pick, isGuest });
      }
    } catch (error: any) {
      // Only use haptic on error
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      if (error.message?.includes('locked')) {
        toast.showError('Picks are locked. Event has started.');
      } else {
        toast.showError('Failed to save pick. Please try again.');
      }
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

  // Custom header with back button and sticky progress
  const Header = () => (
    <View style={[styles.headerContainer, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={28} color={colors.accent} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {event?.name || 'Event'}
        </Text>
        <View style={styles.headerSpacer} />
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
        {bouts.map((bout, index) => (
          <SurfaceCard
            key={bout.id}
            weakWash
            animatedBorder={index === 0 && !isSubmitted}
            paddingSize="sm"
            style={styles.fightCard}
          >
            {/* Order Index / Weight Class */}
            <View style={styles.fightHeader}>
              <Text style={[styles.fightOrder, { color: colors.accent }]}>
                {index === 0 ? 'Main Event' : `Fight ${bouts.length - index}`}
              </Text>
              {bout.weight_class && (
                <Text style={[styles.weightClass, { color: colors.textTertiary }]}>
                  {bout.weight_class}
                </Text>
              )}
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
              // TODO: Restore after testing: const hasEnoughPicks = (pcts?.total_picks || 0) >= MIN_COMMUNITY_PICKS;
              const hasEnoughPicks = true; // TESTING: bypass for UI preview
              const showCommunity = userHasPicked && hasEnoughPicks;

              // TESTING: Mock percentages to preview bar at various ratios
              const mockRatios = [
                { red: 82, blue: 18 },
                { red: 64, blue: 36 },
                { red: 51, blue: 49 },
                { red: 38, blue: 62 },
                { red: 25, blue: 75 },
                { red: 50, blue: 50 },
              ];
              const mockPct = mockRatios[index % mockRatios.length];
              const redPct = mockPct.red;
              const bluePct = mockPct.blue;
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
                    />

                    <Text style={[styles.vs, { color: colors.textTertiary }]}>vs</Text>

                    <FighterPill
                      name={bout.blue_name}
                      corner="blue"
                      isSelected={pickedBlue}
                      locked={locked || isSubmitted || bout.status !== 'scheduled'}
                      onPress={() => handlePickFighter(bout, 'blue')}
                    />
                  </View>

                  {/* Labels Row - Your pick + percentages under each fighter */}
                  {userHasPicked && (
                    <View style={styles.labelsRow}>
                      <View style={styles.labelColumn}>
                        {pickedRed && (
                          <Text style={[styles.pickLabel, { color: colors.textTertiary }]}>
                            Your pick
                          </Text>
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
                          <Text style={[styles.pickLabel, { color: colors.textTertiary }]}>
                            Your pick
                          </Text>
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
          </SurfaceCard>
        ))}

        {/* Bottom padding for safe area and submit button */}
        <View style={{ height: insets.bottom + spacing.lg + (picksCount > 0 && !locked && !isSubmitted ? 70 : 0) }} />
      </ScrollView>

      {/* Lock Explainer Modal */}
      <LockExplainerModal
        visible={showLockExplainer}
        onDismiss={handleDismissLockExplainer}
      />

      {/* Auth Prompt Modal - shown when unauthenticated user tries to pick */}
      <AuthPromptModal
        visible={showGate}
        onClose={closeGate}
        onSignIn={() => {
          closeGate();
          router.push('/(auth)/sign-in');
        }}
        onContinueAsGuest={async () => {
          await enterGuestMode();
          closeGate();
        }}
        context={gateContext || 'history'}
      />

      {/* Submit Button - Fixed at bottom (only when not submitted) */}
      {!locked && picksCount > 0 && !isSubmitted && (
        <View style={[styles.submitContainer, { paddingBottom: insets.bottom + spacing.md }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
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
  fightOrder: {
    fontSize: 11,
    fontWeight: '600',
  },
  weightClass: {
    fontSize: 11,
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
    fontSize: 20,
    fontWeight: '700',
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
