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
  Image,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
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
import { CommentItem, CommentInput } from '../../../components/posts';
import { EmptyState } from '../../../components/EmptyState';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isRefetching, refetch, error } = usePostWithComments(id);
  const toggleLike = useTogglePostLike();
  const scrollViewRef = useRef<ScrollView>(null);

  const [replyTo, setReplyTo] = useState<{ commentId: string; username: string } | null>(null);

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
        {/* Post Header */}
        <View style={styles.postHeader}>
          <TouchableOpacity
            onPress={handleAuthorPress}
            disabled={isSystemPost}
            style={styles.authorRow}
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
            <View style={styles.authorInfo}>
              <Text style={[styles.authorName, { color: colors.text }]}>{authorName}</Text>
              <Text style={[styles.timestamp, { color: colors.textTertiary }]}>
                {formatRelativeTime(post.created_at)}
              </Text>
            </View>
          </TouchableOpacity>

          {isSystemPost && (
            <View style={[styles.systemBadge, { backgroundColor: colors.accentSoft }]}>
              <Text style={[styles.systemBadgeText, { color: colors.accent }]}>EVENT</Text>
            </View>
          )}
        </View>

        {/* Post Content */}
        <View style={styles.postContent}>
          <Text style={[styles.title, { color: colors.text }]}>{post.title}</Text>

          {post.fighter_a_name && post.fighter_b_name && (
            <Text style={[styles.matchup, { color: colors.textSecondary }]}>
              {post.fighter_a_name} vs {post.fighter_b_name}
            </Text>
          )}

          {post.event_name && (
            <View style={styles.eventRow}>
              <Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
              <Text style={[styles.eventName, { color: colors.textTertiary }]}>
                {post.event_name}
              </Text>
            </View>
          )}

          {post.body && (
            <Text style={[styles.body, { color: colors.text }]}>{post.body}</Text>
          )}
        </View>

        {/* Images */}
        {post.images && post.images.length > 0 && (
          <View style={styles.imagesContainer}>
            {post.images.map((image) => (
              <Image
                key={image.id}
                source={{ uri: image.image_url }}
                style={[styles.image, { backgroundColor: colors.surfaceAlt }]}
                resizeMode="cover"
              />
            ))}
          </View>
        )}

        {/* Engagement Stats */}
        <View style={[styles.engagementBar, { borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.engagementButton}
            onPress={handleLikePress}
            disabled={toggleLike.isPending}
          >
            <Ionicons
              name={post.user_has_liked ? 'heart' : 'heart-outline'}
              size={24}
              color={post.user_has_liked ? colors.accent : colors.textSecondary}
            />
            <Text
              style={[
                styles.engagementCount,
                { color: post.user_has_liked ? colors.accent : colors.textSecondary },
              ]}
            >
              {post.like_count} {post.like_count === 1 ? 'like' : 'likes'}
            </Text>
          </TouchableOpacity>

          <View style={styles.engagementButton}>
            <Ionicons name="chatbubble-outline" size={22} color={colors.textSecondary} />
            <Text style={[styles.engagementCount, { color: colors.textSecondary }]}>
              {post.comment_count} {post.comment_count === 1 ? 'comment' : 'comments'}
            </Text>
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
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  systemAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  authorName: {
    ...typography.h3,
  },
  timestamp: {
    ...typography.meta,
    marginTop: 2,
  },
  systemBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  systemBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  postContent: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },
  matchup: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  eventName: {
    ...typography.meta,
  },
  body: {
    ...typography.body,
    lineHeight: 24,
    marginTop: spacing.sm,
  },
  imagesContainer: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: radius.card,
  },
  engagementBar: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: spacing.lg,
  },
  engagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.xl,
  },
  engagementCount: {
    ...typography.body,
    marginLeft: spacing.sm,
    fontWeight: '500',
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
