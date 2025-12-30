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

  describe('Current behavior (auth bypassed)', () => {
    it('should render without crashing (auth currently bypassed)', () => {
      // The component currently just returns <Redirect href="/(tabs)/home" />
      // We're testing that it renders without errors
      expect(() => render(<Index />)).not.toThrow();
    });
  });

  // These tests will be relevant when auth is re-enabled in Sprint 0
  describe('Future behavior (when auth is re-enabled)', () => {
    it.skip('should show loading spinner when auth state is loading', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        profile: null,
        loading: true,
      });

      const { getByTestId } = render(<Index />);
      // When auth is re-enabled, this should find the loading spinner
      // expect(getByTestId('auth-loading')).toBeTruthy();
    });

    it.skip('should redirect to sign-in when user is not authenticated', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        profile: null,
        loading: false,
      });

      const { getByText } = render(<Index />);
      // When auth is re-enabled, this should redirect to sign-in
      // expect(getByText('Redirect to /(auth)/sign-in')).toBeTruthy();
    });

    it.skip('should redirect to create-username when user exists but profile does not', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'test-user-id' },
        profile: null,
        loading: false,
      });

      const { getByText } = render(<Index />);
      // When auth is re-enabled, this should redirect to create-username
      // expect(getByText('Redirect to /(auth)/create-username')).toBeTruthy();
    });

    it.skip('should redirect to home when user is fully authenticated with profile', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'test-user-id' },
        profile: { user_id: 'test-user-id', username: 'testuser' },
        loading: false,
      });

      const { getByText } = render(<Index />);
      // When auth is re-enabled, this should redirect to home
      // expect(getByText('Redirect to /(tabs)/home')).toBeTruthy();
    });
  });
});
