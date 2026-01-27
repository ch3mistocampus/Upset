/**
 * Leaderboards screen - global rankings with podium layout
 * Requires authentication - shows gate for guests
 * Premium design with top 3 podium and list for remaining
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
  Image,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/useAuth';
import { useAuthGate } from '../../hooks/useAuthGate';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { useSubscription } from '../../hooks/useSubscription';
import { PLACEMENTS } from '../../lib/superwall';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/ui';
import { SkeletonCard } from '../../components/SkeletonCard';
import { AuthPromptModal } from '../../components/AuthPromptModal';
import { generateAvatarUrl } from '../../components/Avatar';
import type { LeaderboardEntry } from '../../types/social';

const MIN_GRADED_PICKS = 10;

// Animated wrapper for entrance animations
function AnimatedItem({ children, index, delay = 60 }: { children: React.ReactNode; index: number; delay?: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    const animDelay = delay + index * 50;
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateAnim, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, animDelay);
    return () => clearTimeout(timer);
  }, [fadeAnim, translateAnim, index, delay]);

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

// Podium position component for top 3
interface PodiumPositionProps {
  entry: LeaderboardEntry;
  visualPosition: 1 | 2 | 3; // Visual position: 1=center (biggest), 2=left, 3=right
  onPress: (userId: string) => void;
  isMe: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}

function PodiumPosition({ entry, visualPosition, onPress, isMe, colors }: PodiumPositionProps) {
  // Visual position determines styling (center is biggest)
  const isCenter = visualPosition === 1;
  const avatarSize = isCenter ? 100 : 72;
  const badgeSize = isCenter ? 28 : 24;
  // Actual rank from data (for badge display)
  const displayRank = entry.rank;

  return (
    <TouchableOpacity
      style={[styles.podiumPosition, isCenter && styles.podiumFirst]}
      onPress={() => onPress(entry.user_id)}
      activeOpacity={0.8}
    >
      {/* Crown for center position (rank 1) */}
      {isCenter && (
        <View style={styles.crownContainer}>
          <Ionicons name="diamond" size={28} color={colors.accent} />
        </View>
      )}

      {/* Avatar with border - square rounded */}
      <View
        style={[
          styles.podiumAvatarContainer,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: isCenter ? 24 : 18,
            borderColor: colors.accent,
            borderWidth: isCenter ? 4 : 3,
          },
        ]}
      >
        <Image
          source={{ uri: entry.avatar_url || generateAvatarUrl(entry.username, (avatarSize - (isCenter ? 8 : 6)) * 2) }}
          style={{
            width: avatarSize - (isCenter ? 8 : 6),
            height: avatarSize - (isCenter ? 8 : 6),
            borderRadius: isCenter ? 20 : 14,
          }}
        />

        {/* Rank badge - shows actual rank from data */}
        <View
          style={[
            styles.podiumRankBadge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: colors.accent,
              bottom: isCenter ? -14 : -12,
            },
          ]}
        >
          <Text style={[styles.podiumRankText, { fontSize: isCenter ? 14 : 12 }]}>
            {displayRank}
          </Text>
        </View>
      </View>

      {/* Name */}
      <Text
        style={[styles.podiumName, { color: colors.text }]}
        numberOfLines={1}
      >
        {isMe ? 'You' : entry.username}
      </Text>

      {/* Accuracy */}
      <View style={styles.podiumAccuracyRow}>
        <Ionicons name="sparkles" size={12} color={colors.accent} />
        <Text style={[styles.podiumAccuracy, { color: colors.textSecondary }]}>
          {entry.accuracy.toFixed(1)}%
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function Leaderboards() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { showGate, closeGate, openGate, isGuest, gateContext } = useAuthGate();
  const { canSeeRank, showPaywall } = useSubscription();
  // Global leaderboard only
  const [refreshing, setRefreshing] = useState(false);
  const [gateDismissed, setGateDismissed] = useState(false);

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
    await refetchGlobal();
    setRefreshing(false);
  };

  const isLoading = globalLoading;
  const hasError = globalError;
  const leaderboard = globalLeaderboard;

  // Find current user's rank
  const myRank = leaderboard.find((entry) => entry.user_id === user?.id);

  if (hasError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ErrorState
          message="Failed to load leaderboard. Check your connection."
          onRetry={refetchGlobal}
        />
      </View>
    );
  }

  const handleUserPress = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/user/${userId}`);
  };

  // Get top 3 and remaining entries
  const top3 = leaderboard.slice(0, 3);
  const remaining = leaderboard.slice(3);

  // Reorder for podium display: [2nd, 1st, 3rd]
  const podiumOrder = top3.length >= 3
    ? [top3[1], top3[0], top3[2]]
    : top3;

  const renderListItem = (entry: LeaderboardEntry, index: number) => {
    const isMe = entry.user_id === user?.id;
    const rankHidden = isMe && !canSeeRank;

    return (
      <AnimatedItem key={entry.user_id} index={index} delay={200}>
        <TouchableOpacity
          style={[
            styles.listItem,
            {
              backgroundColor: isMe ? colors.accent : colors.surface,
              borderColor: isMe ? colors.accent : colors.border,
            },
          ]}
          onPress={() => {
            if (rankHidden) {
              showPaywall(PLACEMENTS.EVENT_LIMIT_REACHED, () => {});
            } else {
              handleUserPress(entry.user_id);
            }
          }}
          activeOpacity={0.8}
        >
          {/* Rank number */}
          <Text
            style={[
              styles.listRank,
              { color: isMe ? '#fff' : colors.textTertiary },
            ]}
          >
            {rankHidden ? '' : entry.rank}
          </Text>

          {/* Avatar */}
          <Image
            source={{ uri: entry.avatar_url || generateAvatarUrl(entry.username, 72) }}
            style={styles.listAvatar}
          />

          {/* Name */}
          <Text
            style={[
              styles.listName,
              { color: isMe ? '#fff' : colors.text },
            ]}
            numberOfLines={1}
          >
            {isMe ? 'You' : entry.username}
          </Text>

          {/* Accuracy - hidden for free users on their own row */}
          {rankHidden ? (
            <View style={styles.lockedRank}>
              <Ionicons name="lock-closed" size={14} color="#fff" />
              <Text style={styles.lockedRankText}>PRO</Text>
            </View>
          ) : (
            <Text
              style={[
                styles.listAccuracy,
                { color: isMe ? '#fff' : colors.text },
              ]}
            >
              {entry.accuracy.toFixed(1)}%
            </Text>
          )}
        </TouchableOpacity>
      </AnimatedItem>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
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
            title="No Rankings Yet"
            message="Be the first to call it. Every fight is an upset waiting to happen."
          />
        ) : (
          <>
            {/* Podium Section - Top 3 */}
            {top3.length > 0 && (
              <AnimatedItem index={0} delay={0}>
                <View style={styles.podiumContainer}>
                  {podiumOrder.map((entry, idx) => {
                    if (!entry) return null;
                    // Visual positions in podiumOrder: [0]=left (2nd), [1]=center (1st), [2]=right (3rd)
                    const visualPositionMap: Record<number, 1 | 2 | 3> = { 0: 2, 1: 1, 2: 3 };
                    const visualPosition = visualPositionMap[idx];
                    return (
                      <PodiumPosition
                        key={entry.user_id}
                        entry={entry}
                        visualPosition={visualPosition}
                        onPress={handleUserPress}
                        isMe={entry.user_id === user?.id}
                        colors={colors}
                      />
                    );
                  })}
                </View>
              </AnimatedItem>
            )}

            {/* Upgrade banner for free users */}
            {!canSeeRank && myRank && (
              <AnimatedItem index={1} delay={100}>
                <TouchableOpacity
                  style={[styles.upgradeBanner, { backgroundColor: colors.accent }]}
                  onPress={() => showPaywall(PLACEMENTS.EVENT_LIMIT_REACHED, () => {})}
                  activeOpacity={0.85}
                >
                  <View style={styles.upgradeBannerContent}>
                    <Ionicons name="lock-closed" size={18} color="#fff" />
                    <View style={styles.upgradeBannerText}>
                      <Text style={styles.upgradeBannerTitle}>Your rank is hidden</Text>
                      <Text style={styles.upgradeBannerSubtitle}>Upgrade to Pro to see your ranking</Text>
                    </View>
                  </View>
                  <View style={styles.upgradeButton}>
                    <Text style={styles.upgradeButtonText}>Upgrade</Text>
                  </View>
                </TouchableOpacity>
              </AnimatedItem>
            )}

            {/* List Section - Ranks 4+ */}
            {remaining.length > 0 && (
              <View style={[styles.listContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {remaining.map((entry, index) => renderListItem(entry, index))}
              </View>
            )}

            {/* Threshold Notice */}
            <AnimatedItem index={remaining.length + 1} delay={300}>
              <View style={styles.thresholdNoticeRow}>
                <Ionicons name="information-circle-outline" size={14} color={colors.textTertiary} />
                <Text style={[styles.thresholdText, { color: colors.textTertiary }]}>
                  Rankings require {MIN_GRADED_PICKS} graded picks
                </Text>
              </View>
            </AnimatedItem>

            {/* User-specific threshold message */}
            {myRank && myRank.total_picks < MIN_GRADED_PICKS && (
              <AnimatedItem index={remaining.length + 2} delay={350}>
                <View style={[styles.userThresholdNotice, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons name="trending-up-outline" size={16} color={colors.accent} />
                  <Text style={[styles.userThresholdText, { color: colors.textSecondary }]}>
                    Need{' '}
                    <Text style={{ color: colors.accent, fontWeight: '600' }}>
                      {MIN_GRADED_PICKS - myRank.total_picks} more
                    </Text>{' '}
                    graded picks to rank
                  </Text>
                </View>
              </AnimatedItem>
            )}
          </>
        )}

        {/* Bottom padding */}
        <View style={{ height: 100 }} />
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.lg,
  },

  // Podium styles
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  podiumPosition: {
    alignItems: 'center',
    width: 100,
  },
  podiumFirst: {
    marginBottom: spacing.md,
  },
  crownContainer: {
    marginBottom: spacing.xs,
  },
  podiumAvatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  podiumRankBadge: {
    position: 'absolute',
    bottom: -4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumRankText: {
    color: '#fff',
    fontWeight: '700',
  },
  podiumName: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing.sm,
    textAlign: 'center',
    maxWidth: 90,
  },
  podiumAccuracyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  podiumAccuracy: {
    fontSize: 13,
    fontWeight: '600',
  },

  // List styles
  listContainer: {
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  listRank: {
    width: 28,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  listAvatar: {
    width: 44,
    height: 44,
    borderRadius: 11,
    marginLeft: spacing.sm,
  },
  listName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  listAccuracy: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Notice styles
  thresholdNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  thresholdText: {
    fontSize: 12,
    fontWeight: '500',
  },
  userThresholdNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.input,
  },
  userThresholdText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Locked rank styles
  lockedRank: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lockedRankText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },

  // Upgrade banner
  upgradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.card,
  },
  upgradeBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  upgradeBannerText: {
    flex: 1,
  },
  upgradeBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  upgradeBannerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
  upgradeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  upgradeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});
