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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { useNotifications, NotificationPreferences, NotificationLogItem } from '../../hooks/useNotifications';
import { SurfaceCard } from '../../components/ui';
import { SettingsRow } from '../../components/SettingsRow';

// Helper to format notification time
function formatNotificationTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

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
        trackColor={{ false: colors.border, true: colors.accent }}
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
    notificationHistory,
    historyLoading,
    markAsRead,
    unreadCount,
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
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!isAvailable) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.unavailableCard, { backgroundColor: colors.surface }]}>
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.surface }]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Post Activity Link */}
      <View style={{ marginHorizontal: spacing.md, marginBottom: spacing.lg }}>
        <SurfaceCard noPadding>
          <SettingsRow
            icon="chatbubble-ellipses-outline"
            label="Post Activity"
            type="link"
            subtitle="Comments and replies on your posts"
            onPress={() => router.push('/post/notifications')}
          />
        </SurfaceCard>
      </View>

      {/* Activity Notifications */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
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
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
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
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
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

      {/* Notification History */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent</Text>
          {unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.accent }]}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {historyLoading ? (
          <View style={styles.historyLoading}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        ) : notificationHistory.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Ionicons name="notifications-outline" size={32} color={colors.textTertiary} />
            <Text style={[styles.emptyHistoryText, { color: colors.textSecondary }]}>
              No notifications yet
            </Text>
          </View>
        ) : (
          notificationHistory.slice(0, 10).map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationItem,
                { borderBottomColor: colors.border },
                !notification.read_at && { backgroundColor: colors.surfaceAlt },
              ]}
              onPress={async () => {
                try {
                  if (!notification.read_at) {
                    await markAsRead(notification.id);
                  }
                } catch {
                  // Silently handle - notification may already be read or not exist
                }
                // Navigate based on notification data
                const data = notification.data || {};
                if (data.event_id) {
                  router.push(`/event/${data.event_id}`);
                } else if (data.user_id) {
                  router.push(`/user/${data.user_id}`);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <Text
                    style={[
                      styles.notificationTitle,
                      { color: colors.text },
                      !notification.read_at && { fontWeight: '600' as const },
                    ]}
                    numberOfLines={1}
                  >
                    {notification.title}
                  </Text>
                  {!notification.read_at && (
                    <View style={[styles.unreadDot, { backgroundColor: colors.accent }]} />
                  )}
                </View>
                <Text
                  style={[styles.notificationBody, { color: colors.textSecondary }]}
                  numberOfLines={2}
                >
                  {notification.body}
                </Text>
                <Text style={[styles.notificationTime, { color: colors.textTertiary }]}>
                  {formatNotificationTime(notification.sent_at)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Info */}
      <View style={styles.infoSection}>
        <Ionicons name="information-circle-outline" size={20} color={colors.textTertiary} />
        <Text style={[styles.infoText, { color: colors.textTertiary }]}>
          You can change these settings at any time. Notifications are sent based on your timezone.
        </Text>
      </View>
      </ScrollView>
    </SafeAreaView>
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
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  headerTitle: {
    fontFamily: 'BebasNeue',
    fontSize: 24,
    letterSpacing: 0.5,
  },
  section: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontFamily: 'BebasNeue',
    fontSize: 14,
    letterSpacing: 1,
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
    borderRadius: radius.card,
    alignItems: 'center',
  },
  unavailableTitle: {
    fontFamily: 'BebasNeue',
    fontSize: 22,
    letterSpacing: 0.3,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  unavailableText: {
    fontSize: typography.sizes.md,
    textAlign: 'center',
  },
  // Notification history styles
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  unreadBadge: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadBadgeText: {
    fontFamily: 'BebasNeue',
    color: '#fff',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  historyLoading: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyHistory: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyHistoryText: {
    fontSize: typography.sizes.sm,
  },
  notificationItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  notificationTitle: {
    flex: 1,
    fontSize: typography.sizes.md,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: spacing.sm,
  },
  notificationBody: {
    fontSize: typography.sizes.sm,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  notificationTime: {
    fontSize: typography.sizes.xs,
  },
});
