/**
 * Pick screen - make predictions for upcoming event
 */

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Animated } from 'react-native';
import { useState, useRef, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/useAuth';
import { useNextEvent, useBoutsForEvent, useUpsertPick, isEventLocked } from '../../hooks/useQueries';
import { useEventCommunityPercentages } from '../../hooks/useLeaderboard';
import { useToast } from '../../hooks/useToast';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonFightCard } from '../../components/SkeletonFightCard';
import { BoutWithPick, PickInsert } from '../../types/database';
import type { CommunityPickPercentages } from '../../types/social';

// Community Percentage Bar Component
const CommunityPercentageBar: React.FC<{
  percentages: CommunityPickPercentages | undefined;
  redName: string;
  blueName: string;
}> = ({ percentages, redName, blueName }) => {
  if (!percentages || percentages.total_picks === 0) {
    return null;
  }

  const redPct = percentages.fighter_a_percentage || 0;
  const bluePct = percentages.fighter_b_percentage || 0;

  return (
    <View style={communityStyles.container}>
      <View style={communityStyles.header}>
        <Text style={communityStyles.label}>Community Picks</Text>
        <Text style={communityStyles.totalPicks}>{percentages.total_picks} picks</Text>
      </View>
      <View style={communityStyles.barContainer}>
        <View style={[communityStyles.barRed, { flex: redPct || 1 }]}>
          <Text style={communityStyles.percentage}>{redPct.toFixed(0)}%</Text>
        </View>
        <View style={[communityStyles.barBlue, { flex: bluePct || 1 }]}>
          <Text style={communityStyles.percentage}>{bluePct.toFixed(0)}%</Text>
        </View>
      </View>
    </View>
  );
};

const communityStyles = StyleSheet.create({
  container: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalPicks: {
    fontSize: 11,
    color: '#666',
  },
  barContainer: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barRed: {
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  barBlue: {
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  percentage: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
});

// Animated Fighter Button Component
const FighterButton: React.FC<{
  bout: BoutWithPick;
  corner: 'red' | 'blue';
  locked: boolean;
  onPress: () => void;
}> = ({ bout, corner, locked, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 150,
      friction: 3,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 150,
      friction: 3,
    }).start();
  };

  const isSelected = bout.pick?.picked_corner === corner;
  const fighterName = corner === 'red' ? bout.red_name : bout.blue_name;
  const cornerColor = corner === 'red' ? '#dc2626' : '#2563eb';

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.fighterButton,
          isSelected && styles.fighterButtonSelected,
          locked && styles.fighterButtonDisabled,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={locked || bout.status !== 'scheduled'}
        activeOpacity={0.9}
      >
        <View style={[styles.cornerIndicator, { backgroundColor: cornerColor }]} />
        <Text
          style={[
            styles.fighterName,
            isSelected && styles.fighterNameSelected,
          ]}
          numberOfLines={2}
        >
          {fighterName}
        </Text>
        {isSelected && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function Pick() {
  const { user } = useAuth();
  const toast = useToast();
  const { data: nextEvent, isLoading: eventLoading, isError: eventError, refetch: refetchEvent } = useNextEvent();
  const { data: bouts, isLoading: boutsLoading, isError: boutsError, refetch: refetchBouts } = useBoutsForEvent(
    nextEvent?.id || null,
    user?.id || null
  );
  const upsertPick = useUpsertPick();

  // Get bout IDs for community percentages
  const boutIds = useMemo(() => bouts?.map((b) => b.id) || [], [bouts]);
  const { data: communityPercentages, refetch: refetchPercentages } = useEventCommunityPercentages(boutIds);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchEvent(), refetchBouts(), refetchPercentages()]);
    setRefreshing(false);
  };

  const locked = isEventLocked(nextEvent || null);

  const handlePickFighter = async (bout: BoutWithPick, corner: 'red' | 'blue') => {
    if (!user || !nextEvent) return;

    if (locked) {
      toast.showError('Event has already started. Picks cannot be changed.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (bout.status === 'canceled' || bout.status === 'replaced') {
      toast.showError('This fight has been canceled or replaced.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      // Light haptic on pick selection
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const pick: PickInsert = {
        user_id: user.id,
        event_id: nextEvent.id,
        bout_id: bout.id,
        picked_corner: corner,
      };

      await upsertPick.mutateAsync(pick);

      // Success haptic on save
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      // Error haptic on failure
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      if (error.message.includes('locked')) {
        toast.showError('Picks are locked. Event has started.');
      } else {
        toast.showError('Failed to save pick. Please try again.');
      }
    }
  };

  if (eventLoading || boutsLoading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <SkeletonFightCard />
        <SkeletonFightCard />
        <SkeletonFightCard />
        <SkeletonFightCard />
        <SkeletonFightCard />
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
        message="Failed to load fights. Check your connection and try again."
        onRetry={() => refetchBouts()}
      />
    );
  }

  if (!nextEvent) {
    return (
      <EmptyState
        icon="calendar-outline"
        title="No Upcoming Events"
        message="There are no scheduled UFC events at the moment. Check back soon!"
        actionLabel="Refresh"
        onAction={onRefresh}
      />
    );
  }

  if (!bouts || bouts.length === 0) {
    return (
      <EmptyState
        icon="radio-outline"
        title="No Fights Available"
        message="The fight card hasn't been released yet. Check back closer to the event date."
        actionLabel="Refresh"
        onAction={onRefresh}
      />
    );
  }

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
      {/* Event Header */}
      <View style={styles.header}>
        <Text style={styles.eventName}>{nextEvent.name}</Text>
        {locked && (
          <View style={styles.lockedBanner}>
            <Text style={styles.lockedText}>🔒 Picks Locked</Text>
          </View>
        )}
      </View>

      {/* Fights List */}
      {bouts.map((bout, index) => (
        <View key={bout.id} style={styles.fightCard}>
          {/* Order Index / Weight Class */}
          <View style={styles.fightHeader}>
            <Text style={styles.fightOrder}>
              {index === 0 ? 'Main Event' : `Fight ${bouts.length - index}`}
            </Text>
            {bout.weight_class && (
              <Text style={styles.weightClass}>{bout.weight_class}</Text>
            )}
          </View>

          {/* Voided/Canceled Banner */}
          {(bout.status === 'canceled' || bout.status === 'replaced' || bout.pick?.status === 'voided') && (
            <View style={[styles.lockedBanner, { backgroundColor: '#4a3535' }]}>
              <Text style={styles.lockedText}>⚠️ Fight Canceled - Pick Voided</Text>
            </View>
          )}

          {/* Community Pick Percentages */}
          <CommunityPercentageBar
            percentages={communityPercentages?.get(bout.id)}
            redName={bout.red_name}
            blueName={bout.blue_name}
          />

          {/* Fighters */}
          <View style={styles.fighters}>
            {/* Red Corner */}
            <FighterButton
              bout={bout}
              corner="red"
              locked={locked}
              onPress={() => handlePickFighter(bout, 'red')}
            />

            {/* VS */}
            <Text style={styles.vs}>VS</Text>

            {/* Blue Corner */}
            <FighterButton
              bout={bout}
              corner="blue"
              locked={locked}
              onPress={() => handlePickFighter(bout, 'blue')}
            />
          </View>

          {/* Result (if available) */}
          {bout.result?.winner_corner && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultText}>
                {bout.result.winner_corner === 'draw' || bout.result.winner_corner === 'nc'
                  ? bout.result.winner_corner.toUpperCase()
                  : `${bout.result.winner_corner === 'red' ? bout.red_name : bout.blue_name} wins`}
              </Text>
              {bout.result.method && (
                <Text style={styles.resultMethod}>
                  via {bout.result.method}
                  {bout.result.round && ` - R${bout.result.round}`}
                </Text>
              )}

              {/* Pick Grade */}
              {bout.pick?.status === 'graded' && (
                <View
                  style={[
                    styles.gradeBadge,
                    { backgroundColor: bout.pick.score === 1 ? '#16a34a' : '#dc2626' },
                  ]}
                >
                  <Text style={styles.gradeText}>
                    {bout.pick.score === 1 ? 'Correct' : 'Missed'}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      ))}
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
  header: {
    marginBottom: 16,
  },
  eventName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
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
  fightCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  fightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fightOrder: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d4202a',
  },
  weightClass: {
    fontSize: 12,
    color: '#999',
  },
  fighters: {
    gap: 8,
  },
  fighterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626',
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  fighterButtonSelected: {
    borderColor: '#d4202a',
    backgroundColor: '#2a1a1a',
  },
  fighterButtonDisabled: {
    opacity: 0.5,
  },
  cornerIndicator: {
    width: 4,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  fighterName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 12,
  },
  fighterNameSelected: {
    color: '#fff',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#d4202a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  vs: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  resultContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  resultText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
  },
  resultMethod: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  gradeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  gradeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noDataText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});
