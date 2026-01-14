/**
 * EditPostModal - Modal for editing posts
 */

import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { useUpdatePost } from '../../hooks/usePostEdit';
import { useToast } from '../../hooks/useToast';

const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 5000;

interface EditPostModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  initialTitle: string;
  initialBody: string | null;
}

export function EditPostModal({
  visible,
  onClose,
  postId,
  initialTitle,
  initialBody,
}: EditPostModalProps) {
  const { colors } = useTheme();
  const toast = useToast();
  const updatePost = useUpdatePost();

  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody || '');

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setTitle(initialTitle);
      setBody(initialBody || '');
    }
  }, [visible, initialTitle, initialBody]);

  const hasChanges = title !== initialTitle || body !== (initialBody || '');
  const canSubmit = title.trim().length > 0 && hasChanges && !updatePost.isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (trimmedTitle.length === 0) {
      toast.showError('Title is required');
      return;
    }

    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      toast.showError(`Title must be ${MAX_TITLE_LENGTH} characters or less`);
      return;
    }

    if (trimmedBody.length > MAX_BODY_LENGTH) {
      toast.showError(`Body must be ${MAX_BODY_LENGTH} characters or less`);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await updatePost.mutateAsync({
        postId,
        title: trimmedTitle,
        body: trimmedBody || undefined,
      });

      toast.showSuccess('Post updated');
      onClose();
    } catch (error: any) {
      toast.showError(error.message || 'Failed to update post');
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      // Could show confirmation dialog here
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>Edit Post</Text>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={[
                styles.saveButton,
                { backgroundColor: canSubmit ? colors.accent : colors.surfaceAlt },
              ]}
            >
              {updatePost.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  style={[
                    styles.saveButtonText,
                    { color: canSubmit ? '#fff' : colors.textTertiary },
                  ]}
                >
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentInner}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Title</Text>
              <TextInput
                style={[styles.titleInput, { color: colors.text, borderColor: colors.border }]}
                value={title}
                onChangeText={setTitle}
                maxLength={MAX_TITLE_LENGTH}
                multiline
                autoFocus
              />
              <Text style={[styles.charCount, { color: colors.textTertiary }]}>
                {title.length}/{MAX_TITLE_LENGTH}
              </Text>
            </View>

            {/* Body Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Body (optional)
              </Text>
              <TextInput
                style={[
                  styles.bodyInput,
                  { color: colors.text, borderColor: colors.border },
                ]}
                value={body}
                onChangeText={setBody}
                maxLength={MAX_BODY_LENGTH}
                multiline
                textAlignVertical="top"
              />
              {body.length > 0 && (
                <Text style={[styles.charCount, { color: colors.textTertiary }]}>
                  {body.length}/{MAX_BODY_LENGTH}
                </Text>
              )}
            </View>

            {/* Edit Notice */}
            <View style={[styles.notice, { backgroundColor: colors.surfaceAlt }]}>
              <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
                Edited posts will be marked as "edited" and the edit history will be visible.
              </Text>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: spacing.xs,
  },
  title: {
    fontFamily: 'BebasNeue',
    fontSize: 22,
    letterSpacing: 0.3,
  },
  saveButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonText: {
    fontFamily: 'BebasNeue',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: spacing.md,
    paddingBottom: 34,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontFamily: 'BebasNeue',
    fontSize: 14,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  titleInput: {
    ...typography.h3,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.card,
    minHeight: 60,
  },
  bodyInput: {
    ...typography.body,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.card,
    minHeight: 150,
    lineHeight: 24,
  },
  charCount: {
    ...typography.meta,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: radius.card,
    gap: spacing.sm,
  },
  noticeText: {
    ...typography.meta,
    flex: 1,
    lineHeight: 20,
  },
});
