/**
 * useAdmin Hook
 *
 * Admin-only operations for managing reports and users.
 * Requires user to have admin role in admin_users table.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { logger } from '../lib/logger';

// Query keys
export const adminKeys = {
  all: ['admin'] as const,
  isAdmin: () => [...adminKeys.all, 'isAdmin'] as const,
  reports: () => [...adminKeys.all, 'reports'] as const,
  reportsPending: () => [...adminKeys.reports(), 'pending'] as const,
  users: (search?: string) => [...adminKeys.all, 'users', search] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
};

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  details: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reporter?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  reported_user?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

export interface AdminUser {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  total_picks: number;
  correct_picks: number;
  is_banned: boolean;
  report_count: number;
}

export interface AdminStats {
  total_users: number;
  active_users_24h: number;
  pending_reports: number;
  total_picks: number;
  total_events: number;
}

/**
 * Check if current user is an admin
 */
export function useIsAdmin() {
  const { user } = useAuth();

  return useQuery({
    queryKey: adminKeys.isAdmin(),
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase
        .rpc('is_admin', { check_user_id: user.id });

      if (error) {
        logger.error('Error checking admin status', error);
        return false;
      }

      return data === true;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Get pending reports for moderation
 */
export function usePendingReports() {
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: adminKeys.reportsPending(),
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_pending_reports', { limit_count: 50 });

      if (error) throw error;
      return data as Report[];
    },
    enabled: isAdmin === true,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Review a report (resolve, dismiss, or take action)
 */
export function useReviewReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reportId,
      action,
      notes,
    }: {
      reportId: string;
      action: 'resolved' | 'dismissed';
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .rpc('review_report', {
          p_report_id: reportId,
          p_status: action,
          p_admin_notes: notes || null,
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.reports() });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
    },
  });
}

/**
 * Ban a user (set their profile to banned state)
 */
export function useBanUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      reason,
    }: {
      userId: string;
      reason: string;
    }) => {
      // Update user's profile to mark as banned
      const { error } = await supabase
        .from('profiles')
        .update({
          bio: `[BANNED: ${reason}]`,
          // Could add a banned_at column in future
        })
        .eq('user_id', userId);

      if (error) throw error;

      // Deactivate all their push tokens
      await supabase
        .from('push_tokens')
        .update({ is_active: false })
        .eq('user_id', userId);

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}

/**
 * Get admin dashboard stats
 */
export function useAdminStats() {
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: async () => {
      // Get multiple stats in parallel
      const [
        usersResult,
        reportsResult,
        picksResult,
        eventsResult,
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('picks').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }),
      ]);

      // Get active users in last 24h
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const { count: activeUsers } = await supabase
        .from('picks')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', oneDayAgo.toISOString());

      return {
        total_users: usersResult.count || 0,
        active_users_24h: activeUsers || 0,
        pending_reports: reportsResult.count || 0,
        total_picks: picksResult.count || 0,
        total_events: eventsResult.count || 0,
      } as AdminStats;
    },
    enabled: isAdmin === true,
    staleTime: 60 * 1000, // Cache for 1 minute
  });
}

/**
 * Search users for admin management
 * Uses optimized RPC to fetch users with stats in a single query
 */
export function useAdminUserSearch(searchTerm: string) {
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: adminKeys.users(searchTerm),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_users_with_stats', {
        search_term: searchTerm || null,
        limit_count: 50,
      });

      if (error) {
        logger.error('Failed to fetch admin users', error);
        throw error;
      }

      // Map RPC response to AdminUser interface
      return (data || []).map((user: {
        id: string;
        username: string;
        avatar_url: string | null;
        created_at: string;
        total_picks: number;
        correct_picks: number;
        is_banned: boolean;
        report_count: number;
      }) => ({
        id: user.id,
        username: user.username,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        total_picks: user.total_picks,
        correct_picks: user.correct_picks,
        is_banned: user.is_banned,
        report_count: user.report_count,
      } as AdminUser));
    },
    enabled: isAdmin === true && searchTerm.length >= 0,
  });
}
