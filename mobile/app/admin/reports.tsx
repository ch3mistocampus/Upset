/**
 * Reports Moderation Screen
 *
 * Admin screen for reviewing and resolving user reports.
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { usePendingReports, useReviewReport, Report } from '../../hooks/useAdmin';
import { spacing, radius, typography } from '../../lib/tokens';

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  harassment: 'Harassment',
  inappropriate_content: 'Inappropriate Content',
  impersonation: 'Impersonation',
  cheating: 'Cheating',
  other: 'Other',
};

interface ReportCardProps {
  report: Report;
  onReview: (report: Report) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

function ReportCard({ report, onReview, colors }: ReportCardProps) {
  const timeAgo = getTimeAgo(report.created_at);

  return (
    <View style={[styles.reportCard, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.reportHeader}>
        <View style={[styles.reasonBadge, { backgroundColor: colors.accent + '20' }]}>
          <Text style={[styles.reasonText, { color: colors.accent }]}>
            {REASON_LABELS[report.reason] || report.reason}
          </Text>
        </View>
        <Text style={[styles.timeText, { color: colors.textTertiary }]}>{timeAgo}</Text>
      </View>

      {/* Users */}
      <View style={styles.usersSection}>
        <View style={styles.userRow}>
          <Ionicons name="flag" size={16} color={colors.textSecondary} />
          <Text style={[styles.userLabel, { color: colors.textSecondary }]}>Reporter:</Text>
          <Text style={[styles.username, { color: colors.text }]}>
            @{report.reporter?.username || 'Unknown'}
          </Text>
        </View>
        <View style={styles.userRow}>
          <Ionicons name="person" size={16} color={colors.textSecondary} />
          <Text style={[styles.userLabel, { color: colors.textSecondary }]}>Reported:</Text>
          <Text style={[styles.username, { color: colors.text }]}>
            @{report.reported_user?.username || 'Unknown'}
          </Text>
        </View>
      </View>

      {/* Details */}
      {report.details && (
        <View style={[styles.detailsBox, { backgroundColor: colors.background }]}>
          <Text style={[styles.detailsText, { color: colors.text }]}>{report.details}</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => onReview(report)}
        >
          <Text style={styles.actionButtonText}>Review</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function ReportsScreen() {
  const { colors } = useTheme();
  const { data: reports, isLoading, refetch } = usePendingReports();
  const reviewReport = useReviewReport();

  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [showModal, setShowModal] = useState(false);

  const handleReview = (report: Report) => {
    setSelectedReport(report);
    setAdminNotes('');
    setShowModal(true);
  };

  const handleAction = async (action: 'resolved' | 'dismissed') => {
    if (!selectedReport) return;

    try {
      await reviewReport.mutateAsync({
        reportId: selectedReport.id,
        action,
        notes: adminNotes || undefined,
      });

      setShowModal(false);
      setSelectedReport(null);

      Alert.alert(
        'Report ' + (action === 'resolved' ? 'Resolved' : 'Dismissed'),
        action === 'resolved'
          ? 'The report has been resolved and action logged.'
          : 'The report has been dismissed.'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to review report. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="checkmark-circle" size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>All Clear</Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No pending reports to review
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        <Text style={[styles.countText, { color: colors.textSecondary }]}>
          {reports.length} pending report{reports.length !== 1 ? 's' : ''}
        </Text>

        {reports.map((report) => (
          <ReportCard
            key={report.id}
            report={report}
            onReview={handleReview}
            colors={colors}
          />
        ))}
      </ScrollView>

      {/* Review Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Review Report</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedReport && (
              <>
                <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Reason</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>
                    {REASON_LABELS[selectedReport.reason] || selectedReport.reason}
                  </Text>
                </View>

                <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Reporter</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>
                    @{selectedReport.reporter?.username || 'Unknown'}
                  </Text>
                </View>

                <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
                    Reported User
                  </Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>
                    @{selectedReport.reported_user?.username || 'Unknown'}
                  </Text>
                </View>

                {selectedReport.details && (
                  <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Details</Text>
                    <Text style={[styles.modalValue, { color: colors.text }]}>
                      {selectedReport.details}
                    </Text>
                  </View>
                )}

                <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>
                  Admin Notes (optional)
                </Text>
                <TextInput
                  style={[
                    styles.notesInput,
                    { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
                  ]}
                  placeholder="Add notes about your decision..."
                  placeholderTextColor={colors.textTertiary}
                  value={adminNotes}
                  onChangeText={setAdminNotes}
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.textSecondary }]}
                    onPress={() => handleAction('dismissed')}
                    disabled={reviewReport.isPending}
                  >
                    <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.modalButtonText}>Dismiss</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.accent }]}
                    onPress={() => handleAction('resolved')}
                    disabled={reviewReport.isPending}
                  >
                    {reviewReport.isPending ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.modalButtonText}>Resolve</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  countText: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold as '600',
  },
  emptyText: {
    fontSize: typography.sizes.md,
  },
  reportCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  reasonBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  reasonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium as '500',
  },
  timeText: {
    fontSize: typography.sizes.sm,
  },
  usersSection: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  userLabel: {
    fontSize: typography.sizes.sm,
  },
  username: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium as '500',
  },
  detailsBox: {
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  detailsText: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalCancel: {
    fontSize: typography.sizes.md,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold as '600',
  },
  modalContent: {
    flex: 1,
    padding: spacing.md,
  },
  modalCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  modalLabel: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
  },
  modalValue: {
    fontSize: typography.sizes.md,
  },
  notesLabel: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    fontSize: typography.sizes.md,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold as '600',
  },
});
