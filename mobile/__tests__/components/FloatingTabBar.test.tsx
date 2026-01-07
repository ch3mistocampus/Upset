/**
 * Tests for FloatingTabBar component
 *
 * Verifies that the bottom tab bar shows exactly 5 tabs
 * and does not include People or Fighters tabs.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { FloatingTabBar } from '../../components/navigation/FloatingTabBar';

// Mock dependencies
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, top: 0, left: 0, right: 0 }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

jest.mock('../../lib/theme', () => ({
  useTheme: () => ({
    colors: {
      tabActive: '#B0443F',
      tabInactive: '#999',
      accent: '#B0443F',
    },
    isDark: false,
  }),
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    isGuest: false,
  }),
}));

// Mock navigation state with all 7 routes (matching _layout.tsx configuration)
// The FloatingTabBar should filter out routes with href: null
// Using 'as any' to avoid complex type requirements for testing
const createMockState = (activeIndex = 0): any => ({
  routes: [
    { key: 'home-1', name: 'home' },
    { key: 'pick-2', name: 'pick' },
    { key: 'discover-3', name: 'discover' },
    { key: 'leaderboards-4', name: 'leaderboards' },
    { key: 'friends-5', name: 'friends' },
    { key: 'fighters-6', name: 'fighters' },
    { key: 'profile-7', name: 'profile' },
  ],
  index: activeIndex,
  type: 'tab',
  key: 'tab-nav',
  routeNames: ['home', 'pick', 'discover', 'leaderboards', 'friends', 'fighters', 'profile'],
  stale: false,
});

const createMockDescriptors = (): any => ({
  'home-1': { options: {}, render: jest.fn(), route: { key: 'home-1', name: 'home' }, navigation: {} },
  'pick-2': { options: {}, render: jest.fn(), route: { key: 'pick-2', name: 'pick' }, navigation: {} },
  'discover-3': { options: {}, render: jest.fn(), route: { key: 'discover-3', name: 'discover' }, navigation: {} },
  'leaderboards-4': { options: {}, render: jest.fn(), route: { key: 'leaderboards-4', name: 'leaderboards' }, navigation: {} },
  // friends and fighters have href: null - should be hidden from tab bar
  'friends-5': { options: { href: null }, render: jest.fn(), route: { key: 'friends-5', name: 'friends' }, navigation: {} },
  'fighters-6': { options: { href: null }, render: jest.fn(), route: { key: 'fighters-6', name: 'fighters' }, navigation: {} },
  'profile-7': { options: {}, render: jest.fn(), route: { key: 'profile-7', name: 'profile' }, navigation: {} },
});

const mockNavigation: any = {
  emit: jest.fn(() => ({ defaultPrevented: false })),
  navigate: jest.fn(),
};

const mockInsets = { bottom: 0, top: 0, left: 0, right: 0 };

describe('FloatingTabBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('tab rendering', () => {
    it('renders exactly 5 tab buttons', () => {
      const { getAllByRole } = render(
        <FloatingTabBar
          state={createMockState()}
          descriptors={createMockDescriptors()}
          navigation={mockNavigation}
          insets={mockInsets as any}
        />
      );
      const buttons = getAllByRole('button');
      expect(buttons).toHaveLength(5);
    });

    it('renders correct tab labels', () => {
      const { getByText } = render(
        <FloatingTabBar
          state={createMockState()}
          descriptors={createMockDescriptors()}
          navigation={mockNavigation}
          insets={mockInsets as any}
        />
      );

      expect(getByText('Home')).toBeTruthy();
      expect(getByText('Events')).toBeTruthy();
      expect(getByText('Discover')).toBeTruthy();
      expect(getByText('Ranks')).toBeTruthy();
      expect(getByText('Profile')).toBeTruthy();
    });

    it('does NOT render People tab', () => {
      const { queryByText } = render(
        <FloatingTabBar
          state={createMockState()}
          descriptors={createMockDescriptors()}
          navigation={mockNavigation}
          insets={mockInsets as any}
        />
      );
      expect(queryByText('People')).toBeNull();
    });

    it('does NOT render Fighters tab', () => {
      const { queryByText } = render(
        <FloatingTabBar
          state={createMockState()}
          descriptors={createMockDescriptors()}
          navigation={mockNavigation}
          insets={mockInsets as any}
        />
      );
      expect(queryByText('Fighters')).toBeNull();
    });
  });

  describe('active state', () => {
    it('marks first tab as selected when index is 0', () => {
      const { getAllByRole } = render(
        <FloatingTabBar
          state={createMockState(0)}
          descriptors={createMockDescriptors()}
          navigation={mockNavigation}
          insets={mockInsets as any}
        />
      );

      const buttons = getAllByRole('button');
      expect(buttons[0].props.accessibilityState).toEqual({ selected: true });
    });

    it('marks correct tab as selected when index changes', () => {
      const { getAllByRole } = render(
        <FloatingTabBar
          state={createMockState(2)} // Discover tab (index 2 in routes array)
          descriptors={createMockDescriptors()}
          navigation={mockNavigation}
          insets={mockInsets as any}
        />
      );

      const buttons = getAllByRole('button');
      // Discover is at rendered index 2 (after filtering out friends/fighters)
      expect(buttons[2].props.accessibilityState).toEqual({ selected: true });
    });

    it('maintains correct focus when hidden tabs are before the active tab', () => {
      const { getAllByRole } = render(
        <FloatingTabBar
          state={createMockState(6)} // Profile tab (index 6 in routes array)
          descriptors={createMockDescriptors()}
          navigation={mockNavigation}
          insets={mockInsets as any}
        />
      );

      const buttons = getAllByRole('button');
      // Profile is at rendered index 4 (5th visible tab after filtering)
      expect(buttons[4].props.accessibilityState).toEqual({ selected: true });
    });
  });

  describe('guest mode', () => {
    it('shows Guest label for profile tab when user is guest', () => {
      jest.spyOn(require('../../hooks/useAuth'), 'useAuth').mockReturnValue({
        isGuest: true,
      });

      const { getByText } = render(
        <FloatingTabBar
          state={createMockState()}
          descriptors={createMockDescriptors()}
          navigation={mockNavigation}
          insets={mockInsets as any}
        />
      );

      expect(getByText('Guest')).toBeTruthy();
    });
  });
});
