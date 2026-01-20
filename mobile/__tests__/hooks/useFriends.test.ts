/**
 * useFriends Hook Tests
 * Tests social features: following list and user search
 *
 * Note: Uses X-style follow model (one-way relationships)
 * - No friend requests (direct follow)
 * - Legacy acceptFriendRequest/declineFriendRequest are no-ops
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useFriends } from '../../hooks/useFriends';
import { supabase } from '../../lib/supabase';

// Type the supabase mock with proper jest.Mock types
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// Helper to get properly typed mock functions
const mockGetUser = mockSupabase.auth.getUser as jest.Mock;

// Create a wrapper with QueryClient for each test
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useFriends', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('friends list', () => {
    it('should fetch friends list', async () => {
      const mockFriends = [
        { friend_user_id: 'friend-1', username: 'alice', accuracy: 75, total_picks: 100, correct_picks: 75, became_friends_at: '2025-01-01' },
        { friend_user_id: 'friend-2', username: 'bob', accuracy: 68, total_picks: 50, correct_picks: 34, became_friends_at: '2025-01-02' },
      ];

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockFriends,
        error: null,
      } as any);

      // Mock get_friend_requests RPC call (happens in parallel)
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      } as any);

      const { result } = renderHook(() => useFriends(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.friendsLoading).toBe(false);
      });

      expect(result.current.friends).toHaveLength(2);
      expect(result.current.friends[0].username).toBe('alice');
      expect(result.current.friends[1].accuracy).toBe(68);
    });

    it('should return empty array when no friends', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: null,
      } as any);

      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      } as any);

      const { result } = renderHook(() => useFriends(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.friendsLoading).toBe(false);
      });

      expect(result.current.friends).toEqual([]);
    });

    it('should handle errors when fetching friends', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      } as any);

      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      } as any);

      const { result } = renderHook(() => useFriends(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.friendsError).toBeDefined();
      });
    });
  });

  describe('follow/unfollow', () => {
    it('should follow a user successfully via RPC', async () => {
      // Initial data fetches (get_friends, get_friend_requests)
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      } as any);
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      } as any);

      const { result } = renderHook(() => useFriends(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.friendsLoading).toBe(false);
      });

      // Mock follow_user RPC call
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { success: true },
        error: null,
      } as any);

      await act(async () => {
        await result.current.follow('friend-id');
      });

      // Check that RPC was called with follow_user
      expect(mockSupabase.rpc).toHaveBeenCalledWith('follow_user', {
        p_target_user_id: 'friend-id',
      });
    });

    it('should unfollow a user successfully via RPC', async () => {
      // Initial data fetches
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [{ friend_user_id: 'friend-1', username: 'alice' }],
        error: null,
      } as any);
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      } as any);

      const { result } = renderHook(() => useFriends(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.friendsLoading).toBe(false);
      });

      // Mock unfollow_user RPC call
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { success: true },
        error: null,
      } as any);

      await act(async () => {
        await result.current.unfollow('friend-1');
      });

      // Check that RPC was called with unfollow_user
      expect(mockSupabase.rpc).toHaveBeenCalledWith('unfollow_user', {
        p_target_user_id: 'friend-1',
      });
    });
  });

  describe('legacy no-op functions', () => {
    it('acceptFriendRequest should be a no-op', async () => {
      // Initial data fetches
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      } as any);
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      } as any);

      const { result } = renderHook(() => useFriends(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.friendsLoading).toBe(false);
      });

      // Should not throw and should not call any supabase methods
      const fromCallsBefore = mockSupabase.from.mock.calls.length;

      await act(async () => {
        await result.current.acceptFriendRequest('req-1');
      });

      // No additional calls should have been made
      expect(mockSupabase.from.mock.calls.length).toBe(fromCallsBefore);
    });

    it('declineFriendRequest should be a no-op', async () => {
      // Initial data fetches
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      } as any);
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      } as any);

      const { result } = renderHook(() => useFriends(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.friendsLoading).toBe(false);
      });

      // Should not throw and should not call any supabase methods
      const fromCallsBefore = mockSupabase.from.mock.calls.length;

      await act(async () => {
        await result.current.declineFriendRequest('req-1');
      });

      // No additional calls should have been made
      expect(mockSupabase.from.mock.calls.length).toBe(fromCallsBefore);
    });
  });

  describe('search users', () => {
    it('should return empty array for empty search term', async () => {
      // Initial data fetches
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      } as any);
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      } as any);

      const { result } = renderHook(() => useFriends(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.friendsLoading).toBe(false);
      });

      let searchResults: any;
      await act(async () => {
        searchResults = await result.current.searchUsers('');
      });

      expect(searchResults).toEqual([]);
    });

    it('should return empty array for whitespace-only search', async () => {
      // Initial data fetches
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      } as any);
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      } as any);

      const { result } = renderHook(() => useFriends(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.friendsLoading).toBe(false);
      });

      let searchResults: any;
      await act(async () => {
        searchResults = await result.current.searchUsers('   ');
      });

      expect(searchResults).toEqual([]);
    });
  });
});
