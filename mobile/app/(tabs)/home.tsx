/**
 * Home screen - next event, picks progress, countdown
 */

import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useNextEvent, useBoutsForEvent, useRecentPicksSummary } from '../../hooks/useQueries';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonEventCard } from '../../components/SkeletonStats';
import { useEffect, useState, useRef } from 'react';

export default function Home() {
  const router = useRouter();
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

      // Check if event is within 24 hours
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
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [nextEvent]);

  // Pulse animation when event is near (< 24 hours)
  useEffect(() => {
    if (isNearEvent) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
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
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <SkeletonEventCard />
        <SkeletonEventCard />
      </ScrollView>
    );
  }

  if (eventError) {
    return (
      <ErrorState
        message="Failed to load upcoming events. Check your connection and try again."
        onRetry={() => refetchEvent()}
      />
    );
  }

  if (boutsError) {
    return (
      <ErrorState
        message="Failed to load event details. Check your connection and try again."
        onRetry={() => refetchBouts()}
      />
    );
  }

  if (!nextEvent) {
    return (
      <EmptyState
        icon="calendar-outline"
        title="No Upcoming Events"
        message="Check back soon for the next UFC event and start making your picks!"
        actionLabel="Refresh"
        onAction={onRefresh}
      />
    );
  }

  const isLocked = new Date(nextEvent.event_date) <= new Date();

  return (
    <ScrollView
      style={styles.container}
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
      {/* Next Event Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>NEXT EVENT</Text>
        <Text style={styles.eventName}>{nextEvent.name}</Text>
        {nextEvent.location && (
          <Text style={styles.eventLocation}>{nextEvent.location}</Text>
        )}

        <View style={styles.divider} />

        <View style={styles.countdownContainer}>
          <Text style={styles.countdownLabel}>
            {isLocked ? 'Event Started' : 'Picks Lock In'}
          </Text>
          <Animated.Text
            style={[
              styles.countdownTime,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            {timeUntil}
          </Animated.Text>
        </View>

        <View style={styles.divider} />

        {/* Picks Progress */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressLabel}>Your Picks</Text>
          <Text style={styles.progressValue}>
            {picksCount} / {totalBouts}
          </Text>
        </View>

        {totalBouts > 0 && (
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(picksCount / totalBouts) * 100}%` },
              ]}
            />
          </View>
        )}

        {!isLocked && (
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/(tabs)/pick')}
          >
            <Text style={styles.buttonText}>
              {picksCount === 0 ? 'Start Picking' : 'Continue Picking'}
            </Text>
          </TouchableOpacity>
        )}

        {isLocked && picksCount > 0 && (
          <View style={styles.lockedBanner}>
            <Text style={styles.lockedText}>🔒 Picks Locked</Text>
          </View>
        )}
      </View>

      {/* Last Event Summary */}
      {lastEventSummary && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>LAST EVENT</Text>
          <Text style={styles.lastEventName}>{lastEventSummary.event.name}</Text>

          <View style={styles.lastEventStats}>
            <Text style={styles.lastEventLabel}>Your Results</Text>
            <Text style={styles.lastEventValue}>
              {lastEventSummary.correct} / {lastEventSummary.total} Correct
            </Text>
          </View>

          {lastEventSummary.total > 0 && (
            <Text style={styles.lastEventAccuracy}>
              {Math.round((lastEventSummary.correct / lastEventSummary.total) * 100)}% Accuracy
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#999',
    letterSpacing: 1,
    marginBottom: 12,
  },
  eventName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#999',
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 16,
  },
  countdownContainer: {
    alignItems: 'center',
  },
  countdownLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  countdownTime: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#d4202a',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#999',
  },
  progressValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#d4202a',
  },
  button: {
    backgroundColor: '#d4202a',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  lockedBanner: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  lockedText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
  noDataText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  lastEventName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  lastEventStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lastEventLabel: {
    fontSize: 14,
    color: '#999',
  },
  lastEventValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  lastEventAccuracy: {
    fontSize: 14,
    color: '#4ade80',
    textAlign: 'right',
  },
});
