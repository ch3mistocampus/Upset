/**
 * CommentInput - Input component for adding comments/replies
 * Designed to be used at the bottom of a screen with keyboard awareness
 */

import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { useCreateComment } from '../../hooks/usePosts';
import { useAuth } from '../../hooks/useAuth';

interface CommentInputProps {
  postId: string;
  replyTo?: {
    commentId: string;
    username: string;
  } | null;
  onCancelReply?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onAuthRequired?: () => void;
}

export function CommentInput({ postId, replyTo, onCancelReply, onFocus, onBlur, onAuthRequired }: CommentInputProps) {
  const { colors } = useTheme();
  const { isGuest, user } = useAuth();
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const createComment = useCreateComment();

  // Focus input when replying
  useEffect(() => {
    if (replyTo) {
      inputRef.current?.focus();
    }
  }, [replyTo]);

  const handleSubmit = async () => {
    if (!text.trim()) return;

    // Gate for guests
    if (isGuest || !user) {
      onAuthRequired?.();
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await createComment.mutateAsync({
        postId,
        body: text.trim(),
        parentId: replyTo?.commentId,
      });

      setText('');
      onCancelReply?.();
      inputRef.current?.blur();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleInputFocus = () => {
    // Gate for guests when they try to focus the input
    if (isGuest || !user) {
      inputRef.current?.blur();
      onAuthRequired?.();
      return;
    }
    onFocus?.();
  };

  const handleCancelReply = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCancelReply?.();
  };

  const isSubmitting = createComment.isPending;
  const canSubmit = text.trim().length > 0 && !isSubmitting;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      {/* Reply indicator */}
      {replyTo && (
        <View style={[styles.replyIndicator, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[styles.replyText, { color: colors.textSecondary }]}>
            Replying to <Text style={{ color: colors.accent }}>@{replyTo.username}</Text>
          </Text>
          <TouchableOpacity onPress={handleCancelReply} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input row */}
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              backgroundColor: colors.surfaceAlt,
              color: colors.text,
            },
          ]}
          placeholder={replyTo ? `Reply to @${replyTo.username}...` : 'Add a comment...'}
          placeholderTextColor={colors.textTertiary}
          value={text}
          onChangeText={setText}
          onFocus={handleInputFocus}
          onBlur={onBlur}
          multiline
          maxLength={2000}
          editable={!isSubmitting}
          returnKeyType="default"
          blurOnSubmit={false}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: canSubmit ? colors.accent : colors.surfaceAlt,
            },
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons
              name="send"
              size={18}
              color={canSubmit ? '#fff' : colors.textTertiary}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  replyText: {
    ...typography.meta,
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
