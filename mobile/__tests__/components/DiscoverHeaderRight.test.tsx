/**
 * Tests for DiscoverHeaderRight component
 *
 * Tests that the header icons in the Discover screen navigate to correct routes
 * and have proper accessibility labels.
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

  describe('renders all header icons', () => {
    it('renders Search button with correct accessibility', () => {
      const { getByTestId, getByLabelText } = render(<DiscoverHeaderRight />);
      expect(getByTestId('header-search-button')).toBeTruthy();
      expect(getByLabelText('Search posts')).toBeTruthy();
    });

    it('renders Fighters button with correct accessibility', () => {
      const { getByTestId, getByLabelText } = render(<DiscoverHeaderRight />);
      expect(getByTestId('header-fighters-button')).toBeTruthy();
      expect(getByLabelText('Browse fighters')).toBeTruthy();
    });

    it('renders People button with correct accessibility', () => {
      const { getByTestId, getByLabelText } = render(<DiscoverHeaderRight />);
      expect(getByTestId('header-people-button')).toBeTruthy();
      expect(getByLabelText('Find people')).toBeTruthy();
    });

    it('renders Notifications button with correct accessibility', () => {
      const { getByTestId, getByLabelText } = render(<DiscoverHeaderRight />);
      expect(getByTestId('header-notifications-button')).toBeTruthy();
      expect(getByLabelText(/Notifications/)).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('Search button navigates to /post/search', () => {
      const { getByTestId } = render(<DiscoverHeaderRight />);
      const searchButton = getByTestId('header-search-button');
      fireEvent.press(searchButton);
      expect(mockPush).toHaveBeenCalledWith('/post/search');
    });

    it('Fighters button navigates to /(tabs)/fighters', () => {
      const { getByTestId } = render(<DiscoverHeaderRight />);
      const fightersButton = getByTestId('header-fighters-button');
      fireEvent.press(fightersButton);
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/fighters');
    });

    it('People button navigates to /(tabs)/friends', () => {
      const { getByTestId } = render(<DiscoverHeaderRight />);
      const peopleButton = getByTestId('header-people-button');
      fireEvent.press(peopleButton);
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/friends');
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
