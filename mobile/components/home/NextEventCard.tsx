/**
 * NextEventCard - Next event module with pick progress chip and CTA
 * Premium minimalist design with hairline borders
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import { spacing, radius } from '../../lib/tokens';

export interface NextEvent {
  id: string;
  title: string;
  venue: string;
  picksMade: number;
  picksTotal: number;
}

interface NextEventCardProps {
  event: NextEvent;
  onCallTheFight?: () => void;
}

export function NextEventCard({ event, onCallTheFight }: NextEventCardProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onCallTheFight?.();
  };

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: colors.textTertiary }]}>NEXT EVENT</Text>
        <View style={[styles.picksChip, { borderColor: colors.border }]}>
          <Text style={[styles.picksChipText, { color: colors.textSecondary }]}>
            Your Picks: {event.picksMade} / {event.picksTotal}
          </Text>
        </View>
      </View>

      {/* Event Info */}
      <Text style={[styles.eventTitle, { color: colors.text }]}>
        {event.title}
      </Text>
      <Text style={[styles.eventVenue, { color: colors.textSecondary }]}>
        {event.venue}
      </Text>

      {/* CTA Button */}
      <TouchableOpacity
        style={[styles.ctaButton, { backgroundColor: colors.accent }]}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <Text style={styles.ctaText}>CALL THE FIGHT</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  picksChip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  picksChipText: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  eventTitle: {
    fontFamily: 'BebasNeue',
    fontSize: 26,
    lineHeight: 28,
    letterSpacing: -0.5,
    marginTop: spacing.xs,
  },
  eventVenue: {
    fontSize: 14,
    fontWeight: '500',
  },
  ctaButton: {
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
