/**
 * EventCard - Clickable card for event list
 * Shows event name, date, location, and picks progress
 * Theme-aware design with SurfaceCard and haptic feedback
 */

import { TouchableOpacity, View, Text, StyleSheet, Animated } from 'react-native';
import { useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../lib/theme';
import { spacing, radius, typography } from '../lib/tokens';
import { SurfaceCard } from './ui';
import { Event } from '../types/database';

interface EventCardProps {
  event: Event;
  picksCount: number;
  totalBouts: number;
  isFirstUpcoming?: boolean;
  isSubmitted?: boolean;
}

export function EventCard({ event, picksCount, totalBouts, isFirstUpcoming, isSubmitted }: EventCardProps) {
  const router = useRouter();
  const { colors } = useTheme();

  // Press animation
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Check locked status for glow logic
  const isEventLocked = event.status === 'completed' || event.status === 'in_progress' || new Date(event.event_date) <= new Date();
  const showGlow = isSubmitted && !isEventLocked;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.985,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.94,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/event/${event.id}`);
  };

  const isCompleted = event.status === 'completed';
  const isLive = event.status === 'in_progress' || (!isCompleted && new Date(event.event_date) <= new Date());
  const isLocked = isLive || isCompleted;
  const eventDate = new Date(event.event_date);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  // Calculate days until event
  const now = new Date();
  const diffTime = eventDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const getTimeLabel = () => {
    if (isCompleted) return 'Completed';
    if (isLive) return 'In Progress';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `${diffDays} days`;
    return formattedDate;
  };

  // Get status badge for header
  const getStatusBadge = () => {
    if (isCompleted) {
      return (
        <View style={[styles.completedBadge, { backgroundColor: colors.successSoft }]}>
          <Text style={[styles.completedBadgeText, { color: colors.success }]}>DONE</Text>
        </View>
      );
    }
    if (isLive) {
      return (
        <View style={[styles.liveBadge, { backgroundColor: colors.accent }]}>
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      );
    }
    return null;
  };

  // Static glow style for submitted cards
  const submittedGlowStyle = showGlow ? {
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  } : {};

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
          submittedGlowStyle,
        ]}
      >
        <SurfaceCard
          weakWash
          animatedBorder={isFirstUpcoming && !isLocked}
          style={styles.card}
        >
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text
                style={[styles.eventName, { color: colors.text }]}
                numberOfLines={2}
              >
                {event.name}
              </Text>
              {getStatusBadge()}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </View>

          <View style={styles.details}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                {getTimeLabel()}
              </Text>
            </View>

            {event.location && (
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={16} color={colors.textTertiary} />
                <Text
                  style={[styles.locationText, { color: colors.textTertiary }]}
                  numberOfLines={1}
                >
                  {event.location}
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <View style={styles.picksInfo}>
              <Text style={[styles.picksLabel, { color: colors.textSecondary }]}>
                Your Picks
              </Text>
              <Text style={[styles.picksValue, { color: colors.accent }]}>
                {picksCount}/{totalBouts}
              </Text>
            </View>

            {isSubmitted && !isLocked ? (
              <View style={[styles.submittedBadge, { backgroundColor: colors.successSoft }]}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={[styles.submittedText, { color: colors.success }]}>Submitted</Text>
              </View>
            ) : totalBouts > 0 && picksCount === totalBouts && !isLocked ? (
              <View style={[styles.completeBadge, { backgroundColor: colors.successSoft }]}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={[styles.completeText, { color: colors.success }]}>Complete</Text>
              </View>
            ) : isLocked ? (
              <View style={[styles.lockedBadge, { backgroundColor: colors.surfaceAlt }]}>
                <Ionicons name="lock-closed" size={12} color={colors.textTertiary} />
                <Text style={[styles.lockedText, { color: colors.textTertiary }]}>Locked</Text>
              </View>
            ) : null}
          </View>
        </SurfaceCard>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginRight: spacing.sm,
  },
  eventName: {
    ...typography.h3,
    flex: 1,
  },
  liveBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  completedBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  completedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  details: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    ...typography.body,
  },
  locationText: {
    ...typography.meta,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  picksInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  picksLabel: {
    ...typography.meta,
  },
  picksValue: {
    ...typography.body,
    fontWeight: '700',
  },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  completeText: {
    ...typography.meta,
    fontWeight: '600',
  },
  submittedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  submittedText: {
    ...typography.meta,
    fontWeight: '700',
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  lockedText: {
    ...typography.meta,
  },
});
