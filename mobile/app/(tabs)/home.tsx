/**
 * Home screen - Premium "Muted Red Accent" design
 * Features: SurfaceCard with layered gradients, PrimaryCTA with haptics,
 * ProgressPill with animated fill, CountdownText with tabular numerals
 */

import { View, Text, StyleSheet, ScrollView, RefreshControl, Animated, TouchableOpacity, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/useAuth';
import { useNextEvent, useBoutsForEvent, useRecentPicksSummary, useUserStats } from '../../hooks/useQueries';
import { useTheme } from '../../lib/theme';
import { useDrawer } from '../../lib/DrawerContext';
import { useOnboarding } from '../../hooks/useOnboarding';
import { spacing, radius, typography } from '../../lib/tokens';
import { Button, EmptyState, SurfaceCard, PrimaryCTA, ProgressPill } from '../../components/ui';
import { SkeletonEventCard } from '../../components/SkeletonStats';
import { ErrorState } from '../../components/ErrorState';
import { FirstLaunchHero } from '../../components/FirstLaunchHero';
import { FirstGradedModal } from '../../components/FirstGradedModal';
import { useEffect, useState, useRef } from 'react';

export default function Home() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { user, isGuest } = useAuth();
  const { openDrawer } = useDrawer();
  const insets = useSafeAreaInsets();
  const { state: onboardingState, isLoaded: onboardingLoaded } = useOnboarding();
  const { data: nextEvent, isLoading: eventLoading, isError: eventError, refetch: refetchEvent } = useNextEvent();
  const { data: bouts, isLoading: boutsLoading, isError: boutsError, refetch: refetchBouts } = useBoutsForEvent(
    nextEvent?.id || null,
    user?.id || null,
    isGuest
  );
  const { data: recentSummary, refetch: refetchSummary } = useRecentPicksSummary(user?.id || null, 1);
  const { data: userStats } = useUserStats(user?.id || null);
  const { markSeen } = useOnboarding();

  const [refreshing, setRefreshing] = useState(false);
  const [showFirstGradedModal, setShowFirstGradedModal] = useState(false);

  // Screen entrance animation - staggered
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslate = useRef(new Animated.Value(6)).current;
  const secondaryOpacity = useRef(new Animated.Value(0)).current;
  const secondaryTranslate = useRef(new Animated.Value(6)).current;

  // Track completion for haptic
  const wasCompleteRef = useRef(false);

  // Countdown state
  const [timeUntil, setTimeUntil] = useState<string>('');
  const [isNearEvent, setIsNearEvent] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchEvent(), refetchBouts(), refetchSummary()]);
    setRefreshing(false);
  };

  // Screen entrance animation on mount - staggered cards
  useEffect(() => {
    // Hero card enters first
    Animated.parallel([
      Animated.timing(heroOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(heroTranslate, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Secondary card enters with 60ms delay
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(secondaryOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(secondaryTranslate, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, 60);
  }, [heroOpacity, heroTranslate, secondaryOpacity, secondaryTranslate]);

  // Countdown timer
  useEffect(() => {
    if (!nextEvent) return;

    const updateCountdown = () => {
      const now = new Date();
      const eventDate = new Date(nextEvent.event_date);
      const diff = eventDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeUntil('Event Started');
        setIsNearEvent(false);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      const totalHours = days * 24 + hours;
      setIsNearEvent(totalHours < 24);

      // Format with separators and zero-padded values
      const pad = (n: number) => n.toString().padStart(2, '0');

      if (days > 0) {
        setTimeUntil(`${days}d · ${pad(hours)}h · ${pad(minutes)}m`);
      } else if (hours > 0) {
        setTimeUntil(`${hours}h · ${pad(minutes)}m`);
      } else {
        setTimeUntil(`${minutes}m`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [nextEvent]);

  // Pulse animation when event is near
  useEffect(() => {
    if (isNearEvent) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isNearEvent, pulseAnim]);

  const picksCount = bouts?.filter((b) => b.pick).length || 0;
  const totalBouts = bouts?.length || 0;
  const lastEventSummary = recentSummary?.[0];
  const isLocked = nextEvent ? new Date(nextEvent.event_date) <= new Date() : false;
  const isAllPicked = picksCount === totalBouts && totalBouts > 0;

  // Trigger completion haptic
  useEffect(() => {
    if (isAllPicked && !wasCompleteRef.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    wasCompleteRef.current = isAllPicked;
  }, [isAllPicked]);

  // Check if user is new
  const isNewUser = onboardingLoaded &&
    !onboardingState.hasDismissedFirstLaunch &&
    (userStats?.total_picks ?? 0) === 0 &&
    !lastEventSummary;

  // Show first graded celebration modal
  useEffect(() => {
    if (
      onboardingLoaded &&
      !onboardingState.hasSeenFirstEventCelebration &&
      lastEventSummary &&
      lastEventSummary.total > 0
    ) {
      setShowFirstGradedModal(true);
    }
  }, [onboardingLoaded, onboardingState.hasSeenFirstEventCelebration, lastEventSummary]);

  const handleDismissFirstGradedModal = () => {
    setShowFirstGradedModal(false);
    markSeen('hasSeenFirstEventCelebration');
  };

  // Deterministic CTA logic
  const getCtaConfig = () => {
    if (!nextEvent) return null;

    const isCompleted = nextEvent.status === 'completed';
    const allPicked = picksCount === totalBouts && totalBouts > 0;

    if (isCompleted) {
      return { title: 'View Results', route: `/event/${nextEvent.id}` as const, isPrimary: false };
    }
    if (isLocked) {
      return { title: 'View Picks', route: `/event/${nextEvent.id}` as const, isPrimary: false };
    }
    if (allPicked) {
      return { title: 'All Picks In', route: `/event/${nextEvent.id}` as const, isPrimary: true };
    }
    if (picksCount > 0) {
      return { title: 'Continue Picking', route: `/event/${nextEvent.id}` as const, isPrimary: true };
    }
    return { title: 'Make Picks', route: `/event/${nextEvent.id}` as const, isPrimary: true };
  };

  // Time estimate based on fight count
  const getTimeEstimate = () => {
    if (totalBouts <= 10) return '~1 min';
    if (totalBouts <= 14) return '~2 min';
    return '~3 min';
  };

  // Compact countdown for micro-context
  const getCompactCountdown = () => {
    if (!nextEvent) return '';
    if (isLocked) return 'locked';

    const now = new Date();
    const eventDate = new Date(nextEvent.event_date);
    const diff = eventDate.getTime() - now.getTime();

    if (diff <= 0) return 'locked';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${minutes}m`;
  };

  const ctaConfig = getCtaConfig();

  // Canvas background - flat, neutral
  const canvasBackground = colors.canvasBg;

  if (eventLoading) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: canvasBackground }]}
        contentContainerStyle={styles.content}
      >
        <SkeletonEventCard />
        <SkeletonEventCard />
      </ScrollView>
    );
  }

  if (eventError) {
    return (
      <View style={[styles.container, { backgroundColor: canvasBackground }]}>
        <ErrorState
          message="Failed to load upcoming events. Check your connection and try again."
          onRetry={() => refetchEvent()}
        />
      </View>
    );
  }

  if (boutsError) {
    return (
      <View style={[styles.container, { backgroundColor: canvasBackground }]}>
        <ErrorState
          message="Failed to load event details. Check your connection and try again."
          onRetry={() => refetchBouts()}
        />
      </View>
    );
  }

  if (!nextEvent) {
    return (
      <View style={[styles.container, { backgroundColor: canvasBackground }]}>
        <EmptyState
          icon="calendar-outline"
          title="No Upcoming Events"
          message="Check back soon for the next UFC event and start making your picks!"
          actionLabel="Refresh"
          onAction={onRefresh}
        />
      </View>
    );
  }

  // Render countdown with refined typography
  const renderCountdown = () => {
    if (!timeUntil) return null;

    // Parse the countdown string to separate numbers from units
    const parts = timeUntil.split(' · ');
    return (
      <View style={styles.countdownParts}>
        {parts.map((part, index) => {
          const match = part.match(/^(\d+)([dhm])$/);
          if (match) {
            const [, num, unit] = match;
            return (
              <View key={`countdown-${unit}`} style={styles.countdownPart}>
                {index > 0 && (
                  <Text style={[styles.countdownSeparator, { color: colors.textTertiary }]}>
                    ·
                  </Text>
                )}
                <Text style={[styles.countdownNum, { color: colors.accent }]}>
                  {num}
                </Text>
                <Text style={[styles.countdownUnit, { color: colors.textSecondary }]}>
                  {unit}
                </Text>
              </View>
            );
          }
          // Fallback for non-matching (e.g., "Event Started")
          return (
            <Text key={`countdown-fallback-${part}`} style={[styles.countdownNum, { color: colors.accent }]}>
              {part}
            </Text>
          );
        })}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: canvasBackground }]}>
      {/* Header with menu button */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            openDrawer();
          }}
          style={styles.menuButton}
          accessibilityLabel="Open menu"
          accessibilityRole="button"
        >
          <Ionicons name="menu" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>UFC Picks</Text>
        <View style={styles.headerSpacer} />
      </View>

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
        {/* First Launch Hero for new users */}
        {isNewUser && (
          <FirstLaunchHero eventId={nextEvent?.id} />
        )}

        {/* Guest Mode Notice */}
        {isGuest && !isNewUser && (
          <TouchableOpacity
            style={[styles.guestNotice, { backgroundColor: colors.surfaceAlt }]}
            onPress={() => router.push('/(auth)/sign-in')}
            activeOpacity={0.8}
          >
            <Ionicons name="cloud-offline-outline" size={16} color={colors.textTertiary} />
            <Text style={[styles.guestNoticeText, { color: colors.textTertiary }]}>
              Guest mode — picks saved locally
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
          </TouchableOpacity>
        )}

        {/* NEXT EVENT Card - Hero with enhanced glow and animated border */}
        <Animated.View
          style={{
            opacity: heroOpacity,
            transform: [{ translateY: heroTranslate }],
          }}
        >
          <SurfaceCard heroGlow animatedBorder>
            <Text style={[styles.cardLabel, { color: colors.textTertiary }]}>
              NEXT EVENT
            </Text>
            <Text style={[styles.eventName, { color: colors.textPrimary }]}>
              {nextEvent.name}
            </Text>
            {nextEvent.location && (
              <Text style={[styles.eventLocation, { color: colors.textSecondary }]}>
                {nextEvent.location}
              </Text>
            )}

            {/* Countdown Block with inset surface */}
            <View
              style={[
                styles.countdownInset,
                { backgroundColor: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.025)' }
              ]}
              accessibilityRole="timer"
              accessibilityLabel={`${isLocked ? 'Event has started' : `Picks lock in ${timeUntil}`}`}
              accessibilityLiveRegion="polite"
            >
              <Text style={[styles.countdownLabel, { color: colors.textSecondary }]}>
                {isLocked ? 'Event Started' : 'Picks Lock In'}
              </Text>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                {renderCountdown()}
              </Animated.View>
            </View>

            {/* Picks Progress */}
            <View style={styles.progressContainer}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                Your Picks
              </Text>
              <Text style={[styles.progressValue, { color: colors.textPrimary }]}>
                {picksCount} / {totalBouts}
              </Text>
            </View>

            {totalBouts > 0 && (
              <View style={styles.progressBarContainer}>
                <ProgressPill progress={(picksCount / totalBouts) * 100} />
              </View>
            )}

            {/* Micro-context */}
            {totalBouts > 0 && !isLocked && (
              <Text style={[styles.microContext, { color: colors.textTertiary }]}>
                {totalBouts} fights · {getTimeEstimate()} · locks in {getCompactCountdown()}
              </Text>
            )}

            {/* CTA Button */}
            {ctaConfig && (
              ctaConfig.isPrimary ? (
                <PrimaryCTA
                  title={ctaConfig.title}
                  onPress={() => router.push(ctaConfig.route)}
                />
              ) : (
                <Button
                  title={ctaConfig.title}
                  onPress={() => router.push(ctaConfig.route)}
                  variant="secondary"
                />
              )
            )}
          </SurfaceCard>
        </Animated.View>

        {/* LAST EVENT Card - with animated border (staggered entrance) */}
        {lastEventSummary && (
          <Animated.View
            style={{
              opacity: secondaryOpacity,
              transform: [{ translateY: secondaryTranslate }],
            }}
          >
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/event/${lastEventSummary.event.id}`);
              }}
              activeOpacity={0.85}
            >
              <SurfaceCard weakWash animatedBorder>
                <Text style={[styles.cardLabel, { color: colors.textTertiary }]}>
                  LAST EVENT
                </Text>
                <Text style={[styles.lastEventName, { color: colors.textPrimary }]}>
                  {lastEventSummary.event.name}
                </Text>

                <View style={styles.lastEventStats}>
                  <Text style={[styles.lastEventLabel, { color: colors.textSecondary }]}>
                    Your Results
                  </Text>
                  <Text style={[styles.lastEventValue, { color: colors.textPrimary }]}>
                    {lastEventSummary.correct} / {lastEventSummary.total} Correct
                  </Text>
                </View>

                {lastEventSummary.total > 0 && (
                  <Text style={[styles.lastEventAccuracy, { color: colors.success }]}>
                    {Math.round((lastEventSummary.correct / lastEventSummary.total) * 100)}% Accuracy
                  </Text>
                )}
              </SurfaceCard>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* First Graded Celebration Modal */}
        <FirstGradedModal
          visible={showFirstGradedModal}
          correct={lastEventSummary?.correct ?? 0}
          total={lastEventSummary?.total ?? 0}
          onDismiss={handleDismissFirstGradedModal}
        />
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  menuButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
    marginLeft: -spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 36,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100, // Account for floating tab bar
    gap: 16,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    opacity: 0.7,
  },
  eventName: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    marginVertical: 18,
  },
  // Inset surface for countdown - subtle depth
  countdownInset: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginHorizontal: -18,
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 14,
  },
  countdownLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  // Refined countdown typography
  countdownParts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  countdownPart: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  countdownNum: {
    fontSize: 30,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  countdownUnit: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 1,
    opacity: 0.7,
  },
  countdownSeparator: {
    fontSize: 20,
    fontWeight: '400',
    marginHorizontal: 10,
    opacity: 0.4,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressValue: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  microContext: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 20,
  },
  lastEventName: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 14,
  },
  lastEventStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  lastEventLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  lastEventValue: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  lastEventAccuracy: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  guestNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  guestNoticeText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
});
