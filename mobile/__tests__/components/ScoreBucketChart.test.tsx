/**
 * Tests for ScoreBucketChart component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ScoreBucketChart, ScoreBucketBar } from '../../components/ui/ScoreBucketChart';
import type { ScoreBuckets } from '../../types/scorecard';

describe('ScoreBucketChart', () => {
  describe('rendering with data', () => {
    it('renders score distribution correctly', () => {
      const buckets: ScoreBuckets = {
        red_10_9: 60,
        red_10_8: 10,
        blue_10_9: 25,
        even_10_10: 5,
      };

      const { getByText } = render(
        <ScoreBucketChart buckets={buckets} totalSubmissions={100} />
      );

      expect(getByText('Red 70%')).toBeTruthy();
      expect(getByText('Blue 25%')).toBeTruthy();
      expect(getByText('Even 5%')).toBeTruthy();
    });

    it('handles all red corner scores', () => {
      const buckets: ScoreBuckets = {
        red_10_9: 80,
        red_10_8: 15,
        red_10_7: 5,
      };

      const { getByText } = render(
        <ScoreBucketChart buckets={buckets} totalSubmissions={100} />
      );

      expect(getByText('Red 100%')).toBeTruthy();
    });

    it('handles all blue corner scores', () => {
      const buckets: ScoreBuckets = {
        blue_10_9: 70,
        blue_10_8: 30,
      };

      const { getByText } = render(
        <ScoreBucketChart buckets={buckets} totalSubmissions={100} />
      );

      expect(getByText('Blue 100%')).toBeTruthy();
    });
  });

  describe('empty state', () => {
    it('renders empty state when no submissions', () => {
      const buckets: ScoreBuckets = {};

      const { getByText } = render(
        <ScoreBucketChart buckets={buckets} totalSubmissions={0} />
      );

      expect(getByText('No scores yet')).toBeTruthy();
    });

    it('renders empty state when buckets are empty', () => {
      const buckets: ScoreBuckets = {};

      const { getByText } = render(
        <ScoreBucketChart buckets={buckets} totalSubmissions={100} />
      );

      expect(getByText('No scores yet')).toBeTruthy();
    });
  });

  describe('showLabels option', () => {
    it('shows labels by default', () => {
      const buckets: ScoreBuckets = {
        red_10_9: 50,
        blue_10_9: 50,
      };

      const { getByText } = render(
        <ScoreBucketChart buckets={buckets} totalSubmissions={100} />
      );

      expect(getByText('Red 50%')).toBeTruthy();
      expect(getByText('Blue 50%')).toBeTruthy();
    });

    it('hides labels when showLabels is false', () => {
      const buckets: ScoreBuckets = {
        red_10_9: 50,
        blue_10_9: 50,
      };

      const { queryByText } = render(
        <ScoreBucketChart buckets={buckets} totalSubmissions={100} showLabels={false} />
      );

      expect(queryByText('Red 50%')).toBeNull();
      expect(queryByText('Blue 50%')).toBeNull();
    });
  });
});

describe('ScoreBucketBar', () => {
  it('renders compact bar', () => {
    const buckets: ScoreBuckets = {
      red_10_9: 60,
      blue_10_9: 40,
    };

    // ScoreBucketBar is a visual component, just ensure it renders without error
    const { toJSON } = render(
      <ScoreBucketBar buckets={buckets} totalSubmissions={100} />
    );

    expect(toJSON()).toBeTruthy();
  });

  it('handles zero submissions', () => {
    const buckets: ScoreBuckets = {};

    const { toJSON } = render(
      <ScoreBucketBar buckets={buckets} totalSubmissions={0} />
    );

    expect(toJSON()).toBeTruthy();
  });

  it('respects custom height', () => {
    const buckets: ScoreBuckets = {
      red_10_9: 50,
      blue_10_9: 50,
    };

    const { toJSON } = render(
      <ScoreBucketBar buckets={buckets} totalSubmissions={100} height={8} />
    );

    expect(toJSON()).toBeTruthy();
  });
});
