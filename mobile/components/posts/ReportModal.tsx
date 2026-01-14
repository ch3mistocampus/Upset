/**
 * ReportModal - Modal for reporting posts and comments
 */

import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { useReportPost, useReportComment, REPORT_REASONS, ReportReason } from '../../hooks/usePostReporting';
import { useToast } from '../../hooks/useToast';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  type: 'post' | 'comment';
  targetId: string;
}

export function ReportModal({ visible, onClose, type, targetId }: ReportModalProps) {
  const { colors } = useTheme();
  const toast = useToast();
  const reportPost = useReportPost();
  const reportComment = useReportComment();

  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');

  const isLoading = reportPost.isPending || reportComment.isPending;

  // Validation for "other" reason requiring details
  const MIN_DETAILS_LENGTH = 20;
  const needsDetails = selectedReason === 'other';
  const detailsValid = !needsDetails || details.trim().length >= MIN_DETAILS_LENGTH;
  const canSubmit = selectedReason && detailsValid;

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast.showError('Please select a reason');
      return;
    }

    if (needsDetails && !detailsValid) {
      toast.showError(`Please provide at least ${MIN_DETAILS_LENGTH} characters of details`);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (type === 'post') {
        await reportPost.mutateAsync({
          postId: targetId,
          reason: selectedReason,
          details: details.trim() || undefined,
        });
      } else {
        await reportComment.mutateAsync({
          commentId: targetId,
          reason: selectedReason,
          details: details.trim() || undefined,
        });
      }

      toast.showSuccess('Report submitted. Thank you for helping keep our community safe.');
      handleClose();
    } catch (error: any) {
      if (error.message?.includes('already reported')) {
        toast.showNeutral('You have already reported this content');
        handleClose();
      } else if (error.message?.includes('too many reports') || error.message?.includes('Rate limit')) {
        toast.showError('You\'ve submitted too many reports recently. Please try again later.');
      } else if (error.message?.includes('cannot report your own')) {
        toast.showError('You cannot report your own content');
        handleClose();
      } else {
        toast.showError(error.message || 'Failed to submit report');
      }
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    setDetails('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>
              Report {type === 'post' ? 'Post' : 'Comment'}
            </Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Description */}
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Why are you reporting this {type}? Your report helps us maintain a safe community.
            </Text>

            {/* Reason Options */}
            <View style={styles.reasonsList}>
              {REPORT_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason.value}
                  style={[
                    styles.reasonOption,
                    { backgroundColor: colors.surfaceAlt },
                    selectedReason === reason.value && {
                      backgroundColor: colors.accentSoft,
                      borderColor: colors.accent,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedReason(reason.value);
                  }}
                >
                  <View style={styles.reasonContent}>
                    <Text
                      style={[
                        styles.reasonLabel,
                        { color: colors.text },
                        selectedReason === reason.value && { color: colors.accent },
                      ]}
                    >
                      {reason.label}
                    </Text>
                    <Text style={[styles.reasonDescription, { color: colors.textTertiary }]}>
                      {reason.description}
                    </Text>
                  </View>
                  {selectedReason === reason.value && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Additional Details */}
            <View style={styles.detailsSection}>
              <Text style={[styles.detailsLabel, { color: colors.textSecondary }]}>
                Additional details {needsDetails ? '(required - min 20 characters)' : '(optional)'}
              </Text>
              <TextInput
                style={[
                  styles.detailsInput,
                  {
                    color: colors.text,
                    backgroundColor: colors.surfaceAlt,
                    borderColor: needsDetails && details.trim().length < MIN_DETAILS_LENGTH && details.length > 0
                      ? colors.danger
                      : colors.border
                  },
                ]}
                placeholder="Provide more context about this report..."
                placeholderTextColor={colors.textTertiary}
                value={details}
                onChangeText={setDetails}
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={[
                styles.charCount,
                { color: needsDetails && details.trim().length < MIN_DETAILS_LENGTH ? colors.danger : colors.textTertiary }
              ]}>
                {needsDetails && details.trim().length < MIN_DETAILS_LENGTH
                  ? `${details.trim().length}/${MIN_DETAILS_LENGTH} min`
                  : `${details.length}/500`}
              </Text>
            </View>
          </ScrollView>

          {/* Submit Button */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: canSubmit ? colors.danger : colors.surfaceAlt },
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  style={[
                    styles.submitButtonText,
                    { color: canSubmit ? '#fff' : colors.textTertiary },
                  ]}
                >
                  Submit Report
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
  placeholder: {
    width: 32,
  },
  content: {
    padding: spacing.md,
  },
  description: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  reasonsList: {
    gap: spacing.sm,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.card,
  },
  reasonContent: {
    flex: 1,
  },
  reasonLabel: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  reasonDescription: {
    ...typography.meta,
  },
  detailsSection: {
    marginTop: spacing.lg,
  },
  detailsLabel: {
    fontFamily: 'BebasNeue',
    fontSize: 14,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  detailsInput: {
    ...typography.body,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    minHeight: 100,
  },
  charCount: {
    ...typography.meta,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  footer: {
    padding: spacing.md,
    paddingBottom: 34,
    borderTopWidth: 1,
  },
  submitButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.card,
    alignItems: 'center',
  },
  submitButtonText: {
    fontFamily: 'BebasNeue',
    fontSize: 17,
    letterSpacing: 0.3,
  },
});
