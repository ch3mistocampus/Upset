/**
 * Auth Router Tests (mobile/app/index.tsx)
 * Tests the main routing logic that determines where users land based on auth state
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import Index from '../../app/index';

// Mock the useAuth hook
jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from '../../hooks/useAuth';

describe('Index (Auth Router)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Auth routing logic', () => {
    it('should show loading spinner when auth state is loading', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        profile: null,
        loading: true,
      });

      const { UNSAFE_getByType } = render(<Index />);
      expect(UNSAFE_getByType(require('react-native').ActivityIndicator)).toBeTruthy();
    });

    it('should render when user is not authenticated (will redirect to sign-in)', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        profile: null,
        loading: false,
      });

      // Component will redirect - we just test it renders without errors
      expect(() => render(<Index />)).not.toThrow();
    });

    it('should render when user exists but profile does not (will redirect to create-username)', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'test-user-id' },
        profile: null,
        loading: false,
      });

      // Component will redirect - we just test it renders without errors
      expect(() => render(<Index />)).not.toThrow();
    });

    it('should render when user is fully authenticated with profile (will redirect to home)', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'test-user-id' },
        profile: { user_id: 'test-user-id', username: 'testuser' },
        loading: false,
      });

      // Component will redirect - we just test it renders without errors
      expect(() => render(<Index />)).not.toThrow();
    });
  });
});
