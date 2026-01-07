/**
 * DiscoverHeaderRight - Header icons for Discover screen
 *
 * Contains: Search, Fighters, People, Notifications icons
 * Displayed in the native navigation header's right slot
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import { useUnreadNotificationCount } from '../../hooks/usePostNotifications';
import { spacing } from '../../lib/tokens';

export function DiscoverHeaderRight() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data: unreadNotifications } = useUnreadNotificationCount();

  const handleSearchPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/post/search');
  };

  const handleFightersPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/fighters');
  };

  const handleNotificationsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/post/notifications');
  };

  return (
    <View style={styles.container} testID="discover-header-actions">
      <TouchableOpacity
        onPress={handleSearchPress}
        style={styles.iconButton}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel="Search posts"
        accessibilityHint="Opens the search screen to find posts"
        testID="header-search-button"
      >
        <Ionicons name="search" size={22} color={colors.accent} />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleFightersPress}
        style={styles.fightersButton}
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Browse fighters"
        accessibilityHint="Opens the UFC fighters list"
        testID="header-fighters-button"
      >
        <Ionicons name="flash" size={16} color={colors.accent} />
        <Text style={[styles.fightersText, { color: colors.accent }]}>Fighters</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleNotificationsPress}
        style={styles.iconButton}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel={`Notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ''}`}
        accessibilityHint="Opens your notifications"
        testID="header-notifications-button"
      >
        <View>
          <Ionicons name="notifications-outline" size={20} color={colors.text} />
          {unreadNotifications != null && unreadNotifications > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.danger }]}>
              {/* Badge indicator - no text for cleaner look in header */}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  iconButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  fightersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: 2,
    marginLeft: 2,
    gap: 2,
  },
  fightersText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
