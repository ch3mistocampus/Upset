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
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonCard } from '../../components/SkeletonCard';
import type { LeaderboardEntry } from '../../types/social';

type TabType = 'global' | 'friends';

export default function Leaderboards() {
  const { user } = useAuth();
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
      <View style={styles.container}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'global' && styles.tabActive]}
            onPress={() => setActiveTab('global')}
          >
            <Text style={[styles.tabText, activeTab === 'global' && styles.tabTextActive]}>
              Global
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
            onPress={() => setActiveTab('friends')}
          >
            <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
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

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return styles.goldRank;
      case 2:
        return styles.silverRank;
      case 3:
        return styles.bronzeRank;
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

    return (
      <View
        key={entry.user_id}
        style={[
          styles.leaderboardItem,
          isMe && styles.myEntry,
          getRankStyle(entry.rank),
        ]}
      >
        <View style={styles.rankContainer}>
          {rankIcon ? (
            <Text style={styles.rankIcon}>{rankIcon}</Text>
          ) : (
            <Text style={styles.rankNumber}>{entry.rank}</Text>
          )}
        </View>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {entry.username.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.username, isMe && styles.myUsername]}>
              {entry.username}
            </Text>
            {isMe && (
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText}>You</Text>
              </View>
            )}
          </View>
          <Text style={styles.picks}>{entry.total_picks} picks</Text>
        </View>

        <View style={styles.accuracyContainer}>
          <Text style={styles.accuracy}>{entry.accuracy.toFixed(1)}%</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'global' && styles.tabActive]}
          onPress={() => setActiveTab('global')}
        >
          <Ionicons
            name="globe-outline"
            size={18}
            color={activeTab === 'global' ? '#fff' : '#666'}
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, activeTab === 'global' && styles.tabTextActive]}>
            Global
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
          onPress={() => setActiveTab('friends')}
        >
          <Ionicons
            name="people-outline"
            size={18}
            color={activeTab === 'friends' ? '#fff' : '#666'}
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
            Friends
          </Text>
        </TouchableOpacity>
      </View>

      {/* My Rank Banner */}
      {myRank && !isLoading && (
        <View style={styles.myRankBanner}>
          <Ionicons name="trophy-outline" size={20} color="#d4202a" />
          <Text style={styles.myRankText}>
            Your Rank: <Text style={styles.myRankNumber}>#{myRank.rank}</Text>
          </Text>
          <Text style={styles.myRankAccuracy}>{myRank.accuracy.toFixed(1)}%</Text>
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
            tintColor="#d4202a"
            colors={['#d4202a']}
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
    backgroundColor: '#000',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#d4202a',
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#fff',
  },
  myRankBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    gap: 8,
  },
  myRankText: {
    fontSize: 15,
    color: '#fff',
  },
  myRankNumber: {
    fontWeight: 'bold',
    color: '#d4202a',
  },
  myRankAccuracy: {
    fontSize: 14,
    color: '#999',
    marginLeft: 'auto',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  myEntry: {
    borderColor: '#d4202a',
    borderWidth: 2,
  },
  goldRank: {
    borderColor: '#fbbf24',
    borderWidth: 2,
  },
  silverRank: {
    borderColor: '#9ca3af',
    borderWidth: 2,
  },
  bronzeRank: {
    borderColor: '#cd7f32',
    borderWidth: 2,
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
    color: '#999',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#d4202a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
    color: '#fff',
  },
  myUsername: {
    color: '#d4202a',
  },
  youBadge: {
    backgroundColor: '#d4202a',
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
    color: '#999',
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
