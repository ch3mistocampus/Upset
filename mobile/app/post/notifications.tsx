/**
 * Post Notifications Screen
 * Shows notifications for likes, comments, and replies
 */

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useCallback, useEffect } from 'react';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import {
  usePostNotifications,
  useMarkNotificationsRead,
  getNotificationMessage,
  PostNotification,
} from '../../hooks/usePostNotifications';
import { EmptyState } from '../../components/EmptyState';
import { formatRelativeTime } from '../../hooks/usePosts';

export default function PostNotificationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = usePostNotifications();

  const markAsRead = useMarkNotificationsRead();

  const notifications = data?.pages.flat() ?? [];

  // Mark all as read when screen opens
  useEffect(() => {
    const timer = setTimeout(() => {
      markAsRead.mutate(undefined);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleNotificationPress = (notification: PostNotification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Navigate to the post
    if (notification.post_id) {
      router.push(`/post/${notification.post_id}`);
    }
  };

  const getNotificationIcon = (type: PostNotification['type']) => {
    switch (type) {
      case 'post_like':
        return 'heart';
      case 'post_comment':
        return 'chatbubble';
      case 'comment_like':
        return 'heart-outline';
      case 'comment_reply':
        return 'arrow-undo';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: PostNotification['type']) => {
    switch (type) {
      case 'post_like':
      case 'comment_like':
        return colors.danger;
      case 'post_comment':
      case 'comment_reply':
        return colors.accent;
      default:
        return colors.textSecondary;
    }
  };

  const renderNotification = useCallback(
    ({ item }: { item: PostNotification }) => (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          { backgroundColor: item.is_read ? 'transparent' : colors.accentSoft },
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        {item.actor.avatar_url ? (
          <Image source={{ uri: item.actor.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name="person" size={20} color={colors.textSecondary} />
          </View>
        )}

        {/* Content */}
        <View style={styles.notificationContent}>
          <Text style={[styles.notificationText, { color: colors.text }]}>
            {getNotificationMessage(item)}
          </Text>
          {item.post_title && (
            <Text
              style={[styles.postTitle, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              "{item.post_title}"
            </Text>
          )}
          <Text style={[styles.timestamp, { color: colors.textTertiary }]}>
            {formatRelativeTime(item.created_at)}
          </Text>
        </View>

        {/* Icon */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${getNotificationColor(item.type)}20` },
          ]}
        >
          <Ionicons
            name={getNotificationIcon(item.type)}
            size={16}
            color={getNotificationColor(item.type)}
          />
        </View>
      </TouchableOpacity>
    ),
    [colors]
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading notifications...
          </Text>
        </View>
      );
    }

    return (
      <EmptyState
        icon="notifications-outline"
        title="No Notifications"
        message="When someone likes your posts or comments, you'll see it here."
      />
    );
  }, [isLoading, colors]);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }, [isFetchingNextPage, colors]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Notifications',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerRight: () =>
            notifications.some((n) => !n.is_read) ? (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  markAsRead.mutate(undefined);
                }}
                style={styles.markReadButton}
              >
                <Text style={[styles.markReadText, { color: colors.accent }]}>
                  Mark all read
                </Text>
              </TouchableOpacity>
            ) : null,
        }}
      />

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          notifications.length === 0 && styles.emptyContainer,
        ]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    ...typography.body,
    marginBottom: 2,
  },
  postTitle: {
    ...typography.meta,
    marginBottom: 4,
  },
  timestamp: {
    ...typography.meta,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: 1,
    marginLeft: 72,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  loadingFooter: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  markReadButton: {
    paddingHorizontal: spacing.md,
  },
  markReadText: {
    ...typography.body,
    fontWeight: '600',
  },
});
