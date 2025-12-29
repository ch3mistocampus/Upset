/**
 * Pick screen - make predictions for upcoming event
 */

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useNextEvent, useBoutsForEvent, useUpsertPick, isEventLocked } from '../../hooks/useQueries';
import { BoutWithPick, PickInsert } from '../../types/database';

export default function Pick() {
  const { user } = useAuth();
  const { data: nextEvent, isLoading: eventLoading } = useNextEvent();
  const { data: bouts, isLoading: boutsLoading } = useBoutsForEvent(
    nextEvent?.id || null,
    user?.id || null
  );
  const upsertPick = useUpsertPick();

  const locked = isEventLocked(nextEvent || null);

  const handlePickFighter = async (bout: BoutWithPick, corner: 'red' | 'blue') => {
    if (!user || !nextEvent) return;

    if (locked) {
      Alert.alert('Picks Locked', 'Event has already started. Picks cannot be changed.');
      return;
    }

    if (bout.status === 'canceled' || bout.status === 'replaced') {
      Alert.alert('Fight Canceled', 'This fight has been canceled or replaced.');
      return;
    }

    try {
      const pick: PickInsert = {
        user_id: user.id,
        event_id: nextEvent.id,
        bout_id: bout.id,
        picked_corner: corner,
      };

      await upsertPick.mutateAsync(pick);
    } catch (error: any) {
      if (error.message.includes('locked')) {
        Alert.alert('Error', 'Picks are locked. Event has started.');
      } else {
        Alert.alert('Error', 'Failed to save pick. Please try again.');
      }
    }
  };

  if (eventLoading || boutsLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#d4202a" />
      </View>
    );
  }

  if (!nextEvent) {
    return (
      <View style={styles.container}>
        <Text style={styles.noDataText}>No upcoming events</Text>
      </View>
    );
  }

  if (!bouts || bouts.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.noDataText}>No fights available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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

          {/* Fighters */}
          <View style={styles.fighters}>
            {/* Red Corner */}
            <TouchableOpacity
              style={[
                styles.fighterButton,
                bout.pick?.picked_corner === 'red' && styles.fighterButtonSelected,
                locked && styles.fighterButtonDisabled,
              ]}
              onPress={() => handlePickFighter(bout, 'red')}
              disabled={locked || bout.status !== 'scheduled'}
            >
              <View style={[styles.cornerIndicator, { backgroundColor: '#dc2626' }]} />
              <Text
                style={[
                  styles.fighterName,
                  bout.pick?.picked_corner === 'red' && styles.fighterNameSelected,
                ]}
                numberOfLines={2}
              >
                {bout.red_name}
              </Text>
              {bout.pick?.picked_corner === 'red' && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* VS */}
            <Text style={styles.vs}>VS</Text>

            {/* Blue Corner */}
            <TouchableOpacity
              style={[
                styles.fighterButton,
                bout.pick?.picked_corner === 'blue' && styles.fighterButtonSelected,
                locked && styles.fighterButtonDisabled,
              ]}
              onPress={() => handlePickFighter(bout, 'blue')}
              disabled={locked || bout.status !== 'scheduled'}
            >
              <View style={[styles.cornerIndicator, { backgroundColor: '#2563eb' }]} />
              <Text
                style={[
                  styles.fighterName,
                  bout.pick?.picked_corner === 'blue' && styles.fighterNameSelected,
                ]}
                numberOfLines={2}
              >
                {bout.blue_name}
              </Text>
              {bout.pick?.picked_corner === 'blue' && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
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
