/**
 * Post Reporting Hook
 *
 * Handles reporting posts and comments for moderation
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

// Report reason types
export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'misinformation'
  | 'inappropriate'
  | 'other';

export const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: 'spam', label: 'Spam', description: 'Promotional content or repetitive posts' },
  { value: 'harassment', label: 'Harassment', description: 'Bullying or targeted attacks' },
  { value: 'hate_speech', label: 'Hate Speech', description: 'Discriminatory or hateful content' },
  { value: 'misinformation', label: 'Misinformation', description: 'False or misleading information' },
  { value: 'inappropriate', label: 'Inappropriate', description: 'Adult content or offensive material' },
  { value: 'other', label: 'Other', description: 'Other policy violation' },
];

interface ReportPostInput {
  postId: string;
  reason: ReportReason;
  details?: string;
}

interface ReportCommentInput {
  commentId: string;
  reason: ReportReason;
  details?: string;
}

interface ReportResult {
  success: boolean;
  report_id: string;
}

/**
 * Report a post
 */
export function useReportPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, reason, details }: ReportPostInput): Promise<ReportResult> => {
      logger.breadcrumb('Reporting post', 'moderation', { postId, reason });

      const { data, error } = await supabase.rpc('report_post', {
        p_post_id: postId,
        p_reason: reason,
        p_details: details || null,
      });

      if (error) {
        logger.error('Failed to report post', error);
        throw error;
      }

      logger.info('Post reported', data);
      return data as ReportResult;
    },
  });
}

/**
 * Report a comment
 */
export function useReportComment() {
  return useMutation({
    mutationFn: async ({ commentId, reason, details }: ReportCommentInput): Promise<ReportResult> => {
      logger.breadcrumb('Reporting comment', 'moderation', { commentId, reason });

      const { data, error } = await supabase.rpc('report_comment', {
        p_comment_id: commentId,
        p_reason: reason,
        p_details: details || null,
      });

      if (error) {
        logger.error('Failed to report comment', error);
        throw error;
      }

      logger.info('Comment reported', data);
      return data as ReportResult;
    },
  });
}

/**
 * Combined hook for convenient access to both report functions
 */
export function useReporting() {
  const reportPost = useReportPost();
  const reportComment = useReportComment();

  return {
    reportPost,
    reportComment,
    isLoading: reportPost.isPending || reportComment.isPending,
  };
}
