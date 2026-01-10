/**
 * PostCard - Twitter/X style post card
 *
 * Layout: Avatar on left, content flows right
 * - Author row: Display name · @username · time · menu
 * - Unified text content (title + body merged)
 * - Image grid for multiple images
 * - Engagement row: Comment, Like, Share, Bookmark
 */

import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
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
import { EngagementRow } from './EngagementRow';
import { PostImageGrid } from './PostImageGrid';
import { ImageViewer } from '../ImageViewer';
import { AuthPromptModal } from '../AuthPromptModal';

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
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Press animation
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Reset animation when post changes (handles FlatList recycling)
  useEffect(() => {
    scaleAnim.setValue(1);
    opacityAnim.setValue(1);
  }, [post.id, scaleAnim, opacityAnim]);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.985,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.94,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
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

  const handleAuthRequired = () => {
    setShowAuthModal(true);
  };

  const isSystemPost = post.post_type === 'system';
  const displayName = isSystemPost
    ? 'UFC Picks'
    : post.author_display_name || post.author_username || 'User';
  const username = isSystemPost ? 'ufcpicks' : post.author_username || 'user';
  const avatarUrl = isSystemPost ? null : post.author_avatar_url;

  // Build content text (unified title + body)
  const getContentText = () => {
    let content = post.title;

    // Add event/fighter context for system posts
    if (isSystemPost && post.fighter_a_name && post.fighter_b_name) {
      content += `\n${post.fighter_a_name} vs ${post.fighter_b_name}`;
    } else if (post.event_name) {
      content += `\n${post.event_name}`;
    }

    // Add body if present
    if (post.body) {
      content += `\n\n${post.body}`;
    }

    return content;
  };

  // Share content for external sharing
  const shareContent = {
    message: `${post.title}${post.body ? '\n\n' + post.body : ''}\n\n- via UFC Picks`,
    title: post.title,
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityLabel={`Post by ${displayName}: ${post.title}`}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}>
        <SurfaceCard weakWash style={styles.card}>
          {/* Main Row: Avatar + Content */}
          <View style={styles.mainRow}>
            {/* Avatar Column */}
            <TouchableOpacity
              onPress={handleAuthorPress}
              disabled={isSystemPost}
              style={styles.avatarColumn}
              accessibilityLabel={`View ${displayName}'s profile`}
            >
              {isSystemPost ? (
                <View style={[styles.systemAvatar, { backgroundColor: colors.accent }]}>
                  <Ionicons name="flash" size={18} color="#fff" />
                </View>
              ) : (
                <Avatar
                  imageUrl={avatarUrl}
                  username={displayName}
                  size="small"
                />
              )}
            </TouchableOpacity>

            {/* Content Column */}
            <View style={styles.contentColumn}>
              {/* Author Row */}
              <View style={styles.authorRow}>
                <TouchableOpacity
                  onPress={handleAuthorPress}
                  disabled={isSystemPost}
                  style={styles.authorInfo}
                >
                  <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <Text style={[styles.username, { color: colors.textSecondary }]} numberOfLines={1}>
                    {' '}@{username}
                  </Text>
                  <Text style={[styles.separator, { color: colors.textTertiary }]}> · </Text>
                  <Text style={[styles.timestamp, { color: colors.textTertiary }]}>
                    {formatRelativeTime(post.created_at)}
                  </Text>
                  {post.is_edited && (
                    <Text style={[styles.timestamp, { color: colors.textTertiary }]}> · edited</Text>
                  )}
                </TouchableOpacity>

                {/* More Actions */}
                {showActions && !isSystemPost && (
                  <TouchableOpacity
                    onPress={handleActionsPress}
                    style={styles.moreButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityLabel="More options"
                  >
                    <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* System Badge */}
              {isSystemPost && (
                <View style={[styles.systemBadge, { backgroundColor: colors.accentSoft }]}>
                  <Text style={[styles.systemBadgeText, { color: colors.accent }]}>EVENT</Text>
                </View>
              )}

              {/* Content Text */}
              <Text style={[styles.contentText, { color: colors.text }]} numberOfLines={6}>
                {getContentText()}
              </Text>

              {/* Image Grid */}
              {post.images && post.images.length > 0 && (
                <PostImageGrid
                  images={post.images}
                  onImagePress={(index) => {
                    setSelectedImageIndex(index);
                    setShowImageViewer(true);
                  }}
                />
              )}

              {/* Engagement Row */}
              <EngagementRow
                commentCount={post.comment_count}
                likeCount={post.like_count}
                userHasLiked={post.user_has_liked}
                onCommentPress={handlePress}
                onLikePress={handleLikePress}
                shareContent={shareContent}
                disabled={toggleLike.isPending}
                onAuthRequired={handleAuthRequired}
              />
            </View>
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
        onAuthRequired={handleAuthRequired}
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

      {/* Image Viewer */}
      {post.images && post.images.length > 0 && (
        <ImageViewer
          visible={showImageViewer}
          images={post.images.map((img) => img.image_url)}
          initialIndex={selectedImageIndex}
          onClose={() => setShowImageViewer(false)}
        />
      )}

      {/* Auth Prompt for Guests */}
      <AuthPromptModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSignIn={() => {
          setShowAuthModal(false);
          router.push('/(auth)/sign-in');
        }}
        context="social"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 0,
  },
  mainRow: {
    flexDirection: 'row',
  },
  avatarColumn: {
    width: 44,
    marginRight: spacing.sm,
    alignSelf: 'flex-start',
  },
  systemAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentColumn: {
    flex: 1,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  displayName: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  username: {
    fontSize: typography.meta.fontSize,
    fontWeight: typography.meta.fontWeight,
  },
  separator: {
    fontSize: typography.meta.fontSize,
  },
  timestamp: {
    fontSize: typography.meta.fontSize,
    fontWeight: typography.meta.fontWeight,
  },
  moreButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  systemBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  systemBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  contentText: {
    fontSize: typography.body.fontSize,
    fontWeight: typography.body.fontWeight,
    lineHeight: 22,
  },
});
