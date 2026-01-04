/**
 * Pick screen - make predictions for upcoming event
 */

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Animated } from 'react-native';
import { useState, useRef, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/useAuth';
import { useNextEvent, useBoutsForEvent, useUpsertPick, useDeleteAllPicks, isEventLocked } from '../../hooks/useQueries';
import { useEventCommunityPercentages } from '../../hooks/useLeaderboard';
import { useToast } from '../../hooks/useToast';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { Card, EmptyState } from '../../components/ui';
import { ErrorState } from '../../components/ErrorState';
import { SkeletonFightCard } from '../../components/SkeletonFightCard';
import { BoutWithPick, PickInsert } from '../../types/database';
import type { CommunityPickPercentages } from '../../types/social';

// Community Percentage Bar Component
const CommunityPercentageBar: React.FC<{
  percentages: CommunityPickPercentages | undefined;
  redName: string;
  blueName: string;
}> = ({ percentages, redName, blueName }) => {
  const { colors } = useTheme();

  if (!percentages || percentages.total_picks === 0) {
    return null;
  }

  const redPct = percentages.fighter_a_percentage || 0;
  const bluePct = percentages.fighter_b_percentage || 0;

  return (
    <View style={[communityStyles.container, { borderBottomColor: colors.divider }]}>
      <View style={communityStyles.header}>
        <Text style={[communityStyles.label, { color: colors.textSecondary }]}>
          Community Picks
        </Text>
        <Text style={[communityStyles.totalPicks, { color: colors.textTertiary }]}>
          {percentages.total_picks} picks
        </Text>
      </View>
      <View style={[communityStyles.barContainer, { backgroundColor: colors.surfaceAlt }]}>
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
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.caption,
  },
  totalPicks: {
    ...typography.meta,
  },
  barContainer: {
    flexDirection: 'row',
    height: 28,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  barRed: {
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  barBlue: {
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  percentage: {
    ...typography.meta,
    fontWeight: '700',
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
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;

  const isSelected = bout.pick?.picked_corner === corner;
  const fighterName = corner === 'red' ? bout.red_name : bout.blue_name;
  const cornerColor = corner === 'red' ? '#dc2626' : '#2563eb';

  // Animate border and pulse when selection changes
  const prevSelectedRef = useRef(isSelected);
  if (prevSelectedRef.current !== isSelected) {
    prevSelectedRef.current = isSelected;
    if (isSelected) {
      // Selection animation: pulse + border grow
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
        Animated.spring(borderAnim, {
          toValue: 1,
          tension: 200,
          friction: 10,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      // Deselection
      Animated.spring(borderAnim, {
        toValue: 0,
        tension: 200,
        friction: 10,
        useNativeDriver: false,
      }).start();
    }
  }

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 150,
      friction: 5,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 150,
      friction: 5,
    }).start();
  };

  // Interpolate animated values
  const animatedBorderWidth = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.5, 3],
  });

  const animatedScale = Animated.add(
    scaleAnim,
    pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.03],
    })
  );

  return (
    <Animated.View style={{ transform: [{ scale: animatedScale }] }}>
      <Animated.View
        style={[
          fighterStyles.button,
          {
            backgroundColor: isSelected ? cornerColor + '20' : colors.surfaceAlt,
            borderColor: isSelected ? cornerColor : colors.border,
            borderWidth: animatedBorderWidth,
          },
          locked && fighterStyles.disabled,
        ]}
      >
        <TouchableOpacity
          style={fighterStyles.touchable}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={locked || bout.status !== 'scheduled'}
          activeOpacity={0.9}
        >
          <View style={[fighterStyles.cornerIndicator, { backgroundColor: cornerColor }]} />
          <Text
            style={[
              fighterStyles.name,
              { color: isSelected ? cornerColor : colors.textPrimary },
              isSelected && fighterStyles.nameSelected,
            ]}
            numberOfLines={2}
          >
            {fighterName}
          </Text>
          {isSelected && (
            <View style={[fighterStyles.checkmark, { backgroundColor: cornerColor }]}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const fighterStyles = StyleSheet.create({
  button: {
    borderRadius: radius.input,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  touchable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  disabled: {
    opacity: 0.5,
  },
  cornerIndicator: {
    width: 4,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderTopLeftRadius: radius.input - 2,
    borderBottomLeftRadius: radius.input - 2,
  },
  name: {
    flex: 1,
    ...typography.body,
    fontWeight: '600',
    marginLeft: spacing.md,
  },
  nameSelected: {
    fontWeight: '700',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function Pick() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const { data: nextEvent, isLoading: eventLoading, isError: eventError, refetch: refetchEvent } = useNextEvent();
  const { data: bouts, isLoading: boutsLoading, isError: boutsError, refetch: refetchBouts } = useBoutsForEvent(
    nextEvent?.id || null,
    user?.id || null
  );
  const upsertPick = useUpsertPick();
  const deleteAllPicks = useDeleteAllPicks();

  const boutIds = useMemo(() => bouts?.map((b) => b.id) || [], [bouts]);

  // Count active picks that can be unselected
  const activePickCount = useMemo(() => {
    return bouts?.filter((b) => b.pick && b.pick.status === 'active').length || 0;
  }, [bouts]);
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const pick: PickInsert = {
        user_id: user.id,
        event_id: nextEvent.id,
        bout_id: bout.id,
        picked_corner: corner,
      };

      await upsertPick.mutateAsync(pick);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      if (error.message.includes('locked')) {
        toast.showError('Picks are locked. Event has started.');
      } else {
        toast.showError('Failed to save pick. Please try again.');
      }
    }
  };

  const handleUnselectAll = async () => {
    if (!user || !nextEvent) return;

    if (locked) {
      toast.showError('Event has already started. Picks cannot be changed.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (activePickCount === 0) {
      toast.showError('No picks to unselect.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await deleteAllPicks.mutateAsync({
        userId: user.id,
        eventId: nextEvent.id,
      });

      toast.showSuccess(`Cleared ${activePickCount} pick${activePickCount > 1 ? 's' : ''}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.showError('Failed to clear picks. Please try again.');
    }
  };

  if (eventLoading || boutsLoading) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <SkeletonFightCard />
        <SkeletonFightCard />
        <SkeletonFightCard />
        <SkeletonFightCard />
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
          message="Failed to load fights. Check your connection and try again."
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
          message="There are no scheduled UFC events at the moment. Check back soon!"
          actionLabel="Refresh"
          onAction={onRefresh}
        />
      </View>
    );
  }

  if (!bouts || bouts.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
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
      {/* Event Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={[styles.eventName, { color: colors.textPrimary }]}>
            {nextEvent.name}
          </Text>
          {/* Unselect All Button - only show when there are active picks and not locked */}
          {!locked && activePickCount > 0 && (
            <TouchableOpacity
              style={[styles.unselectAllButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
              onPress={handleUnselectAll}
              disabled={deleteAllPicks.isPending}
            >
              <Ionicons name="close-circle-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.unselectAllText, { color: colors.textSecondary }]}>
                Clear All
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {locked && (
          <View style={[styles.lockedBanner, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.lockedText, { color: colors.textSecondary }]}>
              🔒 Picks Locked
            </Text>
          </View>
        )}
        {/* Pick count indicator */}
        {!locked && bouts && bouts.length > 0 && (
          <Text style={[styles.pickCount, { color: colors.textTertiary }]}>
            {activePickCount} of {bouts.length} fights picked
          </Text>
        )}
      </View>

      {/* Fights List */}
      {bouts.map((bout, index) => (
        <Card key={bout.id} style={styles.fightCard}>
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
                ⚠️ Fight Canceled - Pick Voided
              </Text>
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
            <FighterButton
              bout={bout}
              corner="red"
              locked={locked}
              onPress={() => handlePickFighter(bout, 'red')}
            />

            <Text style={[styles.vs, { color: colors.textTertiary }]}>VS</Text>

            <FighterButton
              bout={bout}
              corner="blue"
              locked={locked}
              onPress={() => handlePickFighter(bout, 'blue')}
            />
          </View>

          {/* Result (if available) */}
          {bout.result?.winner_corner && (
            <View style={[styles.resultContainer, { borderTopColor: colors.divider }]}>
              <Text style={[styles.resultText, { color: colors.textPrimary }]}>
                {bout.result.winner_corner === 'draw' || bout.result.winner_corner === 'nc'
                  ? bout.result.winner_corner.toUpperCase()
                  : `${bout.result.winner_corner === 'red' ? bout.red_name : bout.blue_name} wins`}
              </Text>
              {bout.result.method && (
                <Text style={[styles.resultMethod, { color: colors.textSecondary }]}>
                  via {bout.result.method}
                  {bout.result.round && ` - R${bout.result.round}`}
                </Text>
              )}

              {/* Pick Grade */}
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
          )}
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    marginBottom: spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  eventName: {
    ...typography.h2,
    flex: 1,
    marginBottom: spacing.sm,
  },
  unselectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  unselectAllText: {
    ...typography.meta,
    fontWeight: '600',
  },
  pickCount: {
    ...typography.meta,
    marginBottom: spacing.sm,
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
  fightCard: {
    marginBottom: 0,
  },
  fightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  fightOrder: {
    ...typography.caption,
  },
  weightClass: {
    ...typography.meta,
  },
  canceledBanner: {
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  canceledText: {
    ...typography.meta,
    fontWeight: '600',
  },
  fighters: {
    gap: spacing.sm,
  },
  vs: {
    ...typography.caption,
    textAlign: 'center',
  },
  resultContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  resultText: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  resultMethod: {
    ...typography.meta,
    marginBottom: spacing.sm,
  },
  gradeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  gradeText: {
    ...typography.meta,
    fontWeight: '700',
    color: '#fff',
  },
});
