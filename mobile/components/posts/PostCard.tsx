/**
 * PostCard - Displays a post in the feed
 * Shows author, content, images, engagement stats
 */

import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { useRef, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { SurfaceCard } from '../ui';
import { Avatar } from '../Avatar';
import { Post } from '../../types/posts';
import { formatRelativeTime } from '../../hooks/usePosts';
import { useTogglePostLike } from '../../hooks/usePostLikes';
import { PostActionsMenu } from './PostActionsMenu';
import { ReportModal } from './ReportModal';
import { EditPostModal } from './EditPostModal';

interface PostCardProps {
  post: Post;
  onPress?: () => void;
  showActions?: boolean;
}

export function PostCard({ post, onPress, showActions = true }: PostCardProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const toggleLike = useTogglePostLike();

  // Modal states
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Press animation - use ref to persist across renders
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Reset animation when post changes (handles FlatList recycling)
  useEffect(() => {
    scaleAnim.setValue(1);
  }, [post.id, scaleAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPress) {
      onPress();
    } else {
      router.push(`/post/${post.id}`);
    }
  };

  const handleLikePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleLike.mutate(post.id);
  };

  const handleAuthorPress = () => {
    if (post.user_id) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/user/${post.user_id}`);
    }
  };

  const handleActionsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowActionsMenu(true);
  };

  const isSystemPost = post.post_type === 'system';
  const authorName = isSystemPost
    ? 'UFC Picks'
    : post.author_display_name || post.author_username || 'Unknown';

  // Get subtitle for system posts (fight matchup)
  const getSubtitle = () => {
    if (isSystemPost && post.fighter_a_name && post.fighter_b_name) {
      return `${post.fighter_a_name} vs ${post.fighter_b_name}`;
    }
    if (post.event_name) {
      return post.event_name;
    }
    return null;
  };

  const subtitle = getSubtitle();

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <SurfaceCard weakWash style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleAuthorPress}
              disabled={isSystemPost}
              style={styles.authorRow}
            >
              {isSystemPost ? (
                <View style={[styles.systemAvatar, { backgroundColor: colors.accent }]}>
                  <Ionicons name="flash" size={18} color="#fff" />
                </View>
              ) : (
                <Avatar
                  imageUrl={post.author_avatar_url}
                  username={authorName}
                  size="small"
                />
              )}
              <View style={styles.authorInfo}>
                <Text style={[styles.authorName, { color: colors.text }]} numberOfLines={1}>
                  {authorName}
                </Text>
                <View style={styles.timestampRow}>
                  <Text style={[styles.timestamp, { color: colors.textTertiary }]}>
                    {formatRelativeTime(post.created_at)}
                  </Text>
                  {post.is_edited && (
                    <Text style={[styles.editedLabel, { color: colors.textTertiary }]}>
                      {' · edited'}
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.headerRight}>
              {isSystemPost && (
                <View style={[styles.systemBadge, { backgroundColor: colors.accentSoft }]}>
                  <Text style={[styles.systemBadgeText, { color: colors.accent }]}>EVENT</Text>
                </View>
              )}

              {showActions && !isSystemPost && (
                <TouchableOpacity
                  onPress={handleActionsPress}
                  style={styles.actionButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
              {post.title}
            </Text>
            {subtitle && (
              <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
            {post.body && (
              <Text
                style={[styles.body, { color: colors.textSecondary }]}
                numberOfLines={3}
              >
                {post.body}
              </Text>
            )}
          </View>

          {/* Images */}
          {post.images && post.images.length > 0 && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: post.images[0].image_url }}
                style={[styles.image, { backgroundColor: colors.surfaceAlt }]}
                resizeMode="cover"
              />
              {post.images.length > 1 && (
                <View style={[styles.moreImages, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                  <Text style={styles.moreImagesText}>+{post.images.length - 1}</Text>
                </View>
              )}
            </View>
          )}

          {/* Footer - Engagement */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={styles.engagementButton}
              onPress={handleLikePress}
              disabled={toggleLike.isPending}
            >
              <Ionicons
                name={post.user_has_liked ? 'heart' : 'heart-outline'}
                size={20}
                color={post.user_has_liked ? colors.accent : colors.textSecondary}
              />
              <Text
                style={[
                  styles.engagementCount,
                  { color: post.user_has_liked ? colors.accent : colors.textSecondary },
                ]}
              >
                {post.like_count}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.engagementButton} onPress={handlePress}>
              <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.engagementCount, { color: colors.textSecondary }]}>
                {post.comment_count}
              </Text>
            </TouchableOpacity>

            <View style={styles.spacer} />

            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </View>
        </SurfaceCard>
      </Animated.View>

      {/* Action Modals */}
      <PostActionsMenu
        visible={showActionsMenu}
        onClose={() => setShowActionsMenu(false)}
        post={post}
        onEdit={() => setShowEditModal(true)}
        onReport={() => setShowReportModal(true)}
      />

      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        type="post"
        targetId={post.id}
      />

      <EditPostModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        postId={post.id}
        initialTitle={post.title}
        initialBody={post.body}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  systemAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorInfo: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  authorName: {
    ...typography.body,
    fontWeight: '600',
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  timestamp: {
    ...typography.meta,
  },
  editedLabel: {
    ...typography.meta,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  systemBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  systemBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  actionButton: {
    padding: spacing.xs,
  },
  content: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    marginBottom: spacing.xs,
  },
  body: {
    ...typography.body,
    lineHeight: 22,
  },
  imageContainer: {
    marginBottom: spacing.md,
    borderRadius: radius.card,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: radius.card,
  },
  moreImages: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  moreImagesText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  engagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.lg,
    paddingVertical: spacing.xs,
  },
  engagementCount: {
    ...typography.meta,
    marginLeft: spacing.xs,
    fontWeight: '600',
  },
  spacer: {
    flex: 1,
  },
});
