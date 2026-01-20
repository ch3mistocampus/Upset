/**
 * SportsData.io MMA API Type Definitions
 *
 * API Documentation: https://sportsdata.io/developers/api-documentation/mma
 * These types match the API response structure.
 */

// ============================================================================
// League
// ============================================================================

export interface SportsDataLeague {
  LeagueId: number;
  Name: string;
  Key: string;
}

// ============================================================================
// Schedule & Events
// ============================================================================

export interface SportsDataEvent {
  EventId: number;
  LeagueId: number;
  Name: string;
  ShortName: string;
  Season: number;
  Day: string; // ISO date
  DateTime: string; // ISO datetime
  Status: SportsDataEventStatus;
  Active: boolean;
}

export type SportsDataEventStatus =
  | 'Scheduled'
  | 'InProgress'
  | 'Final'
  | 'Postponed'
  | 'Canceled';

// ============================================================================
// Fighters
// ============================================================================

export interface SportsDataFighterBasic {
  FighterId: number;
  FirstName: string;
  LastName: string;
  Nickname: string | null;
  WeightClass: string;
  BirthDate: string | null; // ISO date
  Height: number | null; // inches
  Weight: number | null; // lbs
  Reach: number | null; // inches
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

// Full fighter profile (requires paid subscription)
export interface SportsDataFighter extends SportsDataFighterBasic {
  // Additional fields available in full endpoint
  CareerStats?: SportsDataCareerStats;
}

export interface SportsDataCareerStats {
  SigStrikesLandedPerMinute?: number;
  SigStrikesAbsorbedPerMinute?: number;
  TakedownAverage?: number;
  SubmissionAverage?: number;
  KnockdownAverage?: number;
  AverageFightTime?: number;
}

// ============================================================================
// Fights & Bouts
// ============================================================================

export interface SportsDataEventWithFights extends SportsDataEvent {
  Fights: SportsDataFight[];
}

export interface SportsDataFight {
  FightId: number;
  Order: number;
  Status: string;
  WeightClass: string;
  CardSegment: string;
  Referee: string | null;
  Rounds: number;
  ResultClock: number | null; // seconds
  ResultRound: number | null;
  ResultType: string | null;
  WinnerId: number | null;
  Active: boolean;
  Fighters: SportsDataFightFighter[];
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

// ============================================================================
// Fight Statistics
// ============================================================================

export interface SportsDataFightWithStats extends SportsDataFight {
  FightStats: SportsDataFightStats[];
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
  TimeInControl: number; // seconds
  FirstRoundWin: boolean;
  SecondRoundWin: boolean;
  ThirdRoundWin: boolean;
  FourthRoundWin: boolean;
  FifthRoundWin: boolean;
  DecisionWin: boolean;
}

// ============================================================================
// Betting & Odds (requires paid subscription)
// ============================================================================

export interface SportsDataEventOdds {
  EventId: number;
  Name: string;
  DateTime: string;
  FightOdds: SportsDataFightOdds[];
}

export interface SportsDataFightOdds {
  FightId: number;
  WeightClass: string;
  Fighters: SportsDataFighterOdds[];
}

export interface SportsDataFighterOdds {
  FighterId: number;
  FirstName: string;
  LastName: string;
  Moneyline: number;
  MoneylineMovement: number;
  OpeningMoneyline: number;
}

export interface SportsDataBettingMarket {
  BettingMarketId: number;
  BettingEventId: number;
  BettingMarketTypeId: number;
  BettingMarketType: string;
  BettingBetTypeId: number;
  BettingBetType: string;
  BettingPeriodTypeId: number;
  BettingPeriodType: string;
  Name: string;
  FightId: number;
  TeamId: number | null;
  TeamKey: string | null;
  PlayerId: number | null;
  Created: string;
  Updated: string;
  ConsensusOutcomes: SportsDataConsensusOutcome[];
}

export interface SportsDataConsensusOutcome {
  BettingOutcomeId: number;
  BettingMarketId: number;
  SportsbookId: number;
  SportsbookName: string;
  PayoutAmerican: number;
  PayoutDecimal: number;
  Value: number;
  Participant: string;
  IsAvailable: boolean;
  IsAlternate: boolean;
  Created: string;
  Updated: string;
}

// ============================================================================
// API Response Wrappers
// ============================================================================

export interface SportsDataApiError {
  HttpStatusCode: number;
  Code: number;
  Description: string;
  Help: string;
}

// Type guard for API errors
export function isSportsDataError(response: unknown): response is SportsDataApiError {
  return (
    typeof response === 'object' &&
    response !== null &&
    'HttpStatusCode' in response &&
    'Code' in response
  );
}
