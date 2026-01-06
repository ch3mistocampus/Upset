/**
 * Tests for LiveBadge component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { LiveBadge } from '../../components/ui/LiveBadge';
import type { RoundPhase } from '../../types/scorecard';

describe('LiveBadge', () => {
  describe('rendering', () => {
    it('renders LIVE text for ROUND_LIVE phase', () => {
      const { getByText } = render(<LiveBadge phase="ROUND_LIVE" />);
      expect(getByText('LIVE')).toBeTruthy();
    });

    it('renders SCORE NOW text for ROUND_BREAK phase', () => {
      const { getByText } = render(<LiveBadge phase="ROUND_BREAK" />);
      expect(getByText('SCORE NOW')).toBeTruthy();
    });

    it('renders UPCOMING text for PRE_FIGHT phase', () => {
      const { getByText } = render(<LiveBadge phase="PRE_FIGHT" />);
      expect(getByText('UPCOMING')).toBeTruthy();
    });

    it('renders SCORING CLOSED text for ROUND_CLOSED phase', () => {
      const { getByText } = render(<LiveBadge phase="ROUND_CLOSED" />);
      expect(getByText('SCORING CLOSED')).toBeTruthy();
    });

    it('renders ENDED text for FIGHT_ENDED phase', () => {
      const { getByText } = render(<LiveBadge phase="FIGHT_ENDED" />);
      expect(getByText('ENDED')).toBeTruthy();
    });
  });

  describe('showRound option', () => {
    it('shows round number when showRound is true', () => {
      const { getByText } = render(
        <LiveBadge phase="ROUND_LIVE" currentRound={2} showRound />
      );
      expect(getByText('R2 LIVE')).toBeTruthy();
    });

    it('shows round number in scoring phase', () => {
      const { getByText } = render(
        <LiveBadge phase="ROUND_BREAK" currentRound={3} showRound />
      );
      expect(getByText('SCORE R3')).toBeTruthy();
    });

    it('does not show round when showRound is false', () => {
      const { getByText } = render(
        <LiveBadge phase="ROUND_LIVE" currentRound={2} showRound={false} />
      );
      expect(getByText('LIVE')).toBeTruthy();
    });
  });

  describe('size variants', () => {
    it('renders sm size', () => {
      const { getByText } = render(<LiveBadge phase="ROUND_LIVE" size="sm" />);
      expect(getByText('LIVE')).toBeTruthy();
    });

    it('renders md size (default)', () => {
      const { getByText } = render(<LiveBadge phase="ROUND_LIVE" />);
      expect(getByText('LIVE')).toBeTruthy();
    });

    it('renders lg size', () => {
      const { getByText } = render(<LiveBadge phase="ROUND_LIVE" size="lg" />);
      expect(getByText('LIVE')).toBeTruthy();
    });
  });
});
