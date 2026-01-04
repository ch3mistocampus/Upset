/**
 * FirstLaunchHero - Welcome card for new users
 * Shows on Home when user has 0 total picks
 */

import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { spacing, radius, typography } from '../lib/tokens';
import { Card, Button } from './ui';
import { useOnboarding } from '../hooks/useOnboarding';

interface FirstLaunchHeroProps {
  eventId?: string;
}

export function FirstLaunchHero({ eventId }: FirstLaunchHeroProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { markSeen } = useOnboarding();

  const handleGetStarted = () => {
    markSeen('hasDismissedFirstLaunch');
    if (eventId) {
      router.push(`/event/${eventId}`);
    } else {
      router.push('/(tabs)/pick');
    }
  };

  const handleDismiss = () => {
    markSeen('hasDismissedFirstLaunch');
  };

  return (
    <Card style={{ ...styles.card, borderColor: colors.accent, borderWidth: 1 }}>
      <View style={[styles.iconContainer, { backgroundColor: colors.accent + '20' }]}>
        <Ionicons name="trophy" size={32} color={colors.accent} />
      </View>

      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Make picks for UFC events
      </Text>

      <Text style={[styles.body, { color: colors.textSecondary }]}>
        Pick winners before fights start, then track your accuracy and streaks.
      </Text>

      <View style={styles.actions}>
        <Button
          title="Make your first picks"
          onPress={handleGetStarted}
          variant="primary"
        />
        <Button
          title="Maybe later"
          onPress={handleDismiss}
          variant="ghost"
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
  },
});
