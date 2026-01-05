/**
 * Leaderboards screen - global and friends rankings
 * Requires authentication - shows gate for guests
 * Theme-aware design with SurfaceCard and entrance animations
 */

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Easing,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/useAuth';
import { useAuthGate } from '../../hooks/useAuthGate';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState, SurfaceCard } from '../../components/ui';
import { SkeletonCard } from '../../components/SkeletonCard';
import { AuthPromptModal } from '../../components/AuthPromptModal';
import type { LeaderboardEntry } from '../../types/social';

type TabType = 'global' | 'friends';

const MIN_GRADED_PICKS = 10;

// Animated leaderboard entry wrapper
function AnimatedLeaderboardItem({ children, index }: { children: React.ReactNode; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    const delay = 60 + index * 40; // Faster stagger for leaderboard
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateAnim, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [fadeAnim, translateAnim, index]);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: translateAnim }],
      }}
    >
      {children}
    </Animated.View>
  );
}

export default function Leaderboards() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { showGate, closeGate, openGate, isGuest, gateContext } = useAuthGate();
  const [activeTab, setActiveTab] = useState<TabType>('global');
  const [refreshing, setRefreshing] = useState(false);
  const [gateDismissed, setGateDismissed] = useState(false);

  // Entrance animations
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const tabIndicatorPosition = useRef(new Animated.Value(0)).current;
  const bannerFadeAnim = useRef(new Animated.Value(0)).current;
  const bannerTranslateAnim = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    // Header entrance
    Animated.timing(headerFadeAnim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Banner entrance
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(bannerFadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(bannerTranslateAnim, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, 100);
  }, [headerFadeAnim, bannerFadeAnim, bannerTranslateAnim]);

  // Animate tab indicator
  useEffect(() => {
    Animated.spring(tabIndicatorPosition, {
      toValue: activeTab === 'global' ? 0 : 1,
      tension: 300,
      friction: 20,
      useNativeDriver: true,
    }).start();
  }, [activeTab, tabIndicatorPosition]);

  // All hooks must be called before any conditional returns
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

  // Show gate immediately for guests
  useEffect(() => {
    if (isGuest && !gateDismissed) {
      openGate('leaderboard');
    }
  }, [isGuest, gateDismissed, openGate]);

  const handleCloseGate = () => {
    closeGate();
    setGateDismissed(true);
  };

  const handleSignIn = () => {
    router.push('/(auth)/sign-in');
  };

  // If guest and gate dismissed, show placeholder
  if (isGuest && gateDismissed && !showGate) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="trophy-outline"
          title="Leaderboards require an account"
          message="Sign in to appear on the leaderboard and track your rankings."
          actionLabel="Sign In"
          onAction={handleSignIn}
        />
      </View>
    );
  }

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
        return colors.gold;
      case 2:
        return colors.silver;
      case 3:
        return colors.bronze;
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

  const handleTabPress = (tab: TabType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  const handleUserPress = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/user/${userId}`);
  };

  const renderLeaderboardItem = (entry: LeaderboardEntry, index: number) => {
    const isMe = entry.user_id === user?.id;
    const rankIcon = getRankIcon(entry.rank);
    const isTopThree = entry.rank <= 3;

    const content = (
      <View style={styles.leaderboardItemRow}>
        <View style={styles.rankContainer}>
          {rankIcon ? (
            <Text style={styles.rankIcon}>{rankIcon}</Text>
          ) : (
            <Text style={[styles.rankNumber, { color: colors.textTertiary }]}>{entry.rank}</Text>
          )}
        </View>

        <View style={[styles.avatar, { backgroundColor: isMe ? colors.accent : colors.surfaceAlt }]}>
          <Text style={[styles.avatarText, { color: isMe ? '#fff' : colors.text }]}>
            {entry.username.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.username, { color: colors.text }, isMe && { color: colors.accent }]}>
              @{entry.username}
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
          <Text style={[styles.accuracy, { color: colors.success }]}>{entry.accuracy.toFixed(1)}%</Text>
          {!isMe && (
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} style={styles.chevron} />
          )}
        </View>
      </View>
    );

    return (
      <AnimatedLeaderboardItem key={entry.user_id} index={index}>
        <SurfaceCard
          weakWash
          animatedBorder={isMe}
          style={isTopThree ? { borderWidth: 2, borderColor: getRankBorderColor(entry.rank) || colors.border, borderRadius: radius.card } : undefined}
        >
          <TouchableOpacity onPress={() => handleUserPress(entry.user_id)} activeOpacity={0.7}>
            {content}
          </TouchableOpacity>
        </SurfaceCard>
      </AnimatedLeaderboardItem>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tabs */}
      <Animated.View style={[styles.tabContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border, opacity: headerFadeAnim }]}>
        <View style={styles.tabsRow} accessibilityRole="tablist">
          <TouchableOpacity
            style={styles.tab}
            onPress={() => handleTabPress('global')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'global' }}
            accessibilityLabel="Global leaderboard - All users ranked by accuracy"
          >
            <Ionicons
              name="globe-outline"
              size={18}
              color={activeTab === 'global' ? colors.text : colors.textTertiary}
            />
            <Text style={[styles.tabText, { color: activeTab === 'global' ? colors.text : colors.textTertiary }]}>
              Global
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tab}
            onPress={() => handleTabPress('friends')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'friends' }}
            accessibilityLabel="Friends leaderboard - Your friends ranked by accuracy"
          >
            <Ionicons
              name="people-outline"
              size={18}
              color={activeTab === 'friends' ? colors.text : colors.textTertiary}
            />
            <Text style={[styles.tabText, { color: activeTab === 'friends' ? colors.text : colors.textTertiary }]}>
              Friends
            </Text>
          </TouchableOpacity>
        </View>

        {/* Animated tab indicator */}
        <Animated.View
          style={[
            styles.tabIndicator,
            { backgroundColor: colors.accent },
            {
              transform: [
                {
                  translateX: tabIndicatorPosition.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 180],
                  }),
                },
              ],
            },
          ]}
        />
      </Animated.View>

      {/* My Rank Banner */}
      {myRank && !isLoading && (
        <Animated.View
          style={{
            opacity: bannerFadeAnim,
            transform: [{ translateY: bannerTranslateAnim }],
            paddingHorizontal: spacing.md,
            paddingTop: spacing.md,
          }}
        >
          <SurfaceCard heroGlow animatedBorder>
            <View style={styles.myRankBannerRow}>
              <View style={styles.myRankLeft}>
                <View style={[styles.trophyBadge, { backgroundColor: colors.accent }]}>
                  <Ionicons name="trophy" size={18} color="#fff" />
                </View>
                <View>
                  <Text style={[styles.myRankLabel, { color: colors.textSecondary }]}>Your Rank</Text>
                  <Text style={[styles.myRankNumber, { color: colors.text }]}>#{myRank.rank}</Text>
                </View>
              </View>
              <View style={styles.myRankRight}>
                <Text style={[styles.myRankAccuracyLabel, { color: colors.textSecondary }]}>Accuracy</Text>
                <Text style={[styles.myRankAccuracy, { color: colors.success }]}>{myRank.accuracy.toFixed(1)}%</Text>
              </View>
            </View>
          </SurfaceCard>
        </Animated.View>
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
          <>
            {leaderboard.map((entry, index) => renderLeaderboardItem(entry, index))}

            {/* Threshold Notice */}
            <AnimatedLeaderboardItem index={leaderboard.length}>
              <SurfaceCard weakWash>
                <View style={styles.thresholdNoticeRow}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.textTertiary} />
                  <Text style={[styles.thresholdText, { color: colors.textTertiary }]}>
                    Rankings require {MIN_GRADED_PICKS} graded picks
                  </Text>
                </View>
              </SurfaceCard>
            </AnimatedLeaderboardItem>

            {/* User-specific threshold message */}
            {myRank && myRank.total_picks < MIN_GRADED_PICKS && (
              <AnimatedLeaderboardItem index={leaderboard.length + 1}>
                <SurfaceCard weakWash animatedBorder>
                  <View style={styles.userThresholdNoticeRow}>
                    <Ionicons name="trending-up-outline" size={18} color={colors.accent} />
                    <Text style={[styles.userThresholdText, { color: colors.textSecondary }]}>
                      Need <Text style={{ color: colors.accent, fontWeight: '600' }}>
                        {MIN_GRADED_PICKS - myRank.total_picks} more
                      </Text> graded picks to rank
                    </Text>
                  </View>
                </SurfaceCard>
              </AnimatedLeaderboardItem>
            )}
          </>
        )}
      </ScrollView>

      {/* Auth Gate Modal */}
      <AuthPromptModal
        visible={showGate}
        onClose={handleCloseGate}
        onSignIn={handleSignIn}
        context={gateContext || 'leaderboard'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    borderBottomWidth: 1,
  },
  tabsRow: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '50%',
    height: 2,
    borderRadius: 1,
  },
  tabText: {
    ...typography.body,
    fontWeight: '600',
  },
  myRankBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  myRankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  trophyBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myRankLabel: {
    ...typography.meta,
  },
  myRankNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  myRankRight: {
    alignItems: 'flex-end',
  },
  myRankAccuracyLabel: {
    ...typography.meta,
  },
  myRankAccuracy: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 100,
    gap: spacing.sm,
  },
  leaderboardItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '700',
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
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  username: {
    ...typography.body,
    fontWeight: '600',
  },
  youBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  picks: {
    ...typography.meta,
    marginTop: 2,
  },
  accuracyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accuracy: {
    fontSize: 18,
    fontWeight: '700',
  },
  chevron: {
    marginLeft: spacing.xs,
  },
  thresholdNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  thresholdText: {
    ...typography.meta,
  },
  userThresholdNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  userThresholdText: {
    ...typography.body,
  },
});
