/**
 * SportsData.io MMA API Integration
 *
 * This module provides typed access to the SportsData.io MMA API.
 *
 * @example
 * ```typescript
 * // Using the client directly
 * import { sportsDataClient } from '@/lib/sportsdata';
 * const schedule = await sportsDataClient.getSchedule('UFC', 2026);
 *
 * // Using React Query hooks
 * import { useSportsDataSchedule, useSportsDataFightersBasic } from '@/lib/sportsdata';
 * const { data: events } = useSportsDataSchedule(2026);
 * const { data: fighters } = useSportsDataFightersBasic();
 *
 * // Mapping API data to your schema
 * import { mapSportsDataFighter, mapFullEvent } from '@/lib/sportsdata';
 * const mappedFighter = mapSportsDataFighter(apiFighter, 'snapshot_id');
 * ```
 *
 * ## Trial Limitations
 *
 * The trial API key has the following restrictions:
 * - ❌ Individual fighter profiles (/Fighter/{id})
 * - ❌ Full fighter list (/Fighters)
 * - ❌ All odds/betting endpoints
 * - ⚠️ Some fight data may be "Scrambled" (randomized)
 *
 * Available with trial:
 * - ✅ Leagues
 * - ✅ Schedule/Events
 * - ✅ Basic fighter list (FightersBasic)
 * - ✅ Event details (with scrambled fields)
 * - ✅ Fight stats (with scrambled fields)
 *
 * ## Environment Variable
 *
 * Set `EXPO_PUBLIC_SPORTSDATA_API_KEY` in your environment:
 * ```bash
 * EXPO_PUBLIC_SPORTSDATA_API_KEY=your_api_key_here
 * ```
 */

// Client
export {
  sportsDataClient,
  SportsDataApiException,
  SportsDataUnauthorizedException,
  isUnauthorizedError,
  getCurrentSeason,
  parseGlobalFighterId,
} from './client';

// Types
export type {
  SportsDataLeague,
  SportsDataEvent,
  SportsDataEventStatus,
  SportsDataFighterBasic,
  SportsDataFighter,
  SportsDataCareerStats,
  SportsDataEventWithFights,
  SportsDataFight,
  SportsDataFightFighter,
  SportsDataFightWithStats,
  SportsDataFightStats,
  SportsDataEventOdds,
  SportsDataFightOdds,
  SportsDataFighterOdds,
  SportsDataBettingMarket,
  SportsDataConsensusOutcome,
  SportsDataApiError,
} from './types';

export { isSportsDataError } from './types';

// Mappers
export {
  mapSportsDataEvent,
  mapSportsDataFighter,
  mapSportsDataFight,
  mapSportsDataResult,
  mapFullEvent,
  findMatchingFighter,
  findMatchingEvent,
} from './mappers';

export type { IdMapping } from './mappers';

// React Query Hooks
export {
  sportsDataKeys,
  useSportsDataLeagues,
  useSportsDataSchedule,
  useUpcomingSportsDataEvents,
  useSportsDataEvent,
  useSportsDataFightersBasic,
  useSportsDataFighters,
  useSportsDataFighter,
  useSportsDataFighterSearch,
  useSportsDataFightStats,
  useSportsDataEventOdds,
  useSportsDataHealth,
} from './hooks';
