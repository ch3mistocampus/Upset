/**
 * Post Detail Screen
 * Shows full post with threaded comments and interaction options
 */

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState, useCallback, useRef } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../lib/theme';
import { spacing, radius, typography } from '../../../lib/tokens';
import { usePostWithComments, buildCommentTree, formatRelativeTime } from '../../../hooks/usePosts';
import { useTogglePostLike } from '../../../hooks/usePostLikes';
import { Avatar } from '../../../components/Avatar';
import { CommentItem, CommentInput, PostActionsMenu, ReportModal, EditPostModal, PostImageGrid, EngagementRow } from '../../../components/posts';
import { EmptyState } from '../../../components/EmptyState';
import { ImageViewer } from '../../../components/ImageViewer';
import { useAuth } from '../../../hooks/useAuth';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data, isLoading, isRefetching, refetch, error } = usePostWithComments(id);
  const toggleLike = useTogglePostLike();
  const scrollViewRef = useRef<ScrollView>(null);

  const [replyTo, setReplyTo] = useState<{ commentId: string; username: string } | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const post = data?.post;
  const comments = data?.comments ?? [];
  const commentTree = buildCommentTree(comments);

  const handleLikePress = () => {
    if (!post) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleLike.mutate(post.id);
  };

  const handleReply = useCallback((commentId: string, username: string) => {
    setReplyTo({ commentId, username });
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyTo(null);
  }, []);

  const handleAuthorPress = () => {
    if (post?.user_id) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/user/${post.user_id}`);
    }
  };

  const handleActionsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowActionsMenu(true);
  };

  const handleInputFocus = useCallback(() => {
    // Scroll to bottom when input is focused to show recent comments
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 300);
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Post',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
          }}
        />
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading post...
        </Text>
      </View>
    );
  }

  if (error || !post) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Post',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
          }}
        />
        <EmptyState
          icon="alert-circle-outline"
          title="Post not found"
          message="This post may have been deleted or is no longer available."
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  const isSystemPost = post.post_type === 'system';
  const authorName = isSystemPost
    ? 'UFC Picks'
    : post.author_display_name || post.author_username || 'Unknown';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () =>
            !isSystemPost ? (
              <TouchableOpacity onPress={handleActionsPress} style={styles.headerButton}>
                <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
              </TouchableOpacity>
            ) : null,
        }}
      />

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.md }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.accent}
          />
        }
      >
        {/* Post - Twitter-style layout */}
        <View style={styles.postContainer}>
          {/* Avatar Column */}
          <TouchableOpacity
            onPress={handleAuthorPress}
            disabled={isSystemPost}
            style={styles.avatarColumn}
            accessibilityLabel={`View ${authorName}'s profile`}
          >
            {isSystemPost ? (
              <View style={[styles.systemAvatar, { backgroundColor: colors.accent }]}>
                <Ionicons name="flash" size={24} color="#fff" />
              </View>
            ) : (
              <Avatar
                imageUrl={post.author_avatar_url}
                username={authorName}
                size="medium"
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
                  {authorName}
                </Text>
                {!isSystemPost && (
                  <Text style={[styles.username, { color: colors.textSecondary }]} numberOfLines={1}>
                    {' '}@{post.author_username || 'user'}
                  </Text>
                )}
                <Text style={[styles.separator, { color: colors.textTertiary }]}> · </Text>
                <Text style={[styles.timestamp, { color: colors.textTertiary }]}>
                  {formatRelativeTime(post.created_at)}
                </Text>
                {post.is_edited && (
                  <Text style={[styles.timestamp, { color: colors.textTertiary }]}> · edited</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* System Badge */}
            {isSystemPost && (
              <View style={[styles.systemBadge, { backgroundColor: colors.accentSoft }]}>
                <Text style={[styles.systemBadgeText, { color: colors.accent }]}>EVENT</Text>
              </View>
            )}

            {/* Content Text */}
            <Text style={[styles.contentText, { color: colors.text }]}>
              {post.title}
              {post.fighter_a_name && post.fighter_b_name && (
                `\n${post.fighter_a_name} vs ${post.fighter_b_name}`
              )}
              {post.event_name && !post.fighter_a_name && `\n${post.event_name}`}
              {post.body && `\n\n${post.body}`}
            </Text>

            {/* Images */}
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
              onCommentPress={() => {}}
              onLikePress={handleLikePress}
              shareContent={{
                message: `${post.title}${post.body ? '\n\n' + post.body : ''}\n\n- via UFC Picks`,
                title: post.title,
              }}
              disabled={toggleLike.isPending}
            />
          </View>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={[styles.commentsHeader, { color: colors.text }]}>Comments</Text>

          {commentTree.length === 0 ? (
            <View style={styles.noComments}>
              <Text style={[styles.noCommentsText, { color: colors.textTertiary }]}>
                No comments yet. Be the first to share your thoughts!
              </Text>
            </View>
          ) : (
            commentTree.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                postId={post.id}
                onReply={handleReply}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Comment Input - Fixed at bottom */}
      <View style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.sm }}>
        <CommentInput
          postId={post.id}
          replyTo={replyTo}
          onCancelReply={handleCancelReply}
          onFocus={handleInputFocus}
        />
      </View>

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

      {/* Image Viewer */}
      {post.images && post.images.length > 0 && (
        <ImageViewer
          visible={showImageViewer}
          images={post.images.map((img) => img.image_url)}
          initialIndex={selectedImageIndex}
          onClose={() => setShowImageViewer(false)}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  headerButton: {
    padding: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
  },
  postContainer: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
  },
  avatarColumn: {
    width: 56,
    marginRight: spacing.md,
    alignSelf: 'flex-start',
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
  systemAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
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
    lineHeight: 24,
  },
  commentsSection: {
    paddingBottom: spacing.md,
  },
  commentsHeader: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  noComments: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  noCommentsText: {
    ...typography.body,
    textAlign: 'center',
  },
});
