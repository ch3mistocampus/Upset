/**
 * CommentItem - Displays a single comment with nested replies
 * Supports threaded comments up to 3 levels deep
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { Avatar } from '../Avatar';
import { CommentWithReplies } from '../../types/posts';
import { formatRelativeTime } from '../../hooks/usePosts';
import { useToggleCommentLike } from '../../hooks/usePostLikes';

interface CommentItemProps {
  comment: CommentWithReplies;
  postId: string;
  onReply: (commentId: string, username: string) => void;
  depth?: number;
}

const MAX_DEPTH = 3;

export function CommentItem({ comment, postId, onReply, depth = 0 }: CommentItemProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const toggleLike = useToggleCommentLike();

  const authorName = comment.author_display_name || comment.author_username || 'Unknown';
  const canReply = depth < MAX_DEPTH;

  const handleAuthorPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/user/${comment.user_id}`);
  };

  const handleLikePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleLike.mutate({ commentId: comment.id, postId });
  };

  const handleReplyPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReply(comment.id, comment.author_username);
  };

  // Calculate indent based on depth - each level indents by 20px
  const INDENT_SIZE = 20;
  const indentStyle = depth > 0 ? { marginLeft: INDENT_SIZE } : {};

  return (
    <View style={[styles.container, indentStyle]}>
      {/* Thread indicator for replies */}
      {depth > 0 && (
        <View
          style={[
            styles.threadLine,
            {
              backgroundColor: colors.border,
              left: -INDENT_SIZE / 2 + 1, // Position line at half the indent
            }
          ]}
        />
      )}

      <View style={styles.commentContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleAuthorPress} style={styles.authorRow}>
            <Avatar
              imageUrl={comment.author_avatar_url}
              username={authorName}
              size="small"
            />
            <View style={styles.authorInfo}>
              <Text style={[styles.authorName, { color: colors.text }]} numberOfLines={1}>
                {authorName}
              </Text>
              <Text style={[styles.timestamp, { color: colors.textTertiary }]}>
                {formatRelativeTime(comment.created_at)}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Body */}
        <Text style={[styles.body, { color: colors.text }]}>{comment.body}</Text>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleLikePress}
            disabled={toggleLike.isPending}
          >
            <Ionicons
              name={comment.user_has_liked ? 'heart' : 'heart-outline'}
              size={16}
              color={comment.user_has_liked ? colors.accent : colors.textTertiary}
            />
            {comment.like_count > 0 && (
              <Text
                style={[
                  styles.actionText,
                  { color: comment.user_has_liked ? colors.accent : colors.textTertiary },
                ]}
              >
                {comment.like_count}
              </Text>
            )}
          </TouchableOpacity>

          {canReply && (
            <TouchableOpacity style={styles.actionButton} onPress={handleReplyPress}>
              <Ionicons name="chatbubble-outline" size={14} color={colors.textTertiary} />
              <Text style={[styles.actionText, { color: colors.textTertiary }]}>Reply</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <View style={styles.replies}>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  threadLine: {
    position: 'absolute',
    top: 12,
    bottom: 12,
    width: 2,
    borderRadius: 1,
  },
  commentContent: {
    paddingLeft: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorInfo: {
    marginLeft: spacing.sm,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  authorName: {
    fontFamily: 'BebasNeue',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  timestamp: {
    ...typography.meta,
    fontSize: 12,
  },
  body: {
    ...typography.body,
    lineHeight: 20,
    marginLeft: 48, // Avatar width (40) + margin (8)
    marginBottom: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 48,
    gap: spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
  },
  actionText: {
    fontFamily: 'BebasNeue',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  replies: {
    marginTop: spacing.sm,
  },
});
