/**
 * Subscription detail screen
 * Shows current plan, usage meters, and management options
 */

import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography, displayTypography } from '../../lib/tokens';
import { useSubscription } from '../../hooks/useSubscription';
import { useToast } from '../../hooks/useToast';
import { SurfaceCard } from '../../components/ui';
import { GlobalTabBar } from '../../components/navigation/GlobalTabBar';
import { FREE_LIMITS } from '../../lib/superwall';

export default function SubscriptionScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const toast = useToast();
  const { isPro, usage, showPaywall, remainingEvents, remainingPosts } = useSubscription();

  const handleManageSubscription = async () => {
    try {
      await Linking.openURL('https://apps.apple.com/account/subscriptions');
    } catch {
      toast.showError('Unable to open App Store subscriptions');
    }
  };

  const handleUpgrade = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showPaywall('app_open', () => {});
  };

  return (
    <SafeAreaView style={[styles.wrapper, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.surface }]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Subscription</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Plan Badge */}
        <View style={styles.planSection}>
          <View style={[styles.planBadge, { backgroundColor: isPro ? colors.accent : colors.surfaceAlt }]}>
            <Ionicons
              name={isPro ? 'diamond' : 'person-outline'}
              size={24}
              color={isPro ? '#fff' : colors.textSecondary}
            />
            <Text style={[styles.planName, { color: isPro ? '#fff' : colors.text }]}>
              {isPro ? 'Upset Pro' : 'Free Plan'}
            </Text>
          </View>
        </View>

        {/* Usage Meters (free users only) */}
        {!isPro && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>USAGE</Text>
            <SurfaceCard>
              {/* Events meter */}
              <View style={styles.meterRow}>
                <View style={styles.meterLabel}>
                  <Ionicons name="calendar-outline" size={18} color={colors.text} />
                  <Text style={[styles.meterText, { color: colors.text }]}>Events Picked</Text>
                </View>
                <Text style={[styles.meterValue, { color: colors.accent }]}>
                  {usage?.events_picked_count ?? 0}/{FREE_LIMITS.EVENTS_PICKED}
                </Text>
              </View>
              <View style={[styles.meterTrack, { backgroundColor: colors.surfaceAlt }]}>
                <View
                  style={[
                    styles.meterFill,
                    {
                      backgroundColor: colors.accent,
                      width: `${Math.min(100, ((usage?.events_picked_count ?? 0) / FREE_LIMITS.EVENTS_PICKED) * 100)}%`,
                    },
                  ]}
                />
              </View>

              <View style={styles.meterSpacer} />

              {/* Posts meter */}
              <View style={styles.meterRow}>
                <View style={styles.meterLabel}>
                  <Ionicons name="chatbubble-outline" size={18} color={colors.text} />
                  <Text style={[styles.meterText, { color: colors.text }]}>Posts Created</Text>
                </View>
                <Text style={[styles.meterValue, { color: colors.accent }]}>
                  {usage?.posts_created_count ?? 0}/{FREE_LIMITS.POSTS_CREATED}
                </Text>
              </View>
              <View style={[styles.meterTrack, { backgroundColor: colors.surfaceAlt }]}>
                <View
                  style={[
                    styles.meterFill,
                    {
                      backgroundColor: colors.accent,
                      width: `${Math.min(100, ((usage?.posts_created_count ?? 0) / FREE_LIMITS.POSTS_CREATED) * 100)}%`,
                    },
                  ]}
                />
              </View>
            </SurfaceCard>
          </View>
        )}

        {/* Features */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
            {isPro ? 'YOUR BENEFITS' : 'UPGRADE TO PRO'}
          </Text>
          <SurfaceCard>
            <FeatureRow icon="calendar" label="Unlimited event picks" unlocked={isPro} colors={colors} />
            <FeatureRow icon="chatbubble" label="Unlimited posts" unlocked={isPro} colors={colors} />
            <FeatureRow icon="image" label="Image attachments" unlocked={isPro} colors={colors} />
            <FeatureRow icon="trophy" label="Full leaderboard ranking" unlocked={isPro} colors={colors} />
          </SurfaceCard>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          {!isPro && (
            <TouchableOpacity
              style={[styles.upgradeButton, { backgroundColor: colors.accent }]}
              onPress={handleUpgrade}
              activeOpacity={0.85}
            >
              <Ionicons name="diamond" size={20} color="#fff" />
              <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
            </TouchableOpacity>
          )}

          {isPro && (
            <TouchableOpacity
              style={[styles.manageButton, { backgroundColor: colors.surfaceAlt }]}
              onPress={handleManageSubscription}
              activeOpacity={0.7}
            >
              <Text style={[styles.manageButtonText, { color: colors.text }]}>
                Manage in App Store
              </Text>
              <Ionicons name="open-outline" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
      <GlobalTabBar />
    </SafeAreaView>
  );
}

function FeatureRow({
  icon,
  label,
  unlocked,
  colors,
}: {
  icon: string;
  label: string;
  unlocked: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={featureStyles.row}>
      <Ionicons
        name={(unlocked ? 'checkmark-circle' : 'close-circle-outline') as any}
        size={20}
        color={unlocked ? colors.success : colors.textTertiary}
      />
      <Text style={[featureStyles.label, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const featureStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
  },
});

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'BebasNeue',
    fontSize: 24,
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 36,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: 100,
  },
  planSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  planName: {
    fontFamily: 'BebasNeue',
    fontSize: 22,
    letterSpacing: 0.5,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionLabel: {
    fontFamily: 'BebasNeue',
    fontSize: 14,
    letterSpacing: 1,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  meterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  meterLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  meterText: {
    fontSize: 15,
    fontWeight: '500',
  },
  meterValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  meterTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 3,
  },
  meterSpacer: {
    height: spacing.lg,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: radius.button,
  },
  upgradeButtonText: {
    fontFamily: 'BebasNeue',
    fontSize: 18,
    color: '#fff',
    letterSpacing: 0.5,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: radius.button,
  },
  manageButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
