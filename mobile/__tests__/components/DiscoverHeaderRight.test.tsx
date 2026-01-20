/**
 * Tests for DiscoverHeaderRight component
 *
 * Tests that the header icons in the Discover screen (Search, Notifications)
 * navigate to correct routes and have proper accessibility labels.
 * Note: Fighters and People buttons have been removed from the header.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

// Mock theme
jest.mock('../../lib/theme', () => ({
  useTheme: () => ({
    colors: {
      accent: '#B0443F',
      text: '#121318',
      danger: '#B0443F',
    },
  }),
}));

// Mock notification count hook
jest.mock('../../hooks/usePostNotifications', () => ({
  useUnreadNotificationCount: () => ({
    data: 0,
  }),
}));

import { DiscoverHeaderRight } from '../../components/navigation/DiscoverHeaderRight';

describe('DiscoverHeaderRight', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('renders header icons', () => {
    it('renders Search button with correct accessibility', () => {
      const { getByTestId, getByLabelText } = render(<DiscoverHeaderRight />);
      expect(getByTestId('header-search-button')).toBeTruthy();
      expect(getByLabelText('Search posts')).toBeTruthy();
    });

    it('renders Notifications button with correct accessibility', () => {
      const { getByTestId, getByLabelText } = render(<DiscoverHeaderRight />);
      expect(getByTestId('header-notifications-button')).toBeTruthy();
      expect(getByLabelText(/Notifications/)).toBeTruthy();
    });

    it('does not render Fighters button (removed from header)', () => {
      const { queryByTestId } = render(<DiscoverHeaderRight />);
      expect(queryByTestId('header-fighters-button')).toBeNull();
    });

    it('does not render People button (removed from header)', () => {
      const { queryByTestId } = render(<DiscoverHeaderRight />);
      expect(queryByTestId('header-people-button')).toBeNull();
    });
  });

  describe('navigation', () => {
    it('Search button navigates to /post/search', () => {
      const { getByTestId } = render(<DiscoverHeaderRight />);
      const searchButton = getByTestId('header-search-button');
      fireEvent.press(searchButton);
      expect(mockPush).toHaveBeenCalledWith('/post/search');
    });

    it('Notifications button navigates to /post/notifications', () => {
      const { getByTestId } = render(<DiscoverHeaderRight />);
      const notificationsButton = getByTestId('header-notifications-button');
      fireEvent.press(notificationsButton);
      expect(mockPush).toHaveBeenCalledWith('/post/notifications');
    });
  });

  describe('notification badge', () => {
    it('does not show badge when no unread notifications', () => {
      // Default mock returns 0
      const { queryByLabelText } = render(<DiscoverHeaderRight />);
      // When count is 0, label is just "Notifications" without "unread"
      expect(queryByLabelText(/unread/)).toBeNull();
    });

    it('shows badge when there are unread notifications', () => {
      // Override mock to return unread count
      const spy = jest.spyOn(require('../../hooks/usePostNotifications'), 'useUnreadNotificationCount');
      spy.mockReturnValue({ data: 5 });

      const { getByLabelText } = render(<DiscoverHeaderRight />);
      expect(getByLabelText(/5 unread/)).toBeTruthy();

      // Restore original mock
      spy.mockRestore();
    });
  });
});
