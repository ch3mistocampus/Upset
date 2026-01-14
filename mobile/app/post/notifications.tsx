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
import { useCallback, useEffect, useState } from 'react';
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

// Toggle this to show mock data for preview
const USE_MOCK_DATA = true;

// Mock notifications using REAL post IDs, comment IDs, and user data from the database
const MOCK_NOTIFICATIONS: PostNotification[] = [
  // Unread notifications (3)
  {
    id: 'mock-1',
    type: 'post_like',
    is_read: false,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
    post_id: 'b4808620-a6fa-45db-8aec-ea27ef35dfdf', // Real post: "My 2025 record: 78% accuracy!"
    comment_id: null,
    post_title: 'My 2025 record: 78% accuracy!',
    actor: {
      user_id: '10421a84-a15e-4d53-b566-08519782f548',
      username: 'bob_fighter',
      avatar_url: null,
    },
  },
  {
    id: 'mock-2',
    type: 'post_comment',
    is_read: false,
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 min ago
    post_id: 'eb469ca6-c806-414b-920f-6790af9e8d33', // Real post: "My bold prediction for this weekend"
    comment_id: '1182c721-2fc8-4a9c-bd33-14d0dbc5ebc1',
    post_title: 'My bold prediction for this weekend',
    actor: {
      user_id: 'd1ca48f8-3152-4d28-a781-9465b191e264',
      username: 'charlie_picks',
      avatar_url: null,
    },
  },
  {
    id: 'mock-3',
    type: 'comment_like',
    is_read: false,
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 min ago
    post_id: '245fa17f-9eb6-419d-be11-77462e1d8a86', // Real post: "Training camp insider info"
    comment_id: '31860339-b03d-4307-97be-dc39327d5558',
    post_title: 'Training camp insider info',
    actor: {
      user_id: '8089b91b-91f8-417d-99fd-27d0e6cfb802',
      username: 'iris_insider',
      avatar_url: null,
    },
  },
  // Read notifications (7)
  {
    id: 'mock-4',
    type: 'comment_reply',
    is_read: true,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    post_id: '6b77f332-558e-4585-aaff-35e9ec12714b', // Real post: "My UFC 310 Predictions Thread"
    comment_id: 'f214b2dc-4bfd-4ec2-a71a-4cc3ab772049',
    post_title: 'My UFC 310 Predictions Thread',
    actor: {
      user_id: 'c06aeff7-84af-42e0-a885-0f33bd11751a',
      username: 'henry_heavyweight',
      avatar_url: null,
    },
  },
  {
    id: 'mock-5',
    type: 'post_like',
    is_read: true,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    post_id: '87376c48-7241-4744-a9ac-76cc42b55846', // Real post: "Why knockouts are down in modern MMA"
    comment_id: null,
    post_title: 'Why knockouts are down in modern MMA',
    actor: {
      user_id: 'a241a3c4-6653-400e-a0e9-56c0446cb295',
      username: 'frank_knockout',
      avatar_url: null,
    },
  },
  {
    id: 'mock-6',
    type: 'post_comment',
    is_read: true,
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    post_id: 'bed7f6ea-b214-4bcc-9380-d29398df7876', // Real post: "Heavyweight division is STACKED"
    comment_id: 'a5294c8d-a611-4717-be4e-fe08af24f4f2',
    post_title: 'Heavyweight division is STACKED',
    actor: {
      user_id: '434f2965-e63d-40ae-825d-77d8b8fb0cbd',
      username: 'grace_grappling',
      avatar_url: null,
    },
  },
  {
    id: 'mock-7',
    type: 'post_like',
    is_read: true,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    post_id: '39a4d37a-3a68-43ee-9f0a-fde9888434c1', // Real post: "Underrated fighters to watch in 2026"
    comment_id: null,
    post_title: 'Underrated fighters to watch in 2026',
    actor: {
      user_id: '4489c91d-6170-4d0c-973b-e11da25ba93d',
      username: 'david_mma',
      avatar_url: null,
    },
  },
  {
    id: 'mock-8',
    type: 'comment_reply',
    is_read: true,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    post_id: '2a657ed6-f704-4d8a-946c-9972a0dc5022', // Real post: "Post-fight analysis: What went wrong?"
    comment_id: '6ff6e71c-ec3e-48ee-8ed3-4495582638f4',
    post_title: 'Post-fight analysis: What went wrong?',
    actor: {
      user_id: 'e5e9a61d-d21f-4706-a9db-586428381db3',
      username: 'emma_octagon',
      avatar_url: null,
    },
  },
  {
    id: 'mock-9',
    type: 'post_like',
    is_read: true,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    post_id: '908fe38a-8f23-4b63-879a-714cf20f5a4d', // Real post: "Grappling breakdown: BJJ vs Wrestling"
    comment_id: null,
    post_title: 'Grappling breakdown: BJJ vs Wrestling',
    actor: {
      user_id: 'c85dbeb6-ddf3-4d76-8475-39ff11b80e3b',
      username: 'jack_judge',
      avatar_url: null,
    },
  },
  {
    id: 'mock-10',
    type: 'comment_like',
    is_read: true,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    post_id: 'd0a003d7-9022-4ebc-a6fd-b7a9102930ff', // Real post: "Fight night watch party!"
    comment_id: 'fd152240-aa75-4afd-bd45-9ceb9f18cd0b',
    post_title: 'Fight night watch party!',
    actor: {
      user_id: 'f64da1ed-138e-410b-8c2f-df0564ee2414',
      username: 'alice_ufc',
      avatar_url: null,
    },
  },
];

export default function PostNotificationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  // Mock state for preview
  const [mockNotifications, setMockNotifications] = useState(MOCK_NOTIFICATIONS);
  const [mockRefreshing, setMockRefreshing] = useState(false);

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

  // Use mock or real data based on flag
  const notifications = USE_MOCK_DATA ? mockNotifications : (data?.pages.flat() ?? []);

  // Mark all as read when screen opens
  useEffect(() => {
    if (USE_MOCK_DATA) return; // Skip for mock data
    const timer = setTimeout(() => {
      markAsRead.mutate(undefined);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Mock refresh handler
  const handleMockRefresh = async () => {
    setMockRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setMockRefreshing(false);
  };

  // Mock mark all as read
  const handleMockMarkAllRead = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMockNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true }))
    );
  };

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleNotificationPress = (notification: PostNotification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Mark as read in mock mode
    if (USE_MOCK_DATA) {
      setMockNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
    }

    // Navigate to the post (works for both mock and real data)
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
    if (!USE_MOCK_DATA && isLoading) {
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
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
        {notifications.some((n) => !n.is_read) ? (
          <TouchableOpacity
            onPress={USE_MOCK_DATA ? handleMockMarkAllRead : () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              markAsRead.mutate(undefined);
            }}
            style={styles.markReadButton}
          >
            <Text style={[styles.markReadText, { color: colors.accent }]}>
              Mark all read
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={USE_MOCK_DATA ? null : renderFooter}
        onEndReached={USE_MOCK_DATA ? undefined : handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={USE_MOCK_DATA ? mockRefreshing : isRefetching}
            onRefresh={USE_MOCK_DATA ? handleMockRefresh : refetch}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
    width: 32,
  },
  headerTitle: {
    fontFamily: 'BebasNeue',
    fontSize: 22,
    letterSpacing: 0.3,
  },
  headerSpacer: {
    width: 80,
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
    borderRadius: 11,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 11,
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
    fontFamily: 'BebasNeue',
    fontSize: 14,
    letterSpacing: 0.3,
  },
});
