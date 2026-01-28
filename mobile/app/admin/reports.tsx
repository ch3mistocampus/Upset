/**
 * Reports Screen (Read-Only)
 *
 * View-only list of pending user reports.
 * Full moderation actions available at upsetmma.app/admin.
 */

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { usePendingReports, Report } from '../../hooks/useAdmin';
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
  colors: ReturnType<typeof useTheme>['colors'];
}

function ReportCard({ report, colors }: ReportCardProps) {
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
        {/* Web admin note */}
        <View style={[styles.webNote, { backgroundColor: colors.card }]}>
          <Ionicons name="desktop-outline" size={16} color={colors.accent} />
          <Text style={[styles.webNoteText, { color: colors.textSecondary }]}>
            Manage reports at upsetmma.app/admin
          </Text>
        </View>

        <Text style={[styles.countText, { color: colors.textSecondary }]}>
          {reports.length} pending report{reports.length !== 1 ? 's' : ''}
        </Text>

        {reports.map((report) => (
          <ReportCard
            key={report.id}
            report={report}
            colors={colors}
          />
        ))}
      </ScrollView>
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
  },
  detailsText: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  webNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  webNoteText: {
    flex: 1,
    fontSize: typography.sizes.sm,
  },
});
