/**
 * Notification Settings Screen
 *
 * Manage push notification preferences:
 * - Toggle notification types
 * - Set quiet hours
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { useNotifications, NotificationPreferences } from '../../hooks/useNotifications';

interface NotificationToggleProps {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}

function NotificationToggle({
  title,
  description,
  value,
  onValueChange,
  disabled,
  colors,
}: NotificationToggleProps) {
  return (
    <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
      <View style={styles.toggleInfo}>
        <Text style={[styles.toggleTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export default function NotificationSettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const {
    preferences,
    preferencesLoading,
    updatePreferences,
    updatePreferencesLoading,
    registerToken,
    isAvailable,
  } = useNotifications();

  const [localPrefs, setLocalPrefs] = useState<Partial<NotificationPreferences>>({});
  const [hasRegistered, setHasRegistered] = useState(false);

  // Initialize local state from fetched preferences
  useEffect(() => {
    if (preferences) {
      setLocalPrefs(preferences);
    }
  }, [preferences]);

  // Register for push notifications on mount
  useEffect(() => {
    if (!hasRegistered && isAvailable) {
      registerToken().then(() => setHasRegistered(true));
    }
  }, [hasRegistered, isAvailable, registerToken]);

  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    // Update local state immediately for responsive UI
    setLocalPrefs((prev) => ({ ...prev, [key]: value }));

    try {
      await updatePreferences({ [key]: value });
    } catch {
      // Revert on error
      setLocalPrefs((prev) => ({ ...prev, [key]: !value }));
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  if (preferencesLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAvailable) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.unavailableCard, { backgroundColor: colors.card }]}>
          <Ionicons name="notifications-off-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.unavailableTitle, { color: colors.text }]}>
            Notifications Not Available
          </Text>
          <Text style={[styles.unavailableText, { color: colors.textSecondary }]}>
            Push notifications require the expo-notifications package to be installed.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
        <View style={styles.backButton} />
      </View>

      {/* Activity Notifications */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Activity</Text>

        <NotificationToggle
          title="New Followers"
          description="When someone starts following you"
          value={localPrefs.new_follower ?? true}
          onValueChange={(v) => handleToggle('new_follower', v)}
          disabled={updatePreferencesLoading}
          colors={colors}
        />

        <NotificationToggle
          title="Picks Graded"
          description="When your predictions are scored"
          value={localPrefs.picks_graded ?? true}
          onValueChange={(v) => handleToggle('picks_graded', v)}
          disabled={updatePreferencesLoading}
          colors={colors}
        />

        <NotificationToggle
          title="Friend Activity"
          description="When friends make picks or achieve milestones"
          value={localPrefs.friend_activity ?? false}
          onValueChange={(v) => handleToggle('friend_activity', v)}
          disabled={updatePreferencesLoading}
          colors={colors}
        />
      </View>

      {/* Reminders */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Reminders</Text>

        <NotificationToggle
          title="24 Hour Reminder"
          description="Reminder to make picks 24 hours before event"
          value={localPrefs.event_reminder_24h ?? true}
          onValueChange={(v) => handleToggle('event_reminder_24h', v)}
          disabled={updatePreferencesLoading}
          colors={colors}
        />

        <NotificationToggle
          title="1 Hour Reminder"
          description="Final reminder 1 hour before picks lock"
          value={localPrefs.event_reminder_1h ?? true}
          onValueChange={(v) => handleToggle('event_reminder_1h', v)}
          disabled={updatePreferencesLoading}
          colors={colors}
        />

        <NotificationToggle
          title="Streak at Risk"
          description="When you might miss picks and lose your streak"
          value={localPrefs.streak_at_risk ?? true}
          onValueChange={(v) => handleToggle('streak_at_risk', v)}
          disabled={updatePreferencesLoading}
          colors={colors}
        />
      </View>

      {/* Updates */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Updates</Text>

        <NotificationToggle
          title="Weekly Recap"
          description="Summary of your weekly performance"
          value={localPrefs.weekly_recap ?? true}
          onValueChange={(v) => handleToggle('weekly_recap', v)}
          disabled={updatePreferencesLoading}
          colors={colors}
        />
      </View>

      {/* Info */}
      <View style={styles.infoSection}>
        <Ionicons name="information-circle-outline" size={20} color={colors.textTertiary} />
        <Text style={[styles.infoText, { color: colors.textTertiary }]}>
          You can change these settings at any time. Notifications are sent based on your timezone.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as '700',
  },
  section: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium as '500',
    marginBottom: spacing.xs,
  },
  toggleDescription: {
    fontSize: typography.sizes.sm,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  unavailableCard: {
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  unavailableTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold as '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  unavailableText: {
    fontSize: typography.sizes.md,
    textAlign: 'center',
  },
});
