/**
 * useAuth Hook Tests
 * Tests authentication state management, session handling, and auth operations
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useAuth, AuthProvider } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { GuestPicksProvider } from '../../hooks/useGuestPicks';

// Type the supabase mock with proper jest.Mock types
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// Helper to get properly typed mock functions
const mockGetSession = mockSupabase.auth.getSession as jest.Mock;
const mockSignInWithOtp = mockSupabase.auth.signInWithOtp as jest.Mock;
const mockSignOut = mockSupabase.auth.signOut as jest.Mock;
const mockOnAuthStateChange = mockSupabase.auth.onAuthStateChange as jest.Mock;

// Wrapper component that provides necessary context
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <GuestPicksProvider>
      {children}
    </GuestPicksProvider>
  </AuthProvider>
);

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Session initialization', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.profile).toBeNull();
    });

    it('should fetch session on mount', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        access_token: 'mock-token',
      };

      mockGetSession.mockResolvedValueOnce({
        data: { session: mockSession as any },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: { user_id: 'user-123', username: 'testuser', created_at: new Date().toISOString() },
          error: null,
        }),
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(mockSession.user);
      expect(result.current.profile?.username).toBe('testuser');
    });

    it('should handle no session on mount', async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.profile).toBeNull();
    });
  });

  describe('signInWithOTP', () => {
    it('should call supabase signInWithOtp with correct parameters', async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      mockSignInWithOtp.mockResolvedValueOnce({
        data: {} as any,
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signInWithOTP('test@example.com');
      });

      expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: {
          shouldCreateUser: true,
          emailRedirectTo: 'upset://',
        },
      });
    });

    it('should throw error if signInWithOtp fails', async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const mockError = new Error('Invalid email');
      mockSignInWithOtp.mockResolvedValueOnce({
        data: {} as any,
        error: mockError as any,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.signInWithOTP('invalid-email');
        })
      ).rejects.toThrow('Invalid email');
    });
  });

  describe('createProfile', () => {
    it('should create profile for authenticated user', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        access_token: 'mock-token',
      };

      mockGetSession.mockResolvedValueOnce({
        data: { session: mockSession as any },
        error: null,
      });

      // Mock initial profile fetch (no profile yet)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }, // No rows returned
        }),
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Mock profile creation
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: {
            user_id: 'user-123',
            username: 'testuser',
            created_at: new Date().toISOString(),
          },
          error: null,
        }),
      } as any);

      let createdProfile: any;
      await act(async () => {
        createdProfile = await result.current.createProfile('testuser');
      });

      expect(createdProfile.username).toBe('testuser');
      expect(result.current.profile?.username).toBe('testuser');
    });

    it('should throw error if no user is logged in', async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.createProfile('testuser');
        })
      ).rejects.toThrow('No user logged in');
    });
  });

  describe('signOut', () => {
    it('should call supabase signOut', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        access_token: 'mock-token',
      };

      mockGetSession.mockResolvedValueOnce({
        data: { session: mockSession as any },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: { user_id: 'user-123', username: 'testuser', created_at: new Date().toISOString() },
          error: null,
        }),
      } as any);

      mockSignOut.mockResolvedValueOnce({
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('Auth state changes', () => {
    it('should subscribe to auth state changes', async () => {
      const mockUnsubscribe = jest.fn();
      mockOnAuthStateChange.mockReturnValueOnce({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      } as any);

      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const { unmount } = renderHook(() => useAuth(), { wrapper });

      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });
});
