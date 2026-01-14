/**
 * EngagementRow - Twitter-style engagement actions for posts
 *
 * Horizontal row with Comment, Like, Share, and Bookmark buttons.
 * Uses icons with optional counts, styled like Twitter/X.
 */

import { View, TouchableOpacity, Text, StyleSheet, Share, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import { spacing, typography } from '../../lib/tokens';
import { useAuth } from '../../hooks/useAuth';

interface EngagementRowProps {
  commentCount: number;
  likeCount: number;
  userHasLiked: boolean;
  onCommentPress: () => void;
  onLikePress: () => void;
  shareContent?: {
    message: string;
    title?: string;
  };
  disabled?: boolean;
  /** Compact mode for X/Twitter-style feed rows */
  compact?: boolean;
  /** Called when guest tries to interact - parent should show auth modal */
  onAuthRequired?: () => void;
  /** Show loading indicator on like button */
  isLikeLoading?: boolean;
}

export function EngagementRow({
  commentCount,
  likeCount,
  userHasLiked,
  onCommentPress,
  onLikePress,
  shareContent,
  disabled = false,
  compact = false,
  onAuthRequired,
  isLikeLoading = false,
}: EngagementRowProps) {
  const { colors } = useTheme();
  const { isGuest, user } = useAuth();
  const iconSize = compact ? 16 : 18;

  const handleCommentPress = () => {
    if (disabled) return;
    if (isGuest || !user) {
      onAuthRequired?.();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCommentPress();
  };

  const handleLikePress = () => {
    if (disabled) return;
    if (isGuest || !user) {
      onAuthRequired?.();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLikePress();
  };

  const handleSharePress = async () => {
    if (disabled || !shareContent) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: shareContent.message,
        title: shareContent.title,
      });
    } catch {
      // User cancelled or error - silently ignore
    }
  };

  const formatCount = (count: number): string => {
    if (count === 0) return '';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {/* Comment */}
      <TouchableOpacity
        style={[styles.actionButton, compact && styles.actionButtonCompact]}
        onPress={handleCommentPress}
        disabled={disabled}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={`Comment on this post${commentCount > 0 ? `, ${commentCount} comments` : ''}`}
      >
        <Ionicons
          name="chatbubble-outline"
          size={iconSize}
          color={colors.textTertiary}
        />
        {commentCount > 0 && (
          <Text style={[styles.countText, compact && styles.countTextCompact, { color: colors.textTertiary }]}>
            {formatCount(commentCount)}
          </Text>
        )}
      </TouchableOpacity>

      {/* Like */}
      <TouchableOpacity
        style={[styles.actionButton, compact && styles.actionButtonCompact]}
        onPress={handleLikePress}
        disabled={disabled || isLikeLoading}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={userHasLiked ? 'Unlike this post' : 'Like this post'}
        accessibilityState={{ selected: userHasLiked }}
      >
        {isLikeLoading ? (
          <ActivityIndicator size="small" color={colors.textTertiary} style={{ width: iconSize, height: iconSize }} />
        ) : (
          <Ionicons
            name={userHasLiked ? 'heart' : 'heart-outline'}
            size={iconSize}
            color={userHasLiked ? colors.accent : colors.textTertiary}
          />
        )}
        {likeCount > 0 && (
          <Text
            style={[
              styles.countText,
              compact && styles.countTextCompact,
              { color: userHasLiked ? colors.accent : colors.textTertiary },
            ]}
          >
            {formatCount(likeCount)}
          </Text>
        )}
      </TouchableOpacity>

      {/* Share */}
      <TouchableOpacity
        style={[styles.actionButton, compact && styles.actionButtonCompact]}
        onPress={handleSharePress}
        disabled={disabled || !shareContent}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Share this post"
      >
        <Ionicons
          name="share-outline"
          size={iconSize}
          color={colors.textTertiary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingRight: spacing.xl,
  },
  containerCompact: {
    marginTop: spacing.xs,
    paddingRight: spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
    minWidth: 44,
  },
  actionButtonCompact: {
    minHeight: 28,
    minWidth: 40,
  },
  countText: {
    marginLeft: 4,
    fontSize: typography.meta.fontSize,
    fontWeight: typography.meta.fontWeight,
  },
  countTextCompact: {
    fontSize: 12,
  },
});
