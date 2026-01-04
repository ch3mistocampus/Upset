/**
 * Welcome screen for first-time users
 * Offers guest mode or sign-in options
 */

import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../lib/theme';
import { spacing, typography } from '../../lib/tokens';
import { Button } from '../../components/ui';

export default function Welcome() {
  const { colors } = useTheme();
  const router = useRouter();
  const { enterGuestMode, markFirstLaunchComplete } = useAuth();

  const handleGetStarted = async () => {
    await enterGuestMode();
    router.replace('/(tabs)/home');
  };

  const handleSignIn = async () => {
    await markFirstLaunchComplete();
    router.push('/(auth)/sign-in');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Hero Icon */}
        <View style={[styles.iconContainer, { backgroundColor: colors.accent + '20' }]}>
          <Ionicons name="trophy" size={64} color={colors.accent} />
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          UFC Picks Tracker
        </Text>

        {/* Tagline */}
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>
          Make picks, track your accuracy, compete with friends
        </Text>

        {/* Features List */}
        <View style={styles.features}>
          <FeatureItem
            icon="checkmark-circle"
            text="Pick winners before fights start"
            color={colors.accent}
            textColor={colors.textSecondary}
          />
          <FeatureItem
            icon="stats-chart"
            text="Track your accuracy and streaks"
            color={colors.accent}
            textColor={colors.textSecondary}
          />
          <FeatureItem
            icon="people"
            text="Compete on leaderboards"
            color={colors.accent}
            textColor={colors.textSecondary}
          />
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Get Started"
          onPress={handleGetStarted}
          variant="primary"
        />

        <Button
          title="I have an account"
          onPress={handleSignIn}
          variant="ghost"
        />
      </View>
    </View>
  );
}

interface FeatureItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  color: string;
  textColor: string;
}

function FeatureItem({ icon, text, color, textColor }: FeatureItemProps) {
  return (
    <View style={styles.featureItem}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.featureText, { color: textColor }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  tagline: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  features: {
    width: '100%',
    gap: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureText: {
    ...typography.body,
    flex: 1,
  },
  actions: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
});
