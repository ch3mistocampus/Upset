/**
 * Tests for useScorecard hooks
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useFightScorecard,
  useEventScorecards,
  useSubmitScore,
  useAdminUpdateRoundState,
  useAdminLiveFights,
  useBoutLiveStatus,
  useEventLiveStatus,
  getScorecardPollingInterval,
  createOptimisticScore,
} from '../../hooks/useScorecard';
import { supabase } from '../../lib/supabase';
import type { FightScorecard, RoundPhase } from '../../types/scorecard';

// Mock supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
    })),
  },
}));

// Mock useAuth
jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'test-user-id' },
    isGuest: false,
  })),
}));

// Create wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useScorecard hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // getScorecardPollingInterval
  // =========================================================================
  describe('getScorecardPollingInterval', () => {
    it('returns 3000ms for ROUND_BREAK phase', () => {
      expect(getScorecardPollingInterval('ROUND_BREAK')).toBe(3000);
    });

    it('returns 8000ms for ROUND_LIVE phase', () => {
      expect(getScorecardPollingInterval('ROUND_LIVE')).toBe(8000);
    });

    it('returns 30000ms for PRE_FIGHT phase', () => {
      expect(getScorecardPollingInterval('PRE_FIGHT')).toBe(30000);
    });

    it('returns false for FIGHT_ENDED phase', () => {
      expect(getScorecardPollingInterval('FIGHT_ENDED')).toBe(false);
    });

    it('returns false for ROUND_CLOSED phase', () => {
      expect(getScorecardPollingInterval('ROUND_CLOSED')).toBe(false);
    });

    it('returns false for undefined phase', () => {
      expect(getScorecardPollingInterval(undefined)).toBe(false);
    });

    it('returns 15000ms for unknown phase', () => {
      expect(getScorecardPollingInterval('UNKNOWN_PHASE')).toBe(15000);
    });
  });

  // =========================================================================
  // createOptimisticScore
  // =========================================================================
  describe('createOptimisticScore', () => {
    const mockScorecard: FightScorecard = {
      bout: {
        id: 'bout-1',
        event_id: 'event-1',
        red_name: 'Fighter Red',
        blue_name: 'Fighter Blue',
        weight_class: 'Lightweight',
        status: 'scheduled',
      },
      round_state: {
        current_round: 2,
        phase: 'ROUND_BREAK' as RoundPhase,
        scheduled_rounds: 3,
        round_started_at: null,
        round_ends_at: null,
        scoring_grace_seconds: 30,
        source: 'MANUAL',
        updated_at: null,
        is_scoring_open: true,
      },
      aggregates: [],
      user_scores: [],
    };

    it('adds new score to empty user_scores', () => {
      const result = createOptimisticScore(mockScorecard, {
        boutId: 'bout-1',
        roundNumber: 1,
        scoreRed: 10,
        scoreBlue: 9,
      });

      expect(result?.user_scores).toHaveLength(1);
      expect(result?.user_scores[0]).toMatchObject({
        round_number: 1,
        score_red: 10,
        score_blue: 9,
      });
    });

    it('replaces existing score for same round', () => {
      const scorecardWithScore: FightScorecard = {
        ...mockScorecard,
        user_scores: [
          { round_number: 1, score_red: 10, score_blue: 9, submitted_at: '2024-01-01' },
        ],
      };

      const result = createOptimisticScore(scorecardWithScore, {
        boutId: 'bout-1',
        roundNumber: 1,
        scoreRed: 10,
        scoreBlue: 8,
      });

      expect(result?.user_scores).toHaveLength(1);
      expect(result?.user_scores[0].score_blue).toBe(8);
    });

    it('adds score without replacing other rounds', () => {
      const scorecardWithScore: FightScorecard = {
        ...mockScorecard,
        user_scores: [
          { round_number: 1, score_red: 10, score_blue: 9, submitted_at: '2024-01-01' },
        ],
      };

      const result = createOptimisticScore(scorecardWithScore, {
        boutId: 'bout-1',
        roundNumber: 2,
        scoreRed: 9,
        scoreBlue: 10,
      });

      expect(result?.user_scores).toHaveLength(2);
      expect(result?.user_scores).toContainEqual(
        expect.objectContaining({ round_number: 1, score_red: 10, score_blue: 9 })
      );
      expect(result?.user_scores).toContainEqual(
        expect.objectContaining({ round_number: 2, score_red: 9, score_blue: 10 })
      );
    });

    it('sorts scores by round number', () => {
      const scorecardWithScore: FightScorecard = {
        ...mockScorecard,
        user_scores: [
          { round_number: 3, score_red: 10, score_blue: 9, submitted_at: '2024-01-01' },
        ],
      };

      const result = createOptimisticScore(scorecardWithScore, {
        boutId: 'bout-1',
        roundNumber: 1,
        scoreRed: 10,
        scoreBlue: 9,
      });

      expect(result?.user_scores[0].round_number).toBe(1);
      expect(result?.user_scores[1].round_number).toBe(3);
    });

    it('returns undefined when currentData is undefined', () => {
      const result = createOptimisticScore(undefined, {
        boutId: 'bout-1',
        roundNumber: 1,
        scoreRed: 10,
        scoreBlue: 9,
      });

      expect(result).toBeUndefined();
    });
  });

  // =========================================================================
  // useFightScorecard
  // =========================================================================
  describe('useFightScorecard', () => {
    it('fetches scorecard data for a bout', async () => {
      const mockData: FightScorecard = {
        bout: {
          id: 'bout-1',
          event_id: 'event-1',
          red_name: 'Fighter Red',
          blue_name: 'Fighter Blue',
          weight_class: 'Lightweight',
          status: 'scheduled',
        },
        round_state: {
          current_round: 1,
          phase: 'ROUND_LIVE',
          scheduled_rounds: 3,
          round_started_at: null,
          round_ends_at: null,
          scoring_grace_seconds: 30,
          source: 'MANUAL',
          updated_at: null,
          is_scoring_open: false,
        },
        aggregates: [],
        user_scores: [],
      };

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      const { result } = renderHook(() => useFightScorecard('bout-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(supabase.rpc).toHaveBeenCalledWith('get_fight_scorecard', {
        p_bout_id: 'bout-1',
      });
    });

    it('is disabled when boutId is undefined', () => {
      const { result } = renderHook(() => useFightScorecard(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });

    it('throws error when API returns error', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: { error: 'Bout not found' },
        error: null,
      });

      const { result } = renderHook(() => useFightScorecard('invalid-bout'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('Bout not found');
    });
  });

  // =========================================================================
  // useSubmitScore
  // =========================================================================
  describe('useSubmitScore', () => {
    it('submits score successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Score submitted',
        score: { round_number: 1, score_red: 10, score_blue: 9 },
      };

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      });

      const { result } = renderHook(() => useSubmitScore(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          boutId: 'bout-1',
          roundNumber: 1,
          scoreRed: 10,
          scoreBlue: 9,
        });
      });

      expect(supabase.rpc).toHaveBeenCalledWith(
        'submit_round_score',
        expect.objectContaining({
          p_bout_id: 'bout-1',
          p_round_number: 1,
          p_score_red: 10,
          p_score_blue: 9,
        })
      );
    });

    it('generates unique submission_id for idempotency', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const { result } = renderHook(() => useSubmitScore(), {
        wrapper: createWrapper(),
      });

      // Submit twice
      await act(async () => {
        await result.current.mutateAsync({
          boutId: 'bout-1',
          roundNumber: 1,
          scoreRed: 10,
          scoreBlue: 9,
        });
      });

      await act(async () => {
        await result.current.mutateAsync({
          boutId: 'bout-1',
          roundNumber: 1,
          scoreRed: 10,
          scoreBlue: 9,
        });
      });

      // Check that submission_ids are different
      const call1 = (supabase.rpc as jest.Mock).mock.calls[0][1];
      const call2 = (supabase.rpc as jest.Mock).mock.calls[1][1];
      expect(call1.p_submission_id).not.toBe(call2.p_submission_id);
    });
  });

  // =========================================================================
  // useAdminUpdateRoundState
  // =========================================================================
  describe('useAdminUpdateRoundState', () => {
    it('updates round state successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Round started',
        new_state: { phase: 'ROUND_LIVE', current_round: 1 },
      };

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      });

      const { result } = renderHook(() => useAdminUpdateRoundState(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          boutId: 'bout-1',
          action: 'START_ROUND',
        });
      });

      expect(supabase.rpc).toHaveBeenCalledWith('admin_update_round_state', {
        p_bout_id: 'bout-1',
        p_action: 'START_ROUND',
        p_round_number: null,
      });
    });
  });

  // =========================================================================
  // useAdminLiveFights
  // =========================================================================
  describe('useAdminLiveFights', () => {
    it('fetches live fights', async () => {
      const mockData = [
        {
          bout_id: 'bout-1',
          event_name: 'UFC 300',
          red_name: 'Fighter Red',
          blue_name: 'Fighter Blue',
          phase: 'ROUND_LIVE',
          current_round: 2,
        },
      ];

      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: mockData,
        error: null,
      });

      const { result } = renderHook(() => useAdminLiveFights(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(supabase.rpc).toHaveBeenCalledWith('admin_get_live_fights');
    });
  });

  // =========================================================================
  // useBoutLiveStatus
  // =========================================================================
  describe('useBoutLiveStatus', () => {
    it('returns live status for a bout', async () => {
      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { phase: 'ROUND_LIVE', current_round: 2, scheduled_rounds: 3 },
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFromChain);

      const { result } = renderHook(() => useBoutLiveStatus('bout-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual({
        isLive: true,
        isActive: true,
        phase: 'ROUND_LIVE',
        currentRound: 2,
        scheduledRounds: 3,
      });
    });

    it('returns not live for non-existent bout', async () => {
      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFromChain);

      const { result } = renderHook(() => useBoutLiveStatus('non-existent'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual({
        isLive: false,
        isActive: false,
        phase: null,
        currentRound: null,
        scheduledRounds: null,
      });
    });
  });

  // =========================================================================
  // useEventLiveStatus
  // =========================================================================
  describe('useEventLiveStatus', () => {
    it('returns status map for multiple bouts', async () => {
      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [
            { bout_id: 'bout-1', phase: 'ROUND_LIVE', current_round: 2, scheduled_rounds: 3 },
            { bout_id: 'bout-2', phase: 'ROUND_BREAK', current_round: 1, scheduled_rounds: 3 },
          ],
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFromChain);

      const { result } = renderHook(() => useEventLiveStatus(['bout-1', 'bout-2']), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const statusMap = result.current.data;
      expect(statusMap?.get('bout-1')).toEqual({
        phase: 'ROUND_LIVE',
        currentRound: 2,
        scheduledRounds: 3,
        isLive: true,
        isScoring: false,
      });
      expect(statusMap?.get('bout-2')).toEqual({
        phase: 'ROUND_BREAK',
        currentRound: 1,
        scheduledRounds: 3,
        isLive: false,
        isScoring: true,
      });
    });

    it('returns empty map for empty bout list', async () => {
      const { result } = renderHook(() => useEventLiveStatus([]), {
        wrapper: createWrapper(),
      });

      // Should not be fetching
      expect(result.current.fetchStatus).toBe('idle');
    });
  });
});
