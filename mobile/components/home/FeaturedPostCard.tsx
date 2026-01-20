/**
 * FeaturedPostCard - Premium featured post surface for home screen
 * Shows trending discussion with quote, author, and engagement metrics
 */

import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import { spacing, radius } from '../../lib/tokens';
import { Post } from '../../types/posts';
import { generateAvatarUrl } from '../Avatar';

interface FeaturedPostCardProps {
  post: Post;
  onPress?: () => void;
}

export function FeaturedPostCard({ post, onPress }: FeaturedPostCardProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  // Determine if post is "hot" based on engagement
  const isHot = post.like_count >= 10 || post.comment_count >= 20;

  return (
    <View style={styles.container}>
      {/* Section Label */}
      <Text style={[styles.label, { color: colors.textTertiary }]}>FEATURED</Text>

      {/* Card Surface */}
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.92}
      >
        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={3}>
          {post.title}
        </Text>

        {/* Body Preview (if exists) */}
        {post.body && (
          <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={2}>
            {post.body}
          </Text>
        )}

        {/* Meta Row */}
        <View style={styles.metaRow}>
          {/* Author Avatar */}
          <Image
            source={{ uri: post.author_avatar_url || generateAvatarUrl(post.author_username || 'user', 44) }}
            style={styles.avatar}
          />

          {/* Username */}
          <Text style={[styles.username, { color: colors.textSecondary }]}>
            {post.author_username || 'Anonymous'}
          </Text>

          <Text style={[styles.dot, { color: colors.textTertiary }]}>•</Text>

          {/* Engagement */}
          <View style={styles.engagementRow}>
            <Ionicons name="heart" size={12} color={colors.textTertiary} />
            <Text style={[styles.engagementText, { color: colors.textTertiary }]}>
              {post.like_count}
            </Text>
          </View>

          <View style={styles.engagementRow}>
            <Ionicons name="chatbubble" size={12} color={colors.textTertiary} />
            <Text style={[styles.engagementText, { color: colors.textTertiary }]}>
              {post.comment_count}
            </Text>
          </View>

          {/* Hot Badge */}
          {isHot && (
            <>
              <Text style={[styles.dot, { color: colors.textTertiary }]}>•</Text>
              <View style={[styles.hotBadge, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="flame" size={10} color={colors.accent} />
                <Text style={[styles.hotText, { color: colors.accent }]}>HOT</Text>
              </View>
            </>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  username: {
    fontSize: 13,
    fontWeight: '600',
  },
  dot: {
    fontSize: 13,
  },
  engagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  engagementText: {
    fontSize: 12,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  hotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  hotText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
