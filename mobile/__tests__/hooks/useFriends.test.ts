/**
 * useFriends Hook Tests
 * Tests social features: friends list, friend requests, and user search
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
        { user_id: 'friend-1', username: 'alice', accuracy_pct: 75, total_picks: 100 },
        { user_id: 'friend-2', username: 'bob', accuracy_pct: 68, total_picks: 50 },
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
      expect(result.current.friends[1].accuracy_pct).toBe(68);
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

  describe('friend requests', () => {
    it('should fetch friend requests', async () => {
      const mockRequests = [
        { id: 'req-1', user_id: 'sender-1', username: 'charlie', created_at: '2025-01-01T00:00:00Z' },
      ];

      // Mock get_friends first
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      } as any);

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockRequests,
        error: null,
      } as any);

      const { result } = renderHook(() => useFriends(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.requestsLoading).toBe(false);
      });

      expect(result.current.friendRequests).toHaveLength(1);
      expect(result.current.friendRequests[0].username).toBe('charlie');
    });

    it('should handle accepting friend request', async () => {
      // Initial data fetches
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      } as any);
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [{ id: 'req-1', user_id: 'sender-1', username: 'charlie' }],
        error: null,
      } as any);

      // Mock the update call for accepting
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValueOnce({
          data: null,
          error: null,
        }),
      } as any);

      const { result } = renderHook(() => useFriends(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.requestsLoading).toBe(false);
      });

      // Accept request
      await act(async () => {
        await result.current.acceptFriendRequest('req-1');
      });

      // Verify from().update() was called
      expect(mockSupabase.from).toHaveBeenCalledWith('friendships');
    });

    it('should handle declining friend request', async () => {
      // Initial data fetches
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      } as any);
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [{ id: 'req-1', user_id: 'sender-1', username: 'charlie' }],
        error: null,
      } as any);

      // Mock the update call for declining
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValueOnce({
          data: null,
          error: null,
        }),
      } as any);

      const { result } = renderHook(() => useFriends(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.requestsLoading).toBe(false);
      });

      // Decline request
      await act(async () => {
        await result.current.declineFriendRequest('req-1');
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('friendships');
    });
  });

  describe('send friend request', () => {
    it('should send friend request successfully', async () => {
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

      // Mock insert
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
        await result.current.sendFriendRequest('friend-id');
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('friendships');
    });

    it('should throw error when not authenticated', async () => {
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
          await result.current.sendFriendRequest('friend-id');
        })
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('remove friend', () => {
    it('should remove friend successfully', async () => {
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

      // Mock delete
      mockSupabase.from.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        or: jest.fn().mockResolvedValueOnce({
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
        await result.current.removeFriend('friend-1');
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('friendships');
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
