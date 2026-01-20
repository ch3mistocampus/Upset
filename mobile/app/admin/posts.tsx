/**
 * Admin Posts Moderation Screen
 * Review and manage reported posts and comments
 */

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../lib/theme';
import { spacing, radius, typography } from '../../lib/tokens';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useToast } from '../../hooks/useToast';
import { EmptyState } from '../../components/EmptyState';

type ReportType = 'all' | 'post' | 'comment';

interface PostReport {
  id: string;
  post_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  post_title: string;
  post_body: string | null;
  reporter_username: string;
  author_username: string | null;
}

interface CommentReport {
  id: string;
  comment_id: string;
  post_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  comment_body: string;
  reporter_username: string;
  author_username: string | null;
}

export default function AdminPostsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [reportType, setReportType] = useState<ReportType>('all');

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['adminReports', reportType],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('admin_get_pending_reports', {
        p_type: reportType,
        p_limit: 50,
        p_offset: 0,
      });

      if (error) {
        logger.error('Failed to fetch reports', error);
        throw error;
      }

      return data as { post_reports: PostReport[]; comment_reports: CommentReport[] };
    },
  });

  const resolveReport = useMutation({
    mutationFn: async ({
      reportId,
      reportType,
      status,
      deleteContent,
    }: {
      reportId: string;
      reportType: 'post' | 'comment';
      status: 'reviewed' | 'action_taken' | 'dismissed';
      deleteContent: boolean;
    }) => {
      const { data, error } = await (supabase.rpc as any)('admin_resolve_report', {
        p_report_id: reportId,
        p_report_type: reportType,
        p_status: status,
        p_admin_notes: null,
        p_delete_content: deleteContent,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReports'] });
    },
  });

  const handleResolve = (
    reportId: string,
    type: 'post' | 'comment',
    action: 'dismiss' | 'delete'
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (action === 'dismiss') {
      Alert.alert(
        'Dismiss Report',
        'Are you sure you want to dismiss this report?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Dismiss',
            onPress: async () => {
              try {
                await resolveReport.mutateAsync({
                  reportId,
                  reportType: type,
                  status: 'dismissed',
                  deleteContent: false,
                });
                toast.showNeutral('Report dismissed');
              } catch (error: any) {
                toast.showError(error.message || 'Failed to dismiss report');
              }
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Delete Content',
        `Are you sure you want to delete this ${type}? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await resolveReport.mutateAsync({
                  reportId,
                  reportType: type,
                  status: 'action_taken',
                  deleteContent: true,
                });
                toast.showSuccess(`${type === 'post' ? 'Post' : 'Comment'} deleted`);
              } catch (error: any) {
                toast.showError(error.message || 'Failed to delete content');
              }
            },
          },
        ]
      );
    }
  };

  const renderPostReport = useCallback(
    ({ item }: { item: PostReport }) => (
      <View style={[styles.reportCard, { backgroundColor: colors.card }]}>
        <View style={styles.reportHeader}>
          <View style={[styles.typeBadge, { backgroundColor: colors.accentSoft }]}>
            <Text style={[styles.typeBadgeText, { color: colors.accent }]}>POST</Text>
          </View>
          <Text style={[styles.reportReason, { color: colors.warning }]}>
            {item.reason.replace('_', ' ')}
          </Text>
        </View>

        <Text style={[styles.reportContent, { color: colors.text }]} numberOfLines={3}>
          "{item.post_title}"
        </Text>

        {item.post_body && (
          <Text style={[styles.reportBody, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.post_body}
          </Text>
        )}

        <View style={styles.reportMeta}>
          <Text style={[styles.metaText, { color: colors.textTertiary }]}>
            Reported by @{item.reporter_username}
          </Text>
          {item.author_username && (
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>
              Author: @{item.author_username}
            </Text>
          )}
        </View>

        {item.details && (
          <Text style={[styles.reportDetails, { color: colors.textSecondary }]}>
            Details: {item.details}
          </Text>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.surfaceAlt }]}
            onPress={() => router.push(`/post/${item.post_id}`)}
          >
            <Ionicons name="eye-outline" size={18} color={colors.text} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>View</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.surfaceAlt }]}
            onPress={() => handleResolve(item.id, 'post', 'dismiss')}
          >
            <Ionicons name="checkmark-outline" size={18} color={colors.success} />
            <Text style={[styles.actionButtonText, { color: colors.success }]}>Dismiss</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: `${colors.danger}20` }]}
            onPress={() => handleResolve(item.id, 'post', 'delete')}
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={[styles.actionButtonText, { color: colors.danger }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [colors, router]
  );

  const renderCommentReport = useCallback(
    ({ item }: { item: CommentReport }) => (
      <View style={[styles.reportCard, { backgroundColor: colors.card }]}>
        <View style={styles.reportHeader}>
          <View style={[styles.typeBadge, { backgroundColor: colors.primarySoft }]}>
            <Text style={[styles.typeBadgeText, { color: colors.primary }]}>COMMENT</Text>
          </View>
          <Text style={[styles.reportReason, { color: colors.warning }]}>
            {item.reason.replace('_', ' ')}
          </Text>
        </View>

        <Text style={[styles.reportContent, { color: colors.text }]} numberOfLines={3}>
          "{item.comment_body}"
        </Text>

        <View style={styles.reportMeta}>
          <Text style={[styles.metaText, { color: colors.textTertiary }]}>
            Reported by @{item.reporter_username}
          </Text>
          {item.author_username && (
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>
              Author: @{item.author_username}
            </Text>
          )}
        </View>

        {item.details && (
          <Text style={[styles.reportDetails, { color: colors.textSecondary }]}>
            Details: {item.details}
          </Text>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.surfaceAlt }]}
            onPress={() => router.push(`/post/${item.post_id}`)}
          >
            <Ionicons name="eye-outline" size={18} color={colors.text} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>View</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.surfaceAlt }]}
            onPress={() => handleResolve(item.id, 'comment', 'dismiss')}
          >
            <Ionicons name="checkmark-outline" size={18} color={colors.success} />
            <Text style={[styles.actionButtonText, { color: colors.success }]}>Dismiss</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: `${colors.danger}20` }]}
            onPress={() => handleResolve(item.id, 'comment', 'delete')}
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={[styles.actionButtonText, { color: colors.danger }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [colors, router]
  );

  // Combine and sort reports
  const allReports = [
    ...(data?.post_reports || []).map((r) => ({ ...r, _type: 'post' as const })),
    ...(data?.comment_reports || []).map((r) => ({ ...r, _type: 'comment' as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const renderItem = useCallback(
    ({ item }: { item: (PostReport | CommentReport) & { _type: 'post' | 'comment' } }) => {
      if (item._type === 'post') {
        return renderPostReport({ item: item as PostReport });
      }
      return renderCommentReport({ item: item as CommentReport });
    },
    [renderPostReport, renderCommentReport]
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading reports...
          </Text>
        </View>
      );
    }

    return (
      <EmptyState
        icon="checkmark-circle-outline"
        title="No Pending Reports"
        message="All reports have been reviewed. Great job keeping the community safe!"
      />
    );
  }, [isLoading, colors]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Post Moderation',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />

      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { borderBottomColor: colors.border }]}>
        {(['all', 'post', 'comment'] as ReportType[]).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.filterTab,
              reportType === type && { borderBottomColor: colors.accent },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setReportType(type);
            }}
          >
            <Text
              style={[
                styles.filterTabText,
                { color: reportType === type ? colors.accent : colors.textSecondary },
              ]}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}s
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={allReports}
        renderItem={renderItem}
        keyExtractor={(item) => `${item._type}-${item.id}`}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.accent}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          allReports.length === 0 && styles.emptyContainer,
        ]}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabText: {
    ...typography.body,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
  },
  reportCard: {
    padding: spacing.md,
    borderRadius: radius.card,
    marginBottom: spacing.md,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  reportReason: {
    ...typography.meta,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  reportContent: {
    ...typography.body,
    fontStyle: 'italic',
    marginBottom: spacing.xs,
  },
  reportBody: {
    ...typography.meta,
    marginBottom: spacing.sm,
  },
  reportMeta: {
    marginBottom: spacing.sm,
  },
  metaText: {
    ...typography.meta,
  },
  reportDetails: {
    ...typography.meta,
    marginBottom: spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    gap: spacing.xs,
  },
  actionButtonText: {
    ...typography.meta,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
});
