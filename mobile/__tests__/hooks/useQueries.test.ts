/**
 * useQueries Hook Tests
 * Tests data fetching hooks for events, bouts, picks, and stats
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useNextEvent,
  useRecentEvents,
  useUserStats,
  isEventLocked,
  getTimeUntilEvent,
} from '../../hooks/useQueries';
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

describe('useQueries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useNextEvent', () => {
    it('should fetch next upcoming event', async () => {
      const mockEvent = {
        id: 'event-1',
        name: 'UFC 300',
        event_date: '2025-01-15T22:00:00Z',
        status: 'upcoming',
        location: 'Las Vegas, NV',
      };

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: mockEvent,
          error: null,
        }),
      } as any);

      const { result } = renderHook(() => useNextEvent(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockEvent);
      expect(result.current.data?.name).toBe('UFC 300');
    });

    it('should return null when no upcoming events', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }, // No rows returned
        }),
      } as any);

      const { result } = renderHook(() => useNextEvent(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });

    it('should handle errors', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { code: 'UNKNOWN', message: 'Database error' },
        }),
      } as any);

      const { result } = renderHook(() => useNextEvent(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useRecentEvents', () => {
    it('should fetch recent completed events with default limit', async () => {
      const mockEvents = [
        { id: 'event-1', name: 'UFC 299', status: 'completed', event_date: '2025-01-01T22:00:00Z' },
        { id: 'event-2', name: 'UFC 298', status: 'completed', event_date: '2024-12-15T22:00:00Z' },
      ];

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce({
          data: mockEvents,
          error: null,
        }),
      } as any);

      const { result } = renderHook(() => useRecentEvents(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].name).toBe('UFC 299');
    });

    it('should fetch with custom limit', async () => {
      const mockEvents = [
        { id: 'event-1', name: 'UFC 299', status: 'completed', event_date: '2025-01-01T22:00:00Z' },
      ];

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce({
          data: mockEvents,
          error: null,
        }),
      } as any);

      const { result } = renderHook(() => useRecentEvents(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(1);
    });

    it('should return empty array when no events', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce({
          data: null,
          error: null,
        }),
      } as any);

      const { result } = renderHook(() => useRecentEvents(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useUserStats', () => {
    it('should fetch user stats', async () => {
      const mockStats = {
        user_id: 'user-123',
        total_picks: 50,
        correct_picks: 35,
        accuracy_pct: 70,
        current_streak: 3,
        best_streak: 8,
      };

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: mockStats,
          error: null,
        }),
      } as any);

      const { result } = renderHook(() => useUserStats('user-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.total_picks).toBe(50);
      expect(result.current.data?.accuracy_pct).toBe(70);
    });

    it('should return null when userId is null', async () => {
      const { result } = renderHook(() => useUserStats(null), {
        wrapper: createWrapper(),
      });

      // Query should be disabled when userId is null
      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });

    it('should return null when no stats exist for user', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }, // No rows returned
        }),
      } as any);

      const { result } = renderHook(() => useUserStats('new-user'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe('isEventLocked', () => {
    it('should return true when event is null', () => {
      expect(isEventLocked(null)).toBe(true);
    });

    it('should return true when event date is in the past', () => {
      const pastEvent = {
        id: 'event-1',
        name: 'UFC 299',
        event_date: '2024-01-01T22:00:00Z', // Past date
        status: 'completed' as const,
        location: 'Las Vegas',
        ufcstats_id: null,
        card_snapshot: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(isEventLocked(pastEvent)).toBe(true);
    });

    it('should return false when event date is in the future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 7 days from now

      const futureEvent = {
        id: 'event-1',
        name: 'UFC 300',
        event_date: futureDate.toISOString(),
        status: 'upcoming' as const,
        location: 'Las Vegas',
        ufcstats_id: null,
        card_snapshot: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(isEventLocked(futureEvent)).toBe(false);
    });
  });

  describe('getTimeUntilEvent', () => {
    it('should return 0 when event is null', () => {
      expect(getTimeUntilEvent(null)).toBe(0);
    });

    it('should return positive number for future events', () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1); // 1 hour from now

      const futureEvent = {
        id: 'event-1',
        name: 'UFC 300',
        event_date: futureDate.toISOString(),
        status: 'upcoming' as const,
        location: 'Las Vegas',
        ufcstats_id: null,
        card_snapshot: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const timeUntil = getTimeUntilEvent(futureEvent);
      expect(timeUntil).toBeGreaterThan(0);
      // Should be roughly 1 hour (allowing some tolerance for test execution time)
      expect(timeUntil).toBeLessThan(60 * 60 * 1000 + 5000); // 1 hour + 5 sec tolerance
      expect(timeUntil).toBeGreaterThan(60 * 60 * 1000 - 5000); // 1 hour - 5 sec tolerance
    });

    it('should return negative number for past events', () => {
      const pastEvent = {
        id: 'event-1',
        name: 'UFC 299',
        event_date: '2024-01-01T22:00:00Z', // Past date
        status: 'completed' as const,
        location: 'Las Vegas',
        ufcstats_id: null,
        card_snapshot: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(getTimeUntilEvent(pastEvent)).toBeLessThan(0);
    });
  });
});
