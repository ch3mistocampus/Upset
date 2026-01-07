/**
 * Discover Screen Tests
 *
 * Tests for the Discover screen empty state CTAs, FAB, and tab switching.
 * Header navigation buttons are now tested in DiscoverHeaderRight.test.tsx.
 *
 * Note: Full integration tests would require more extensive mocking.
 * These tests verify the navigation handler logic and accessibility.
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
      background: '#F5F6F8',
      surface: '#FFFFFF',
      card: '#FFFFFF',
      text: '#121318',
      textSecondary: 'rgba(18, 19, 24, 0.58)',
      textTertiary: 'rgba(18, 19, 24, 0.38)',
      accent: '#B0443F',
      primary: '#B0443F',
      border: 'rgba(0, 0, 0, 0.08)',
      danger: '#B0443F',
    },
  }),
}));

// Mock all the hooks the Discover screen uses
jest.mock('../../hooks/useFeed', () => ({
  useDiscoverFeed: () => ({
    data: { pages: [] },
    isLoading: false,
    isRefetching: false,
    refetch: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
    isError: false,
  }),
  useFollowingFeed: () => ({
    data: { pages: [] },
    isLoading: false,
    isRefetching: false,
    refetch: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
    isError: false,
  }),
  useTrendingUsers: () => ({
    data: [],
    refetch: jest.fn(),
  }),
  useNewActivityCount: () => ({
    data: 0,
  }),
  formatActivityDescription: jest.fn(() => 'test activity'),
  getActivityIcon: jest.fn(() => '🎯'),
}));

jest.mock('../../hooks/useFriends', () => ({
  useFriends: () => ({
    follow: jest.fn(),
    followLoading: false,
  }),
}));

jest.mock('../../hooks/useLikes', () => ({
  useLike: () => ({
    toggleLike: jest.fn(),
    isToggling: false,
  }),
}));

jest.mock('../../hooks/useSuggestions', () => ({
  useUserSuggestions: () => ({
    data: [],
  }),
  getSuggestionReasonText: jest.fn(() => 'Suggested'),
}));

jest.mock('../../hooks/usePosts', () => ({
  usePostsFeed: () => ({
    data: { pages: [] },
    isLoading: false,
    isRefetching: false,
    refetch: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  }),
  useFollowingPostsFeed: () => ({
    data: { pages: [] },
    isLoading: false,
    isRefetching: false,
    refetch: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  }),
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
  }),
}));

jest.mock('../../components/posts', () => ({
  PostCard: () => null,
}));

import DiscoverScreen from '../../app/(tabs)/discover';

describe('Discover Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tab segment control', () => {
    it('renders For You tab with correct accessibility', () => {
      const { getByTestId, getByLabelText } = render(<DiscoverScreen />);
      expect(getByTestId('segment-for-you')).toBeTruthy();
      expect(getByLabelText(/For You tab/)).toBeTruthy();
    });

    it('renders Following tab with correct accessibility', () => {
      const { getByTestId, getByLabelText } = render(<DiscoverScreen />);
      expect(getByTestId('segment-following')).toBeTruthy();
      expect(getByLabelText(/Following tab/)).toBeTruthy();
    });

    it('For You tab is selected by default', () => {
      const { getByTestId } = render(<DiscoverScreen />);
      const forYouTab = getByTestId('segment-for-you');
      expect(forYouTab.props.accessibilityState?.selected).toBe(true);
    });

    it('switches to Following tab when tapped', () => {
      const { getByTestId } = render(<DiscoverScreen />);
      const followingTab = getByTestId('segment-following');
      fireEvent.press(followingTab);
      expect(followingTab.props.accessibilityState?.selected).toBe(true);
    });
  });

  describe('Empty state CTAs', () => {
    it('shows Make Picks button when discover tab is empty', () => {
      const { getByText } = render(<DiscoverScreen />);
      expect(getByText('Make Picks')).toBeTruthy();
    });

    it('shows Browse Fighters link when discover tab is empty', () => {
      const { getByText } = render(<DiscoverScreen />);
      expect(getByText('Browse Fighters')).toBeTruthy();
    });

    it('Make Picks button navigates to /(tabs)/pick', () => {
      const { getByText } = render(<DiscoverScreen />);
      const makePicksButton = getByText('Make Picks');
      fireEvent.press(makePicksButton);
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/pick');
    });

    it('Browse Fighters link navigates to /(tabs)/fighters', () => {
      const { getByText } = render(<DiscoverScreen />);
      const browseLink = getByText('Browse Fighters');
      fireEvent.press(browseLink);
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/fighters');
    });
  });

  describe('Create Post FAB', () => {
    it('renders Create Post button with accessibility label', () => {
      const { getByLabelText } = render(<DiscoverScreen />);
      expect(getByLabelText('Create new post')).toBeTruthy();
    });

    it('Create Post FAB navigates to /post/create', () => {
      const { getByLabelText } = render(<DiscoverScreen />);
      const fab = getByLabelText('Create new post');
      fireEvent.press(fab);
      expect(mockPush).toHaveBeenCalledWith('/post/create');
    });
  });
});
