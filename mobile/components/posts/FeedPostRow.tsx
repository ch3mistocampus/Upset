/**
 * FeedPostRow - Compact X/Twitter-style post row
 *
 * Replaces card-based posts with compact row layout:
 * - No card shadows or floating containers
 * - 36px avatar on left
 * - Compact header with truncation
 * - Tighter line heights
 * - Subtle pressed state
 * - Designed for divider-based separation
 */

import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import { spacing, typography } from '../../lib/tokens';
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
import { useToast } from '../../hooks/useToast';

interface FeedPostRowProps {
  post: Post;
  onPress?: () => void;
  showActions?: boolean;
}

function FeedPostRowComponent({ post, onPress, showActions = true }: FeedPostRowProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const toggleLike = useTogglePostLike();
  const toast = useToast();

  // Modal states
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isPressed, setIsPressed] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Subtle press animation
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Reset animation when post changes (handles FlatList recycling)
  useEffect(() => {
    opacityAnim.setValue(1);
    setIsPressed(false);
  }, [post.id, opacityAnim]);

  const handlePressIn = useCallback(() => {
    setIsPressed(true);
    Animated.timing(opacityAnim, {
      toValue: 0.96,
      duration: 50,
      useNativeDriver: true,
    }).start();
  }, [opacityAnim]);

  const handlePressOut = useCallback(() => {
    setIsPressed(false);
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [opacityAnim]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPress) {
      onPress();
    } else {
      router.push(`/post/${post.id}`);
    }
  }, [onPress, router, post.id]);

  const handleLikePress = useCallback(() => {
    toggleLike.mutate(post.id, {
      onError: (error: any) => {
        toast.showError(error?.message || 'Failed to update like');
      },
    });
  }, [toggleLike, post.id, toast]);

  const handleAuthorPress = useCallback(() => {
    if (post.user_id) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/user/${post.user_id}`);
    }
  }, [post.user_id, router]);

  const handleActionsPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowActionsMenu(true);
  }, []);

  const handleAuthRequired = useCallback(() => {
    setShowAuthModal(true);
  }, []);

  const isSystemPost = post.post_type === 'system';
  const displayName = isSystemPost
    ? 'Upset'
    : post.author_display_name || post.author_username || 'User';
  const username = isSystemPost ? 'upset' : post.author_username || 'user';
  const avatarUrl = isSystemPost ? null : post.author_avatar_url;

  // Build content text (unified title + body)
  const getContentText = useCallback(() => {
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
  }, [post, isSystemPost]);

  // Share content for external sharing with deeplink
  const shareContent = {
    message: `${post.title}${post.body ? '\n\n' + post.body : ''}\n\nhttps://getupset.app/post/${post.id}`,
    title: post.title,
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={`Post by ${displayName}: ${post.title}`}
    >
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: isPressed ? colors.surfaceAlt : 'transparent',
            opacity: opacityAnim,
          },
        ]}
      >
        {/* Main Row: Avatar + Content */}
        <View style={styles.mainRow}>
          {/* Avatar Column - 36px */}
          <Pressable
            onPress={handleAuthorPress}
            disabled={isSystemPost}
            style={styles.avatarColumn}
            accessibilityLabel={`View ${displayName}'s profile`}
          >
            {isSystemPost ? (
              <View style={[styles.systemAvatar, { backgroundColor: colors.accent }]}>
                <Ionicons name="flash" size={16} color="#fff" />
              </View>
            ) : (
              <Avatar
                imageUrl={avatarUrl}
                username={displayName}
                size="small"
              />
            )}
          </Pressable>

          {/* Content Column */}
          <View style={styles.contentColumn}>
            {/* Header Row - single line with truncation */}
            <View style={styles.headerRow}>
              <Pressable
                onPress={handleAuthorPress}
                disabled={isSystemPost}
                style={styles.headerInfo}
              >
                <Text
                  style={[styles.displayName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {displayName}
                </Text>
                <Text
                  style={[styles.headerMeta, { color: colors.textTertiary }]}
                  numberOfLines={1}
                >
                  @{username} · {formatRelativeTime(post.created_at)}
                  {post.is_edited && ' · edited'}
                </Text>
              </Pressable>

              {/* More Actions */}
              {showActions && !isSystemPost && (
                <Pressable
                  onPress={handleActionsPress}
                  style={styles.moreButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel="More options"
                >
                  <Ionicons name="ellipsis-horizontal" size={16} color={colors.textTertiary} />
                </Pressable>
              )}
            </View>

            {/* System Badge */}
            {isSystemPost && (
              <View style={[styles.systemBadge, { backgroundColor: colors.accentSoft }]}>
                <Text style={[styles.systemBadgeText, { color: colors.accent }]}>EVENT</Text>
              </View>
            )}

            {/* Content Text - tighter line height */}
            <Text
              style={[styles.contentText, { color: colors.text }]}
              numberOfLines={5}
            >
              {getContentText()}
            </Text>

            {/* Image Grid - clamped height */}
            {post.images && post.images.length > 0 && (
              <View style={styles.imageContainer}>
                <PostImageGrid
                  images={post.images}
                  compact
                  onImagePress={(index) => {
                    setSelectedImageIndex(index);
                    setShowImageViewer(true);
                  }}
                />
              </View>
            )}

            {/* Engagement Row - compact */}
            <EngagementRow
              commentCount={post.comment_count}
              likeCount={post.like_count}
              userHasLiked={post.user_has_liked}
              onCommentPress={handlePress}
              onLikePress={handleLikePress}
              shareContent={shareContent}
              disabled={toggleLike.isPending}
              onAuthRequired={handleAuthRequired}
              isLikeLoading={toggleLike.isPending}
              compact
            />
          </View>
        </View>
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  mainRow: {
    flexDirection: 'row',
  },
  avatarColumn: {
    width: 40,
    marginRight: spacing.sm,
    alignSelf: 'flex-start',
  },
  systemAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentColumn: {
    flex: 1,
    minWidth: 0, // Enables text truncation in flex children
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0, // Enables text truncation
  },
  displayName: {
    fontFamily: 'BebasNeue',
    fontSize: 16,
    letterSpacing: 0.3,
    flexShrink: 0, // Don't shrink display name
    maxWidth: '40%', // Limit width to allow room for meta
  },
  headerMeta: {
    fontSize: typography.meta.fontSize,
    fontWeight: typography.meta.fontWeight,
    marginLeft: 4,
    flexShrink: 1,
  },
  moreButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  systemBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  systemBadgeText: {
    fontFamily: 'BebasNeue',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  contentText: {
    fontSize: typography.body.fontSize,
    fontWeight: typography.body.fontWeight,
    lineHeight: 20, // Tighter than card (was 22)
  },
  imageContainer: {
    marginTop: spacing.xs,
  },
});

// Memoized export to prevent unnecessary re-renders
export const FeedPostRow = memo(FeedPostRowComponent, (prev, next) => {
  const prevPost = prev.post;
  const nextPost = next.post;
  return (
    prevPost.id === nextPost.id &&
    prevPost.like_count === nextPost.like_count &&
    prevPost.comment_count === nextPost.comment_count &&
    prevPost.user_has_liked === nextPost.user_has_liked &&
    prevPost.is_edited === nextPost.is_edited &&
    prev.showActions === next.showActions
  );
});
