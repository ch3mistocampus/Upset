/**
 * Picks tab - shows list of upcoming events
 * Tap an event to see bouts and make picks
 * Theme-aware design with staggered entrance animations
 */

import { View, Text, StyleSheet, ScrollView, RefreshControl, Animated, Easing } from 'react-native';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useUpcomingEvents, useBoutsCount, useUserPicksCount } from '../../hooks/useQueries';
import { useTheme } from '../../lib/theme';
import { spacing, typography, displayTypography } from '../../lib/tokens';
import { isEventSubmitted } from '../../lib/storage';
import { EmptyState, SurfaceCard } from '../../components/ui';
import { ErrorState } from '../../components/ErrorState';
import { EventCard } from '../../components/EventCard';
import { Event } from '../../types/database';

// Wrapper component to fetch picks/bouts counts for each event
interface EventCardWithCountsProps {
  event: Event;
  isFirstUpcoming?: boolean;
  index: number;
}

function EventCardWithCounts({ event, isFirstUpcoming, index }: EventCardWithCountsProps) {
  const { user } = useAuth();
  const { data: boutsCount = 0 } = useBoutsCount(event.id);
  const { data: picksCount = 0 } = useUserPicksCount(event.id, user?.id || null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Staggered entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(8)).current;

  // Re-check submission status when screen is focused (e.g., after returning from event page)
  useFocusEffect(
    useCallback(() => {
      isEventSubmitted(event.id).then(setIsSubmitted);
    }, [event.id])
  );

  useEffect(() => {
    const delay = 60 + index * 60; // 60ms base + 60ms stagger
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateAnim, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [fadeAnim, translateAnim, index]);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: translateAnim }],
      }}
    >
      <EventCard
        event={event}
        picksCount={picksCount}
        totalBouts={boutsCount}
        isFirstUpcoming={isFirstUpcoming}
        isSubmitted={isSubmitted}
      />
    </Animated.View>
  );
}

// Skeleton loader for events list with staggered animation
function SkeletonEventCard({ index }: { index: number }) {
  const { colors } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0.3)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance fade
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }, index * 60);

    // Shimmer effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => clearTimeout(timer);
  }, [shimmerAnim, fadeAnim, index]);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <SurfaceCard weakWash>
        <Animated.View style={[skeletonStyles.titleLine, { backgroundColor: colors.surfaceAlt, opacity: shimmerAnim }]} />
        <Animated.View style={[skeletonStyles.metaLine, { backgroundColor: colors.surfaceAlt, opacity: shimmerAnim }]} />
        <View style={[skeletonStyles.divider, { backgroundColor: colors.border }]} />
        <Animated.View style={[skeletonStyles.footerLine, { backgroundColor: colors.surfaceAlt, opacity: shimmerAnim }]} />
      </SurfaceCard>
    </Animated.View>
  );
}

const skeletonStyles = StyleSheet.create({
  titleLine: {
    height: 20,
    borderRadius: 4,
    width: '70%',
    marginBottom: spacing.md,
  },
  metaLine: {
    height: 16,
    borderRadius: 4,
    width: '50%',
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: spacing.md,
  },
  footerLine: {
    height: 16,
    borderRadius: 4,
    width: '40%',
  },
});

export default function Pick() {
  const { colors } = useTheme();
  const { data: events, isLoading, isError, refetch } = useUpcomingEvents();
  const [refreshing, setRefreshing] = useState(false);

  // Header entrance animation
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const headerTranslateAnim = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFadeAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(headerTranslateAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerFadeAnim, headerTranslateAnim]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Find first upcoming (not locked) event
  const getFirstUpcomingEventId = () => {
    if (!events) return null;
    const now = new Date();
    const upcomingEvent = events.find(
      (e) => e.status !== 'completed' && e.status !== 'in_progress' && new Date(e.event_date) > now
    );
    return upcomingEvent?.id || null;
  };

  if (isLoading) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <Animated.View
          style={{
            opacity: headerFadeAnim,
            transform: [{ translateY: headerTranslateAnim }],
          }}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Upcoming Events
          </Text>
        </Animated.View>
        <View style={styles.eventsList}>
          <SkeletonEventCard index={0} />
          <SkeletonEventCard index={1} />
          <SkeletonEventCard index={2} />
        </View>
      </ScrollView>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ErrorState
          message="Failed to load events. Check your connection and try again."
          onRetry={refetch}
        />
      </View>
    );
  }

  if (!events || events.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="calendar-outline"
          title="No Upcoming Events"
          message="No fights scheduled. Every fight is an upset waiting to happen."
          actionLabel="Refresh"
          onAction={onRefresh}
        />
      </View>
    );
  }

  const firstUpcomingId = getFirstUpcomingEventId();

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
      <Animated.View
        style={{
          opacity: headerFadeAnim,
          transform: [{ translateY: headerTranslateAnim }],
        }}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Upcoming Events
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Call it before it happens
        </Text>
      </Animated.View>

      <View style={styles.eventsList}>
        {events.map((event, index) => (
          <EventCardWithCounts
            key={event.id}
            event={event}
            isFirstUpcoming={event.id === firstUpcomingId}
            index={index}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 100, // Account for floating tab bar
  },
  sectionTitle: {
    fontFamily: 'BebasNeue',
    fontSize: 26,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  eventsList: {
    gap: spacing.md,
  },
});
