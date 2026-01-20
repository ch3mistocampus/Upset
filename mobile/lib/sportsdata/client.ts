/**
 * SportsData.io MMA API Client
 *
 * A typed client for the SportsData.io MMA API.
 * API Documentation: https://sportsdata.io/developers/api-documentation/mma
 */

import {
  SportsDataLeague,
  SportsDataEvent,
  SportsDataEventWithFights,
  SportsDataFighterBasic,
  SportsDataFighter,
  SportsDataFightWithStats,
  SportsDataEventOdds,
  SportsDataApiError,
  isSportsDataError,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

const BASE_URLS = {
  scores: 'https://api.sportsdata.io/v3/mma/scores/json',
  stats: 'https://api.sportsdata.io/v3/mma/stats/json',
  odds: 'https://api.sportsdata.io/v3/mma/odds/json',
} as const;

// API Key - should be stored in environment variable
// For trial: d3e269ed0b4747629bd4259b46252b5e
const API_KEY = process.env.EXPO_PUBLIC_SPORTSDATA_API_KEY || '';

// ============================================================================
// Error Classes
// ============================================================================

export class SportsDataApiException extends Error {
  public readonly httpStatus: number;
  public readonly code: number;
  public readonly help: string;

  constructor(error: SportsDataApiError) {
    super(error.Description);
    this.name = 'SportsDataApiException';
    this.httpStatus = error.HttpStatusCode;
    this.code = error.Code;
    this.help = error.Help;
  }
}

export class SportsDataUnauthorizedException extends SportsDataApiException {
  constructor(error: SportsDataApiError) {
    super(error);
    this.name = 'SportsDataUnauthorizedException';
  }
}

// ============================================================================
// Core Fetch Function
// ============================================================================

async function fetchSportsData<T>(
  baseUrl: keyof typeof BASE_URLS,
  endpoint: string,
  options?: { apiKey?: string }
): Promise<T> {
  const key = options?.apiKey || API_KEY;

  if (!key) {
    throw new Error('SportsData.io API key is not configured. Set EXPO_PUBLIC_SPORTSDATA_API_KEY.');
  }

  const url = `${BASE_URLS[baseUrl]}/${endpoint}?key=${key}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  const data = await response.json();

  // Check for API error response
  if (isSportsDataError(data)) {
    if (data.HttpStatusCode === 401) {
      throw new SportsDataUnauthorizedException(data);
    }
    throw new SportsDataApiException(data);
  }

  return data as T;
}

// ============================================================================
// API Client
// ============================================================================

export const sportsDataClient = {
  /**
   * Get all available leagues (UFC)
   */
  getLeagues: (): Promise<SportsDataLeague[]> => {
    return fetchSportsData<SportsDataLeague[]>('scores', 'Leagues');
  },

  /**
   * Get event schedule for a specific year
   * @param league - League key (e.g., 'UFC')
   * @param season - Year (e.g., 2026)
   */
  getSchedule: (league: string, season: number): Promise<SportsDataEvent[]> => {
    return fetchSportsData<SportsDataEvent[]>('scores', `Schedule/${league}/${season}`);
  },

  /**
   * Get event details with all fights
   * @param eventId - SportsData event ID
   * Note: Some fields may be "Scrambled" in trial mode
   */
  getEvent: (eventId: number): Promise<SportsDataEventWithFights> => {
    return fetchSportsData<SportsDataEventWithFights>('scores', `Event/${eventId}`);
  },

  /**
   * Get all fighters (basic info)
   * Available in trial mode
   */
  getFightersBasic: (): Promise<SportsDataFighterBasic[]> => {
    return fetchSportsData<SportsDataFighterBasic[]>('scores', 'FightersBasic');
  },

  /**
   * Get all fighters (full profiles)
   * Requires paid subscription
   */
  getFighters: (): Promise<SportsDataFighter[]> => {
    return fetchSportsData<SportsDataFighter[]>('scores', 'Fighters');
  },

  /**
   * Get individual fighter profile
   * Requires paid subscription
   * @param fighterId - SportsData fighter ID (format: 1400XXXXX)
   */
  getFighter: (fighterId: number): Promise<SportsDataFighter> => {
    return fetchSportsData<SportsDataFighter>('scores', `Fighter/${fighterId}`);
  },

  /**
   * Get fight statistics (final)
   * @param fightId - SportsData fight ID
   * Note: Stats may be scrambled in trial mode
   */
  getFightStats: (fightId: number): Promise<SportsDataFightWithStats> => {
    return fetchSportsData<SportsDataFightWithStats>('stats', `FightFinal/${fightId}`);
  },

  /**
   * Get fight statistics (live & final)
   * @param fightId - SportsData fight ID
   * Note: For live updates during events
   */
  getFightLive: (fightId: number): Promise<SportsDataFightWithStats> => {
    return fetchSportsData<SportsDataFightWithStats>('stats', `Fight/${fightId}`);
  },

  // =========================================================================
  // Odds Endpoints (require paid subscription)
  // =========================================================================

  /**
   * Get betting odds for an event
   * Requires paid subscription
   * @param eventId - SportsData event ID
   */
  getEventOdds: (eventId: number): Promise<SportsDataEventOdds> => {
    return fetchSportsData<SportsDataEventOdds>('odds', `EventOdds/${eventId}`);
  },

  /**
   * Get upcoming events with betting available
   * Requires paid subscription
   */
  getUpcomingBettingEvents: (): Promise<SportsDataEvent[]> => {
    return fetchSportsData<SportsDataEvent[]>('odds', 'UpcomingBettingEvents');
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if an error is due to unauthorized access (need paid subscription)
 */
export function isUnauthorizedError(error: unknown): error is SportsDataUnauthorizedException {
  return error instanceof SportsDataUnauthorizedException;
}

/**
 * Get the current UFC season year
 */
export function getCurrentSeason(): number {
  return new Date().getFullYear();
}

/**
 * Parse SportsData fighter ID to extract the numeric portion
 * IDs are prefixed with 1400 (e.g., 140000001)
 */
export function parseGlobalFighterId(fighterId: number): string {
  return fighterId.toString().replace(/^1400/, '');
}
