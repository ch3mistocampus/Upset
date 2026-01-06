/**
 * Admin Fight Ops Screen
 *
 * Admin interface for controlling fight scorecards during live events:
 * - Start/end rounds
 * - Open/close scoring windows
 * - End fights
 * - View submission counts
 */

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { useToast } from '../../hooks/useToast';
import { supabase } from '../../lib/supabase';
import {
  useAdminLiveFights,
  useAdminUpdateRoundState,
  useFightScorecard,
  scorecardKeys,
} from '../../hooks/useScorecard';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { SurfaceCard, EmptyState } from '../../components/ui';
import type { LiveFight, AdminAction, RoundPhase } from '../../types/scorecard';
import { formatPhase, getPhaseColor } from '../../types/scorecard';

// =============================================================================
// BOUT SELECTOR
// =============================================================================

interface BoutSelectorProps {
  selectedBoutId: string | null;
  onSelect: (boutId: string, redName: string, blueName: string) => void;
}

function BoutSelector({ selectedBoutId, onSelect }: BoutSelectorProps) {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch upcoming/in-progress events with bouts
  const { data: events, isLoading } = useQuery({
    queryKey: ['admin', 'events-with-bouts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          name,
          event_date,
          status,
          bouts (
            id,
            red_name,
            blue_name,
            order_index,
            status
          )
        `)
        .in('status', ['upcoming', 'in_progress'])
        .order('event_date', { ascending: true })
        .limit(5);

      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  const filteredBouts = events?.flatMap((event) =>
    (event.bouts || [])
      .filter((bout: any) =>
        bout.status !== 'canceled' &&
        (searchQuery === '' ||
          bout.red_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bout.blue_name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      .map((bout: any) => ({
        ...bout,
        event_name: event.name,
        event_id: event.id,
      }))
  ) || [];

  return (
    <View style={styles.selectorContainer}>
      <TouchableOpacity
        style={[styles.selectorHeader, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>
          {selectedBoutId ? 'Selected Fight' : 'Select a Fight'}
        </Text>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={[styles.selectorDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            style={[styles.searchInput, { backgroundColor: colors.surfaceAlt, color: colors.text }]}
            placeholder="Search fighters..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {isLoading ? (
            <ActivityIndicator color={colors.accent} style={styles.selectorLoading} />
          ) : filteredBouts.length === 0 ? (
            <Text style={[styles.selectorEmpty, { color: colors.textTertiary }]}>
              No fights found
            </Text>
          ) : (
            <ScrollView style={styles.selectorList} nestedScrollEnabled>
              {filteredBouts.map((bout: any) => (
                <TouchableOpacity
                  key={bout.id}
                  style={[
                    styles.selectorItem,
                    { borderBottomColor: colors.border },
                    selectedBoutId === bout.id && { backgroundColor: colors.accent + '20' },
                  ]}
                  onPress={() => {
                    onSelect(bout.id, bout.red_name, bout.blue_name);
                    setIsExpanded(false);
                  }}
                >
                  <Text style={[styles.selectorItemEvent, { color: colors.textSecondary }]}>
                    {bout.event_name}
                  </Text>
                  <Text style={[styles.selectorItemFight, { color: colors.text }]}>
                    {bout.red_name} vs {bout.blue_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

// =============================================================================
// LIVE FIGHT CARD
// =============================================================================

interface LiveFightCardProps {
  fight: LiveFight;
  onSelect: () => void;
}

function LiveFightCard({ fight, onSelect }: LiveFightCardProps) {
  const { colors } = useTheme();

  const totalSubmissions =
    fight.submission_counts?.reduce((sum, r) => sum + r.count, 0) || 0;

  return (
    <TouchableOpacity
      style={[styles.liveFightCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.liveFightHeader}>
        <View
          style={[
            styles.liveFightPhase,
            { backgroundColor: getPhaseColor(fight.phase, colors) + '20' },
          ]}
        >
          <View
            style={[styles.liveFightPhaseDot, { backgroundColor: getPhaseColor(fight.phase, colors) }]}
          />
          <Text style={[styles.liveFightPhaseText, { color: getPhaseColor(fight.phase, colors) }]}>
            {formatPhase(fight.phase)}
          </Text>
        </View>
        <Text style={[styles.liveFightRound, { color: colors.text }]}>
          R{fight.current_round}/{fight.scheduled_rounds}
        </Text>
      </View>

      <Text style={[styles.liveFightNames, { color: colors.text }]}>
        {fight.red_name} vs {fight.blue_name}
      </Text>

      <Text style={[styles.liveFightEvent, { color: colors.textSecondary }]}>
        {fight.event_name}
      </Text>

      <View style={styles.liveFightStats}>
        <Text style={[styles.liveFightStatLabel, { color: colors.textTertiary }]}>
          Total Scores: {totalSubmissions}
        </Text>
        {fight.submission_counts && fight.submission_counts.length > 0 && (
          <Text style={[styles.liveFightStatDetail, { color: colors.textTertiary }]}>
            {fight.submission_counts.map((r) => `R${r.round}: ${r.count}`).join(' • ')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// =============================================================================
// FIGHT CONTROL PANEL
// =============================================================================

interface FightControlPanelProps {
  boutId: string;
  redName: string;
  blueName: string;
}

function FightControlPanel({ boutId, redName, blueName }: FightControlPanelProps) {
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: scorecard, isLoading, refetch } = useFightScorecard(boutId, {
    refetchInterval: 5000,
  });

  const updateState = useAdminUpdateRoundState();

  const handleAction = async (action: AdminAction, roundNumber?: number) => {
    const confirmMessages: Record<AdminAction, string> = {
      START_ROUND: `Start Round ${(scorecard?.round_state.current_round || 0) + 1}?`,
      END_ROUND: `End Round ${scorecard?.round_state.current_round} and open scoring?`,
      START_BREAK: `Open scoring for Round ${scorecard?.round_state.current_round}?`,
      CLOSE_SCORING: `Close scoring for Round ${scorecard?.round_state.current_round}?`,
      END_FIGHT: 'End this fight? This cannot be undone.',
    };

    Alert.alert(
      'Confirm Action',
      confirmMessages[action],
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: action === 'END_FIGHT' ? 'destructive' : 'default',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            try {
              const result = await updateState.mutateAsync({
                boutId,
                action,
                roundNumber,
              });

              if (result.success) {
                toast.showNeutral(result.message || 'State updated');
                refetch();
              } else {
                toast.showError(result.error || 'Failed to update state');
              }
            } catch (err: any) {
              toast.showError(err.message || 'Failed to update state');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          },
        },
      ]
    );
  };

  if (isLoading || !scorecard) {
    return (
      <SurfaceCard>
        <ActivityIndicator color={colors.accent} />
      </SurfaceCard>
    );
  }

  const { round_state, aggregates } = scorecard;
  const phase = round_state.phase;

  // Determine available actions based on current phase
  const availableActions: { action: AdminAction; label: string; icon: string; color: string }[] = [];

  switch (phase) {
    case 'PRE_FIGHT':
      availableActions.push({
        action: 'START_ROUND',
        label: 'Start Round 1',
        icon: 'play',
        color: colors.success,
      });
      break;

    case 'ROUND_LIVE':
      availableActions.push({
        action: 'END_ROUND',
        label: `End Round ${round_state.current_round}`,
        icon: 'stop',
        color: colors.warning,
      });
      break;

    case 'ROUND_BREAK':
      availableActions.push({
        action: 'CLOSE_SCORING',
        label: 'Close Scoring',
        icon: 'lock-closed',
        color: colors.warning,
      });
      if (round_state.current_round < round_state.scheduled_rounds) {
        availableActions.push({
          action: 'START_ROUND',
          label: `Start Round ${round_state.current_round + 1}`,
          icon: 'play',
          color: colors.success,
        });
      }
      break;

    case 'ROUND_CLOSED':
      if (round_state.current_round < round_state.scheduled_rounds) {
        availableActions.push({
          action: 'START_ROUND',
          label: `Start Round ${round_state.current_round + 1}`,
          icon: 'play',
          color: colors.success,
        });
      }
      break;
  }

  // Always allow ending the fight (except when already ended)
  if (phase !== 'FIGHT_ENDED') {
    availableActions.push({
      action: 'END_FIGHT',
      label: 'End Fight',
      icon: 'flag',
      color: colors.danger,
    });
  }

  return (
    <SurfaceCard>
      {/* Fight Info */}
      <View style={styles.controlHeader}>
        <Text style={[styles.controlTitle, { color: colors.text }]}>
          {redName} vs {blueName}
        </Text>
        <View
          style={[
            styles.controlPhase,
            { backgroundColor: getPhaseColor(phase, colors) + '20' },
          ]}
        >
          <Text style={[styles.controlPhaseText, { color: getPhaseColor(phase, colors) }]}>
            {formatPhase(phase)}
          </Text>
        </View>
      </View>

      {/* Current State */}
      <View style={[styles.controlState, { borderColor: colors.border }]}>
        <View style={styles.controlStateRow}>
          <Text style={[styles.controlStateLabel, { color: colors.textSecondary }]}>
            Current Round:
          </Text>
          <Text style={[styles.controlStateValue, { color: colors.text }]}>
            {round_state.current_round} / {round_state.scheduled_rounds}
          </Text>
        </View>

        {round_state.round_started_at && (
          <View style={styles.controlStateRow}>
            <Text style={[styles.controlStateLabel, { color: colors.textSecondary }]}>
              Round Started:
            </Text>
            <Text style={[styles.controlStateValue, { color: colors.text }]}>
              {new Date(round_state.round_started_at).toLocaleTimeString()}
            </Text>
          </View>
        )}

        {round_state.round_ends_at && (
          <View style={styles.controlStateRow}>
            <Text style={[styles.controlStateLabel, { color: colors.textSecondary }]}>
              Round Ended:
            </Text>
            <Text style={[styles.controlStateValue, { color: colors.text }]}>
              {new Date(round_state.round_ends_at).toLocaleTimeString()}
            </Text>
          </View>
        )}

        <View style={styles.controlStateRow}>
          <Text style={[styles.controlStateLabel, { color: colors.textSecondary }]}>
            Scoring Open:
          </Text>
          <Text
            style={[
              styles.controlStateValue,
              { color: round_state.is_scoring_open ? colors.success : colors.textTertiary },
            ]}
          >
            {round_state.is_scoring_open ? 'Yes' : 'No'}
          </Text>
        </View>
      </View>

      {/* Submission Counts */}
      {aggregates.length > 0 && (
        <View style={[styles.controlSubmissions, { borderColor: colors.border }]}>
          <Text style={[styles.controlSubmissionsTitle, { color: colors.textSecondary }]}>
            Submissions
          </Text>
          <View style={styles.controlSubmissionsGrid}>
            {aggregates.map((agg) => (
              <View key={agg.round_number} style={styles.controlSubmissionItem}>
                <Text style={[styles.controlSubmissionRound, { color: colors.text }]}>
                  R{agg.round_number}
                </Text>
                <Text style={[styles.controlSubmissionCount, { color: colors.accent }]}>
                  {agg.submission_count}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.controlActions}>
        {availableActions.map(({ action, label, icon, color }) => (
          <TouchableOpacity
            key={action}
            style={[
              styles.controlButton,
              {
                backgroundColor: action === 'END_FIGHT' ? 'transparent' : color,
                borderColor: color,
                borderWidth: action === 'END_FIGHT' ? 2 : 0,
              },
            ]}
            onPress={() => handleAction(action)}
            disabled={updateState.isPending}
            activeOpacity={0.8}
          >
            {updateState.isPending ? (
              <ActivityIndicator color={action === 'END_FIGHT' ? color : '#fff'} size="small" />
            ) : (
              <>
                <Ionicons
                  name={icon as any}
                  size={18}
                  color={action === 'END_FIGHT' ? color : '#fff'}
                />
                <Text
                  style={[
                    styles.controlButtonText,
                    { color: action === 'END_FIGHT' ? color : '#fff' },
                  ]}
                >
                  {label}
                </Text>
              </>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </SurfaceCard>
  );
}

// =============================================================================
// MAIN SCREEN
// =============================================================================

export default function AdminFightOpsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [selectedBout, setSelectedBout] = useState<{
    id: string;
    redName: string;
    blueName: string;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data: liveFights, isLoading, refetch } = useAdminLiveFights();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Fight Operations',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/* Fight Selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            SELECT FIGHT
          </Text>
          <BoutSelector
            selectedBoutId={selectedBout?.id || null}
            onSelect={(id, redName, blueName) => setSelectedBout({ id, redName, blueName })}
          />
        </View>

        {/* Control Panel */}
        {selectedBout && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              FIGHT CONTROLS
            </Text>
            <FightControlPanel
              boutId={selectedBout.id}
              redName={selectedBout.redName}
              blueName={selectedBout.blueName}
            />
          </View>
        )}

        {/* Live Fights */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            ACTIVE SCORECARDS
          </Text>

          {isLoading ? (
            <ActivityIndicator color={colors.accent} style={styles.loading} />
          ) : !liveFights || liveFights.length === 0 ? (
            <SurfaceCard weakWash>
              <EmptyState
                icon="timer-outline"
                title="No Active Fights"
                message="Select a fight above to start tracking"
              />
            </SurfaceCard>
          ) : (
            <View style={styles.liveFightsList}>
              {liveFights.map((fight) => (
                <LiveFightCard
                  key={fight.bout_id}
                  fight={fight}
                  onSelect={() =>
                    setSelectedBout({
                      id: fight.bout_id,
                      redName: fight.red_name,
                      blueName: fight.blue_name,
                    })
                  }
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    padding: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  loading: {
    marginVertical: spacing.xl,
  },

  // Sections
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginLeft: spacing.xs,
  },

  // Selector
  selectorContainer: {
    zIndex: 10,
  },
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
  },
  selectorLabel: {
    fontSize: 14,
  },
  selectorDropdown: {
    marginTop: spacing.xs,
    borderRadius: radius.card,
    borderWidth: 1,
    maxHeight: 300,
    overflow: 'hidden',
  },
  searchInput: {
    padding: spacing.md,
    fontSize: 14,
    borderBottomWidth: 1,
  },
  selectorLoading: {
    padding: spacing.lg,
  },
  selectorEmpty: {
    padding: spacing.lg,
    textAlign: 'center',
    fontSize: 13,
  },
  selectorList: {
    maxHeight: 240,
  },
  selectorItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  selectorItemEvent: {
    fontSize: 11,
    marginBottom: 2,
  },
  selectorItemFight: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Live Fight Card
  liveFightsList: {
    gap: spacing.sm,
  },
  liveFightCard: {
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
  },
  liveFightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  liveFightPhase: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    gap: 4,
  },
  liveFightPhaseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveFightPhaseText: {
    fontSize: 11,
    fontWeight: '600',
  },
  liveFightRound: {
    fontSize: 14,
    fontWeight: '700',
  },
  liveFightNames: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  liveFightEvent: {
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  liveFightStats: {
    gap: 2,
  },
  liveFightStatLabel: {
    fontSize: 12,
  },
  liveFightStatDetail: {
    fontSize: 11,
  },

  // Control Panel
  controlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  controlTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  controlPhase: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  controlPhaseText: {
    fontSize: 12,
    fontWeight: '600',
  },
  controlState: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    gap: spacing.xs,
  },
  controlStateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  controlStateLabel: {
    fontSize: 13,
  },
  controlStateValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  controlSubmissions: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  controlSubmissionsTitle: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  controlSubmissionsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  controlSubmissionItem: {
    alignItems: 'center',
  },
  controlSubmissionRound: {
    fontSize: 11,
  },
  controlSubmissionCount: {
    fontSize: 18,
    fontWeight: '700',
  },
  controlActions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: radius.button,
    gap: spacing.sm,
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
