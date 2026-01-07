/**
 * PostActionsMenu - Bottom sheet menu for post actions
 * Share, Edit (own posts), Report, Delete (own posts)
 */

import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { useDeletePost } from '../../hooks/usePosts';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { Post } from '../../types/posts';

interface PostActionsMenuProps {
  visible: boolean;
  onClose: () => void;
  post: Post;
  onEdit?: () => void;
  onReport?: () => void;
}

export function PostActionsMenu({
  visible,
  onClose,
  post,
  onEdit,
  onReport,
}: PostActionsMenuProps) {
  const { colors } = useTheme();
  const toast = useToast();
  const { user } = useAuth();
  const deletePost = useDeletePost();

  const isOwnPost = user?.id === post.user_id;
  const isSystemPost = post.post_type === 'system';

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();

    try {
      await Share.share({
        message: `Check out this post: "${post.title}"`,
      });
    } catch {
      // User cancelled or error occurred
    }
  };

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    onEdit?.();
  };

  const handleReport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    onReport?.();
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();

    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePost.mutateAsync(post.id);
              toast.showNeutral('Post deleted');
            } catch (error: any) {
              toast.showError(error.message || 'Failed to delete post');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Share */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Ionicons name="share-outline" size={22} color={colors.text} />
            <Text style={[styles.menuItemText, { color: colors.text }]}>Share</Text>
          </TouchableOpacity>

          {/* Edit (own posts only, not system posts) */}
          {isOwnPost && !isSystemPost && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleEdit}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil-outline" size={22} color={colors.text} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>Edit Post</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Report (not own posts) */}
          {!isOwnPost && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleReport}
                activeOpacity={0.7}
              >
                <Ionicons name="flag-outline" size={22} color={colors.warning} />
                <Text style={[styles.menuItemText, { color: colors.warning }]}>
                  Report Post
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Delete (own posts only) */}
          {isOwnPost && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleDelete}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={22} color={colors.danger} />
                <Text style={[styles.menuItemText, { color: colors.danger }]}>
                  Delete Post
                </Text>
              </TouchableOpacity>
            </>
          )}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Cancel */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close-outline" size={22} color={colors.textSecondary} />
            <Text style={[styles.menuItemText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.md,
    paddingBottom: 34,
    paddingHorizontal: spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  menuItemText: {
    ...typography.body,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginHorizontal: -spacing.md,
  },
});
