/**
 * useAccountManagement Hook
 *
 * Account management operations including deletion (Apple required).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface DeleteAccountResult {
  success: boolean;
  message: string;
  deleted: {
    picks_deleted: number;
    activities_deleted: number;
    friendships_deleted: number;
  };
}

/**
 * Delete user account and all associated data
 * Apple App Store requirement for account deletion capability
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const { signOut } = useAuth();

  return useMutation({
    mutationFn: async (confirmationText: string): Promise<DeleteAccountResult> => {
      const { data, error } = await supabase.rpc('delete_user_account', {
        confirmation_text: confirmationText,
      });

      if (error) throw error;
      return data as DeleteAccountResult;
    },
    onSuccess: async () => {
      // Clear all cached data
      queryClient.clear();

      // Sign out the user
      await signOut();
    },
  });
}

/**
 * Hook for account management operations
 */
export function useAccountManagement() {
  const deleteAccount = useDeleteAccount();

  return {
    deleteAccount: deleteAccount.mutateAsync,
    isDeleting: deleteAccount.isPending,
    deleteError: deleteAccount.error,
  };
}
