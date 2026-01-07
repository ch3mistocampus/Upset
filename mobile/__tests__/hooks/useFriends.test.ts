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

// Type the supabase mock
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

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
    it('should follow a user successfully', async () => {
      // Initial data fetches
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      } as any);
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      } as any);

      // Mock getUser
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null,
      } as any);

      // Mock insert for follow
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValueOnce({
          data: null,
          error: null,
        }),
      } as any);

      const { result } = renderHook(() => useFriends(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.friendsLoading).toBe(false);
      });

      await act(async () => {
        await result.current.follow('friend-id');
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('friendships');
    });

    it('should throw error when not authenticated for follow', async () => {
      // Initial data fetches
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      } as any);
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      } as any);

      // Mock getUser returning no user
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      } as any);

      const { result } = renderHook(() => useFriends(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.friendsLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.follow('friend-id');
        })
      ).rejects.toThrow('Not authenticated');
    });

    it('should unfollow a user successfully', async () => {
      // Initial data fetches
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [{ user_id: 'friend-1', username: 'alice' }],
        error: null,
      } as any);
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      } as any);

      // Mock getUser
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-123' } },
        error: null,
      } as any);

      // Mock delete chain for unfollow
      const mockEq2 = jest.fn().mockResolvedValueOnce({
        data: null,
        error: null,
      });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEq1 });

      mockSupabase.from.mockReturnValueOnce({
        delete: mockDelete,
      } as any);

      const { result } = renderHook(() => useFriends(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.friendsLoading).toBe(false);
      });

      await act(async () => {
        await result.current.unfollow('friend-1');
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('friendships');
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
