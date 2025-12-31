/**
 * Home screen - next event, picks progress, countdown
 */

import { View, Text, StyleSheet, ScrollView, RefreshControl, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useNextEvent, useBoutsForEvent, useRecentPicksSummary } from '../../hooks/useQueries';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { Card, Button, ProgressBar, EmptyState } from '../../components/ui';
import { SkeletonEventCard } from '../../components/SkeletonStats';
import { ErrorState } from '../../components/ErrorState';
import { useEffect, useState, useRef } from 'react';

export default function Home() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { data: nextEvent, isLoading: eventLoading, isError: eventError, refetch: refetchEvent } = useNextEvent();
  const { data: bouts, isLoading: boutsLoading, isError: boutsError, refetch: refetchBouts } = useBoutsForEvent(
    nextEvent?.id || null,
    user?.id || null
  );
  const { data: recentSummary, refetch: refetchSummary } = useRecentPicksSummary(user?.id || null, 1);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchEvent(), refetchBouts(), refetchSummary()]);
    setRefreshing(false);
  };

  const [timeUntil, setTimeUntil] = useState<string>('');
  const [isNearEvent, setIsNearEvent] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Countdown timer
  useEffect(() => {
    if (!nextEvent) return;

    const updateCountdown = () => {
      const now = new Date();
      const eventDate = new Date(nextEvent.event_date);
      const diff = eventDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeUntil('Event started');
        setIsNearEvent(false);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      const totalHours = days * 24 + hours;
      setIsNearEvent(totalHours < 24);

      if (days > 0) {
        setTimeUntil(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeUntil(`${hours}h ${minutes}m`);
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
            toValue: 1.03,
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

  if (eventLoading) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <SkeletonEventCard />
        <SkeletonEventCard />
      </ScrollView>
    );
  }

  if (eventError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ErrorState
          message="Failed to load upcoming events. Check your connection and try again."
          onRetry={() => refetchEvent()}
        />
      </View>
    );
  }

  if (boutsError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ErrorState
          message="Failed to load event details. Check your connection and try again."
          onRetry={() => refetchBouts()}
        />
      </View>
    );
  }

  if (!nextEvent) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
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

  const isLocked = new Date(nextEvent.event_date) <= new Date();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
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
      {/* Next Event Card */}
      <Card>
        <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
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

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        <View style={styles.countdownContainer}>
          <Text style={[styles.countdownLabel, { color: colors.textSecondary }]}>
            {isLocked ? 'Event Started' : 'Picks Lock In'}
          </Text>
          <Animated.Text
            style={[
              styles.countdownTime,
              { color: colors.accent, transform: [{ scale: pulseAnim }] }
            ]}
          >
            {timeUntil}
          </Animated.Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

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
            <ProgressBar progress={(picksCount / totalBouts) * 100} />
          </View>
        )}

        {!isLocked && (
          <Button
            title={picksCount === 0 ? 'Start Picking' : 'Continue Picking'}
            onPress={() => router.push('/(tabs)/pick')}
          />
        )}

        {isLocked && picksCount > 0 && (
          <View style={[styles.lockedBanner, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.lockedText, { color: colors.textSecondary }]}>
              🔒 Picks Locked
            </Text>
          </View>
        )}
      </Card>

      {/* Last Event Summary */}
      {lastEventSummary && (
        <Card>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
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
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  cardLabel: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  eventName: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  eventLocation: {
    ...typography.meta,
  },
  divider: {
    height: 1,
    marginVertical: spacing.lg,
  },
  countdownContainer: {
    alignItems: 'center',
  },
  countdownLabel: {
    ...typography.meta,
    marginBottom: spacing.xs,
  },
  countdownTime: {
    ...typography.h1,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    ...typography.meta,
  },
  progressValue: {
    ...typography.h3,
  },
  progressBarContainer: {
    marginBottom: spacing.lg,
  },
  lockedBanner: {
    borderRadius: radius.sm,
    padding: spacing.md,
    alignItems: 'center',
  },
  lockedText: {
    ...typography.body,
    fontWeight: '600',
  },
  lastEventName: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  lastEventStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  lastEventLabel: {
    ...typography.meta,
  },
  lastEventValue: {
    ...typography.body,
    fontWeight: '700',
  },
  lastEventAccuracy: {
    ...typography.meta,
    textAlign: 'right',
  },
});
