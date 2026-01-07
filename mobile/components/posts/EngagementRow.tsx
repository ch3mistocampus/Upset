/**
 * EngagementRow - Twitter-style engagement actions for posts
 *
 * Horizontal row with Comment, Like, Share, and Bookmark buttons.
 * Uses icons with optional counts, styled like Twitter/X.
 */

import { View, TouchableOpacity, Text, StyleSheet, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import { spacing, typography } from '../../lib/tokens';

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
}

export function EngagementRow({
  commentCount,
  likeCount,
  userHasLiked,
  onCommentPress,
  onLikePress,
  shareContent,
  disabled = false,
}: EngagementRowProps) {
  const { colors } = useTheme();

  const handleCommentPress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCommentPress();
  };

  const handleLikePress = () => {
    if (disabled) return;
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
    <View style={styles.container}>
      {/* Comment */}
      <TouchableOpacity
        style={styles.actionButton}
        onPress={handleCommentPress}
        disabled={disabled}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={`Comment on this post${commentCount > 0 ? `, ${commentCount} comments` : ''}`}
      >
        <Ionicons
          name="chatbubble-outline"
          size={18}
          color={colors.textTertiary}
        />
        {commentCount > 0 && (
          <Text style={[styles.countText, { color: colors.textTertiary }]}>
            {formatCount(commentCount)}
          </Text>
        )}
      </TouchableOpacity>

      {/* Like */}
      <TouchableOpacity
        style={styles.actionButton}
        onPress={handleLikePress}
        disabled={disabled}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={userHasLiked ? 'Unlike this post' : 'Like this post'}
        accessibilityState={{ selected: userHasLiked }}
      >
        <Ionicons
          name={userHasLiked ? 'heart' : 'heart-outline'}
          size={18}
          color={userHasLiked ? colors.accent : colors.textTertiary}
        />
        {likeCount > 0 && (
          <Text
            style={[
              styles.countText,
              { color: userHasLiked ? colors.accent : colors.textTertiary },
            ]}
          >
            {formatCount(likeCount)}
          </Text>
        )}
      </TouchableOpacity>

      {/* Share */}
      <TouchableOpacity
        style={styles.actionButton}
        onPress={handleSharePress}
        disabled={disabled || !shareContent}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Share this post"
      >
        <Ionicons
          name="share-outline"
          size={18}
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
    minWidth: 44,
  },
  countText: {
    marginLeft: 4,
    fontSize: typography.meta.fontSize,
    fontWeight: typography.meta.fontWeight,
  },
});
