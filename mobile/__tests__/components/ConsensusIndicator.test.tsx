/**
 * Tests for ConsensusIndicator component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ConsensusIndicator, ConsensusRing } from '../../components/ui/ConsensusIndicator';

describe('ConsensusIndicator', () => {
  describe('percentage display', () => {
    it('displays percentage correctly', () => {
      const { getByText } = render(<ConsensusIndicator value={0.75} />);
      expect(getByText('75%')).toBeTruthy();
    });

    it('rounds percentage to nearest integer', () => {
      const { getByText } = render(<ConsensusIndicator value={0.777} />);
      expect(getByText('78%')).toBeTruthy();
    });

    it('handles zero value', () => {
      const { getByText } = render(<ConsensusIndicator value={0} />);
      expect(getByText('0%')).toBeTruthy();
    });

    it('handles 100% value', () => {
      const { getByText } = render(<ConsensusIndicator value={1} />);
      expect(getByText('100%')).toBeTruthy();
    });
  });

  describe('consensus labels', () => {
    it('shows "Unanimous" for 80%+ consensus', () => {
      const { getByText } = render(<ConsensusIndicator value={0.85} />);
      expect(getByText('Unanimous')).toBeTruthy();
    });

    it('shows "Strong" for 60-79% consensus', () => {
      const { getByText } = render(<ConsensusIndicator value={0.65} />);
      expect(getByText('Strong')).toBeTruthy();
    });

    it('shows "Moderate" for 40-59% consensus', () => {
      const { getByText } = render(<ConsensusIndicator value={0.45} />);
      expect(getByText('Moderate')).toBeTruthy();
    });

    it('shows "Mixed" for 20-39% consensus', () => {
      const { getByText } = render(<ConsensusIndicator value={0.25} />);
      expect(getByText('Mixed')).toBeTruthy();
    });

    it('shows "Split" for <20% consensus', () => {
      const { getByText } = render(<ConsensusIndicator value={0.1} />);
      expect(getByText('Split')).toBeTruthy();
    });
  });

  describe('null/undefined handling', () => {
    it('returns null for null value', () => {
      const { toJSON } = render(<ConsensusIndicator value={null} />);
      expect(toJSON()).toBeNull();
    });

    it('returns null for undefined value', () => {
      const { toJSON } = render(<ConsensusIndicator value={undefined as any} />);
      expect(toJSON()).toBeNull();
    });
  });

  describe('clamping', () => {
    it('clamps values above 1 to 100%', () => {
      const { getByText } = render(<ConsensusIndicator value={1.5} />);
      expect(getByText('100%')).toBeTruthy();
    });

    it('clamps values below 0 to 0%', () => {
      const { getByText } = render(<ConsensusIndicator value={-0.5} />);
      expect(getByText('0%')).toBeTruthy();
    });
  });

  describe('showLabel option', () => {
    it('shows labels by default', () => {
      const { getByText } = render(<ConsensusIndicator value={0.75} />);
      expect(getByText('Strong')).toBeTruthy();
    });

    it('hides labels when showLabel is false', () => {
      const { queryByText } = render(<ConsensusIndicator value={0.75} showLabel={false} />);
      expect(queryByText('Strong')).toBeNull();
    });
  });

  describe('size variants', () => {
    it('renders sm size', () => {
      const { getByText } = render(<ConsensusIndicator value={0.5} size="sm" />);
      expect(getByText('50%')).toBeTruthy();
    });

    it('renders md size (default)', () => {
      const { getByText } = render(<ConsensusIndicator value={0.5} />);
      expect(getByText('50%')).toBeTruthy();
    });

    it('renders lg size', () => {
      const { getByText } = render(<ConsensusIndicator value={0.5} size="lg" />);
      expect(getByText('50%')).toBeTruthy();
    });
  });
});

describe('ConsensusRing', () => {
  it('renders ring with percentage', () => {
    const { getByText } = render(<ConsensusRing value={0.75} />);
    expect(getByText('75')).toBeTruthy();
  });

  it('returns null for null value', () => {
    const { toJSON } = render(<ConsensusRing value={null} />);
    expect(toJSON()).toBeNull();
  });

  it('renders with custom size', () => {
    const { getByText } = render(<ConsensusRing value={0.5} size={60} />);
    expect(getByText('50')).toBeTruthy();
  });

  it('clamps percentage display', () => {
    const { getByText } = render(<ConsensusRing value={1.5} />);
    expect(getByText('100')).toBeTruthy();
  });
});
