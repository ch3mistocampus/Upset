/**
 * Leaderboards screen - global and friends rankings
 */

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { useTheme } from '../../lib/theme';
import { spacing, radius } from '../../lib/tokens';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/ui';
import { SkeletonCard } from '../../components/SkeletonCard';
import type { LeaderboardEntry } from '../../types/social';

type TabType = 'global' | 'friends';

export default function Leaderboards() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('global');
  const [refreshing, setRefreshing] = useState(false);

  const {
    globalLeaderboard,
    friendsLeaderboard,
    globalLoading,
    friendsLoading,
    globalError,
    friendsError,
    refetchGlobal,
    refetchFriends,
  } = useLeaderboard();

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'global') {
      await refetchGlobal();
    } else {
      await refetchFriends();
    }
    setRefreshing(false);
  };

  const isLoading = activeTab === 'global' ? globalLoading : friendsLoading;
  const hasError = activeTab === 'global' ? globalError : friendsError;
  const leaderboard = activeTab === 'global' ? globalLeaderboard : friendsLeaderboard;

  // Find current user's rank
  const myRank = leaderboard.find((entry) => entry.user_id === user?.id);

  if (hasError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.tabContainer, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'global' && { borderBottomColor: colors.accent }]}
            onPress={() => setActiveTab('global')}
          >
            <Text style={[styles.tabText, { color: colors.textMuted }, activeTab === 'global' && { color: colors.text }]}>
              Global
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'friends' && { borderBottomColor: colors.accent }]}
            onPress={() => setActiveTab('friends')}
          >
            <Text style={[styles.tabText, { color: colors.textMuted }, activeTab === 'friends' && { color: colors.text }]}>
              Friends
            </Text>
          </TouchableOpacity>
        </View>
        <ErrorState
          message={`Failed to load ${activeTab} leaderboard. Check your connection.`}
          onRetry={() => (activeTab === 'global' ? refetchGlobal() : refetchFriends())}
        />
      </View>
    );
  }

  const getRankBorderColor = (rank: number) => {
    switch (rank) {
      case 1:
        return '#fbbf24'; // gold
      case 2:
        return '#9ca3af'; // silver
      case 3:
        return '#cd7f32'; // bronze
      default:
        return null;
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return null;
    }
  };

  const renderLeaderboardItem = (entry: LeaderboardEntry, index: number) => {
    const isMe = entry.user_id === user?.id;
    const rankIcon = getRankIcon(entry.rank);
    const rankBorderColor = getRankBorderColor(entry.rank);

    return (
      <View
        key={entry.user_id}
        style={[
          styles.leaderboardItem,
          { backgroundColor: colors.surface, borderColor: colors.border },
          isMe && { borderColor: colors.accent, borderWidth: 2 },
          rankBorderColor && { borderColor: rankBorderColor, borderWidth: 2 },
        ]}
      >
        <View style={styles.rankContainer}>
          {rankIcon ? (
            <Text style={styles.rankIcon}>{rankIcon}</Text>
          ) : (
            <Text style={[styles.rankNumber, { color: colors.textMuted }]}>{entry.rank}</Text>
          )}
        </View>

        <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
          <Text style={styles.avatarText}>
            {entry.username.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.username, { color: colors.text }, isMe && { color: colors.accent }]}>
              {entry.username}
            </Text>
            {isMe && (
              <View style={[styles.youBadge, { backgroundColor: colors.accent }]}>
                <Text style={styles.youBadgeText}>You</Text>
              </View>
            )}
          </View>
          <Text style={[styles.picks, { color: colors.textSecondary }]}>{entry.total_picks} picks</Text>
        </View>

        <View style={styles.accuracyContainer}>
          <Text style={styles.accuracy}>{entry.accuracy.toFixed(1)}%</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'global' && { borderBottomColor: colors.accent }]}
          onPress={() => setActiveTab('global')}
        >
          <Ionicons
            name="globe-outline"
            size={18}
            color={activeTab === 'global' ? colors.text : colors.textMuted}
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, { color: colors.textMuted }, activeTab === 'global' && { color: colors.text }]}>
            Global
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && { borderBottomColor: colors.accent }]}
          onPress={() => setActiveTab('friends')}
        >
          <Ionicons
            name="people-outline"
            size={18}
            color={activeTab === 'friends' ? colors.text : colors.textMuted}
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, { color: colors.textMuted }, activeTab === 'friends' && { color: colors.text }]}>
            Friends
          </Text>
        </TouchableOpacity>
      </View>

      {/* My Rank Banner */}
      {myRank && !isLoading && (
        <View style={[styles.myRankBanner, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
          <Ionicons name="trophy-outline" size={20} color={colors.accent} />
          <Text style={[styles.myRankText, { color: colors.text }]}>
            Your Rank: <Text style={[styles.myRankNumber, { color: colors.accent }]}>#{myRank.rank}</Text>
          </Text>
          <Text style={[styles.myRankAccuracy, { color: colors.textSecondary }]}>{myRank.accuracy.toFixed(1)}%</Text>
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : leaderboard.length === 0 ? (
          <EmptyState
            icon="trophy-outline"
            title={activeTab === 'global' ? 'No Rankings Yet' : 'No Friends Yet'}
            message={
              activeTab === 'global'
                ? 'Be the first to make picks and appear on the leaderboard!'
                : 'Add friends to see how you rank against them!'
            }
          />
        ) : (
          leaderboard.map(renderLeaderboardItem)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabIcon: {
    marginRight: spacing.xs,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  myRankBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    gap: 8,
  },
  myRankText: {
    fontSize: 15,
  },
  myRankNumber: {
    fontWeight: 'bold',
  },
  myRankAccuracy: {
    fontSize: 14,
    marginLeft: 'auto',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  rankContainer: {
    width: 36,
    alignItems: 'center',
  },
  rankIcon: {
    fontSize: 24,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
  },
  youBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  picks: {
    fontSize: 13,
    marginTop: 2,
  },
  accuracyContainer: {
    alignItems: 'flex-end',
  },
  accuracy: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22c55e',
  },
});
