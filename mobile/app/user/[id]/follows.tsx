/**
 * Followers/Following list screen
 * Shows list of users who follow or are followed by a user
 */

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFriends } from '../../../hooks/useFriends';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { useTheme } from '../../../lib/theme';
import { spacing, radius } from '../../../lib/tokens';
import { SurfaceCard, EmptyState } from '../../../components/ui';
import type { UserSearchResult } from '../../../types/social';

type TabType = 'followers' | 'following';

export default function FollowsScreen() {
  const { colors } = useTheme();
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const { getFollowers, getFollowing, follow, unfollow, followLoading, unfollowLoading } = useFriends();

  const [activeTab, setActiveTab] = useState<TabType>((tab as TabType) || 'followers');
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    if (!id) return;

    try {
      const data = activeTab === 'followers'
        ? await getFollowers(id)
        : await getFollowing(id);
      setUsers(data);
    } catch (error: any) {
      toast.showError(error.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [id, activeTab, getFollowers, getFollowing, toast]);

  useEffect(() => {
    setIsLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleTabChange = (newTab: TabType) => {
    if (newTab !== activeTab) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActiveTab(newTab);
      setIsLoading(true);
    }
  };

  const handleFollow = async (targetUser: UserSearchResult) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPendingActions((prev) => new Set(prev).add(targetUser.user_id));

      await follow(targetUser.user_id);

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === targetUser.user_id ? { ...u, friendship_status: 'accepted' } : u
        )
      );
      toast.showNeutral(`Following @${targetUser.username}`);
    } catch (error: any) {
      toast.showError(error.message || 'Failed to follow');
    } finally {
      setPendingActions((prev) => {
        const next = new Set(prev);
        next.delete(targetUser.user_id);
        return next;
      });
    }
  };

  const handleUnfollow = async (targetUser: UserSearchResult) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPendingActions((prev) => new Set(prev).add(targetUser.user_id));

      await unfollow(targetUser.user_id);

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === targetUser.user_id ? { ...u, friendship_status: null } : u
        )
      );
      toast.showNeutral(`Unfollowed @${targetUser.username}`);
    } catch (error: any) {
      toast.showError(error.message || 'Failed to unfollow');
    } finally {
      setPendingActions((prev) => {
        const next = new Set(prev);
        next.delete(targetUser.user_id);
        return next;
      });
    }
  };

  const handleUserPress = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/user/${userId}`);
  };

  const renderUserItem = (userItem: UserSearchResult) => {
    const isCurrentUser = user?.id === userItem.user_id;
    const isFollowing = userItem.friendship_status === 'accepted';
    const isPending = pendingActions.has(userItem.user_id);

    return (
      <SurfaceCard key={userItem.user_id} weakWash style={styles.userCard}>
        <TouchableOpacity
          style={styles.userRow}
          onPress={() => handleUserPress(userItem.user_id)}
          activeOpacity={0.7}
        >
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={styles.avatarText}>
              {userItem.username.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.userInfo}>
            <Text style={[styles.username, { color: colors.text }]}>
              @{userItem.username}
            </Text>
            <Text style={[styles.userStats, { color: colors.textSecondary }]}>
              {userItem.accuracy.toFixed(1)}% accuracy
            </Text>
          </View>

          {!isCurrentUser && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: isFollowing ? colors.surfaceAlt : colors.accent },
              ]}
              onPress={() => isFollowing ? handleUnfollow(userItem) : handleFollow(userItem)}
              disabled={isPending}
              activeOpacity={0.8}
            >
              {isPending ? (
                <ActivityIndicator size="small" color={isFollowing ? colors.text : '#fff'} />
              ) : (
                <Text
                  style={[
                    styles.actionButtonText,
                    { color: isFollowing ? colors.textSecondary : '#fff' },
                  ]}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </SurfaceCard>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {activeTab === 'followers' ? 'Followers' : 'Following'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'followers' && { borderBottomColor: colors.accent }]}
          onPress={() => handleTabChange('followers')}
        >
          <Text
            style={[
              styles.tabText,
              { color: colors.textTertiary },
              activeTab === 'followers' && { color: colors.text },
            ]}
          >
            Followers
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && { borderBottomColor: colors.accent }]}
          onPress={() => handleTabChange('following')}
        >
          <Text
            style={[
              styles.tabText,
              { color: colors.textTertiary },
              activeTab === 'following' && { color: colors.text },
            ]}
          >
            Following
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : users.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title={activeTab === 'followers' ? 'No Followers' : 'Not Following Anyone'}
            message={
              activeTab === 'followers'
                ? 'No one is following this user yet.'
                : 'This user is not following anyone yet.'
            }
          />
        ) : (
          users.map(renderUserItem)
        )}
      </ScrollView>
    </View>
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
    paddingTop: 60,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  placeholder: {
    width: 32,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  userCard: {
    marginBottom: spacing.sm,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  userStats: {
    fontSize: 13,
  },
  actionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 14,
    minWidth: 80,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
