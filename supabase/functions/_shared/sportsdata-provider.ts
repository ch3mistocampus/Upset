/**
 * SportsData.io MMA API Provider
 *
 * Provides data from SportsData.io for UFC events, fighters, and fight results.
 * This is a separate provider that populates the sportsdata_* tables.
 */

import { createLogger } from "./logger.ts";

const logger = createLogger("sportsdata-provider");

// ============================================================================
// Types
// ============================================================================

export interface SportsDataEvent {
  EventId: number;
  LeagueId: number;
  Name: string;
  ShortName: string;
  Season: number;
  Day: string;
  DateTime: string;
  Status: string;
  Active: boolean;
}

export interface SportsDataFighter {
  FighterId: number;
  FirstName: string;
  LastName: string;
  Nickname: string | null;
  WeightClass: string;
  BirthDate: string | null;
  Height: number | null;
  Weight: number | null;
  Reach: number | null;
  Wins: number;
  Losses: number;
  Draws: number;
  NoContests: number;
  TechnicalKnockouts: number;
  TechnicalKnockoutLosses: number;
  Submissions: number;
  SubmissionLosses: number;
  TitleWins: number;
  TitleLosses: number;
  TitleDraws: number;
}

export interface SportsDataFightFighter {
  FighterId: number;
  FirstName: string;
  LastName: string;
  PreFightWins: number | null;
  PreFightLosses: number | null;
  PreFightDraws: number | null;
  PreFightNoContests: number | null;
  Winner: boolean;
  Moneyline: number | null;
  Active: boolean;
}

export interface SportsDataFight {
  FightId: number;
  Order: number;
  Status: string;
  WeightClass: string;
  CardSegment: string;
  Referee: string | null;
  Rounds: number;
  ResultClock: number | null;
  ResultRound: number | null;
  ResultType: string | null;
  WinnerId: number | null;
  Active: boolean;
  Fighters: SportsDataFightFighter[];
}

export interface SportsDataEventWithFights extends SportsDataEvent {
  Fights: SportsDataFight[];
}

export interface SportsDataFightStats {
  FighterId: number;
  FirstName: string;
  LastName: string;
  Winner: boolean;
  FantasyPoints: number;
  FantasyPointsDraftKings: number;
  Knockdowns: number;
  TotalStrikesAttempted: number;
  TotalStrikesLanded: number;
  SigStrikesAttempted: number;
  SigStrikesLanded: number;
  TakedownsAttempted: number;
  TakedownsLanded: number;
  TakedownsSlams: number;
  TakedownAccuracy: number;
  Advances: number;
  Reversals: number;
  Submissions: number;
  SlamRate: number;
  TimeInControl: number;
  FirstRoundWin: boolean;
  SecondRoundWin: boolean;
  ThirdRoundWin: boolean;
  FourthRoundWin: boolean;
  FifthRoundWin: boolean;
  DecisionWin: boolean;
}

export interface SportsDataFightWithStats extends SportsDataFight {
  FightStats: SportsDataFightStats[];
}

export interface SportsDataApiError {
  HttpStatusCode: number;
  Code: number;
  Description: string;
  Help: string;
}

// ============================================================================
// Configuration
// ============================================================================

const BASE_URLS = {
  scores: "https://api.sportsdata.io/v3/mma/scores/json",
  stats: "https://api.sportsdata.io/v3/mma/stats/json",
  odds: "https://api.sportsdata.io/v3/mma/odds/json",
};

// ============================================================================
// Error Classes
// ============================================================================

export class SportsDataApiException extends Error {
  public readonly httpStatus: number;
  public readonly code: number;

  constructor(error: SportsDataApiError) {
    super(error.Description);
    this.name = "SportsDataApiException";
    this.httpStatus = error.HttpStatusCode;
    this.code = error.Code;
  }
}

export class SportsDataUnauthorizedException extends SportsDataApiException {
  constructor(error: SportsDataApiError) {
    super(error);
    this.name = "SportsDataUnauthorizedException";
  }
}

// ============================================================================
// Type Guards
// ============================================================================

function isSportsDataError(response: unknown): response is SportsDataApiError {
  return (
    typeof response === "object" &&
    response !== null &&
    "HttpStatusCode" in response &&
    "Code" in response
  );
}

// ============================================================================
// API Client
// ============================================================================

export interface SportsDataProviderConfig {
  apiKey: string;
  timeout?: number;
}

export function createSportsDataProvider(config: SportsDataProviderConfig) {
  const { apiKey, timeout = 30000 } = config;

  async function fetchApi<T>(
    category: keyof typeof BASE_URLS,
    endpoint: string
  ): Promise<T> {
    if (!apiKey) {
      throw new Error("SportsData.io API key is not configured");
    }

    const url = `${BASE_URLS[category]}/${endpoint}?key=${apiKey}`;
    logger.debug(`Fetching ${category}/${endpoint}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (isSportsDataError(data)) {
        if (data.HttpStatusCode === 401) {
          throw new SportsDataUnauthorizedException(data);
        }
        throw new SportsDataApiException(data);
      }

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof SportsDataApiException) {
        throw error;
      }
      throw new Error(`Failed to fetch from SportsData.io: ${error}`);
    }
  }

  return {
    name: "SportsData.io",

    /**
     * Health check - test API connectivity
     */
    async healthCheck(): Promise<{
      status: "healthy" | "degraded" | "unhealthy";
      latencyMs: number;
      error?: string;
    }> {
      const start = Date.now();
      try {
        await fetchApi<unknown[]>("scores", "Leagues");
        return {
          status: "healthy",
          latencyMs: Date.now() - start,
        };
      } catch (error) {
        const latencyMs = Date.now() - start;
        if (error instanceof SportsDataUnauthorizedException) {
          return {
            status: "degraded",
            latencyMs,
            error: "API key requires paid subscription for some endpoints",
          };
        }
        return {
          status: "unhealthy",
          latencyMs,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },

    /**
     * Get UFC schedule for a year
     */
    async getSchedule(season: number): Promise<SportsDataEvent[]> {
      return fetchApi<SportsDataEvent[]>("scores", `Schedule/UFC/${season}`);
    },

    /**
     * Get all basic fighter info
     */
    async getFightersBasic(): Promise<SportsDataFighter[]> {
      return fetchApi<SportsDataFighter[]>("scores", "FightersBasic");
    },

    /**
     * Get event details with fight card
     */
    async getEvent(eventId: number): Promise<SportsDataEventWithFights> {
      return fetchApi<SportsDataEventWithFights>("scores", `Event/${eventId}`);
    },

    /**
     * Get fight statistics (final)
     */
    async getFightStats(fightId: number): Promise<SportsDataFightWithStats> {
      return fetchApi<SportsDataFightWithStats>("stats", `FightFinal/${fightId}`);
    },

    /**
     * Get upcoming events
     */
    async getUpcomingEvents(limit = 10): Promise<SportsDataEvent[]> {
      const currentYear = new Date().getFullYear();
      const schedule = await this.getSchedule(currentYear);
      const now = new Date();

      return schedule
        .filter((event) => new Date(event.DateTime) > now && event.Active)
        .sort(
          (a, b) =>
            new Date(a.DateTime).getTime() - new Date(b.DateTime).getTime()
        )
        .slice(0, limit);
    },

    /**
     * Get completed events
     */
    async getCompletedEvents(limit = 20): Promise<SportsDataEvent[]> {
      const currentYear = new Date().getFullYear();
      const schedule = await this.getSchedule(currentYear);
      const now = new Date();

      return schedule
        .filter(
          (event) =>
            (event.Status === "Final" || new Date(event.DateTime) < now) &&
            event.Active
        )
        .sort(
          (a, b) =>
            new Date(b.DateTime).getTime() - new Date(a.DateTime).getTime()
        )
        .slice(0, limit);
    },
  };
}

// ============================================================================
// Database Mappers
// ============================================================================

export function mapEventToDb(event: SportsDataEvent) {
  return {
    sportsdata_event_id: event.EventId,
    league_id: event.LeagueId,
    name: event.Name,
    short_name: event.ShortName,
    season: event.Season,
    event_day: event.Day ? event.Day.split("T")[0] : null,
    event_datetime: event.DateTime,
    status: event.Status,
    is_active: event.Active,
    raw_data: event,
    last_synced_at: new Date().toISOString(),
  };
}

export function mapFighterToDb(fighter: SportsDataFighter) {
  return {
    sportsdata_fighter_id: fighter.FighterId,
    first_name: fighter.FirstName,
    last_name: fighter.LastName,
    nickname: fighter.Nickname,
    weight_class: fighter.WeightClass,
    birth_date: fighter.BirthDate ? fighter.BirthDate.split("T")[0] : null,
    height_inches: fighter.Height,
    weight_lbs: fighter.Weight,
    reach_inches: fighter.Reach,
    wins: fighter.Wins,
    losses: fighter.Losses,
    draws: fighter.Draws,
    no_contests: fighter.NoContests,
    technical_knockouts: fighter.TechnicalKnockouts,
    technical_knockout_losses: fighter.TechnicalKnockoutLosses,
    submissions: fighter.Submissions,
    submission_losses: fighter.SubmissionLosses,
    title_wins: fighter.TitleWins,
    title_losses: fighter.TitleLosses,
    title_draws: fighter.TitleDraws,
    raw_data: fighter,
    last_synced_at: new Date().toISOString(),
  };
}

export function mapFightToDb(fight: SportsDataFight, eventId: number) {
  return {
    sportsdata_fight_id: fight.FightId,
    sportsdata_event_id: eventId,
    fight_order: fight.Order,
    status: fight.Status,
    weight_class: fight.WeightClass !== "Scrambled" ? fight.WeightClass : null,
    card_segment: fight.CardSegment,
    referee: fight.Referee,
    scheduled_rounds: fight.Rounds,
    result_clock_seconds: fight.ResultClock,
    result_round: fight.ResultRound,
    result_type: fight.ResultType !== "Scrambled" ? fight.ResultType : null,
    winner_sportsdata_id: fight.WinnerId,
    is_active: fight.Active,
    raw_data: fight,
    last_synced_at: new Date().toISOString(),
  };
}

export function mapFightFighterToDb(
  fightId: number,
  fighter: SportsDataFightFighter,
  corner: "red" | "blue"
) {
  return {
    sportsdata_fight_id: fightId,
    sportsdata_fighter_id: fighter.FighterId,
    corner,
    pre_fight_wins: fighter.PreFightWins,
    pre_fight_losses: fighter.PreFightLosses,
    pre_fight_draws: fighter.PreFightDraws,
    pre_fight_no_contests: fighter.PreFightNoContests,
    is_winner: fighter.Winner,
    moneyline: fighter.Moneyline,
    is_active: fighter.Active,
  };
}

export function mapFightStatsToDb(
  fightId: number,
  stats: SportsDataFightStats
) {
  return {
    sportsdata_fight_id: fightId,
    sportsdata_fighter_id: stats.FighterId,
    is_winner: stats.Winner,
    fantasy_points: stats.FantasyPoints,
    fantasy_points_draftkings: stats.FantasyPointsDraftKings,
    knockdowns: stats.Knockdowns,
    total_strikes_attempted: stats.TotalStrikesAttempted,
    total_strikes_landed: stats.TotalStrikesLanded,
    sig_strikes_attempted: stats.SigStrikesAttempted,
    sig_strikes_landed: stats.SigStrikesLanded,
    takedowns_attempted: stats.TakedownsAttempted,
    takedowns_landed: stats.TakedownsLanded,
    takedowns_slams: stats.TakedownsSlams,
    takedown_accuracy: stats.TakedownAccuracy,
    advances: stats.Advances,
    reversals: stats.Reversals,
    submissions: stats.Submissions,
    slam_rate: stats.SlamRate,
    time_in_control_seconds: Math.round(stats.TimeInControl),
    first_round_win: stats.FirstRoundWin,
    second_round_win: stats.SecondRoundWin,
    third_round_win: stats.ThirdRoundWin,
    fourth_round_win: stats.FourthRoundWin,
    fifth_round_win: stats.FifthRoundWin,
    decision_win: stats.DecisionWin,
    raw_data: stats,
  };
}
