/**
 * SportsData.io to Database Schema Mappers
 *
 * Functions to transform SportsData.io API responses into your database schema.
 */

import {
  SportsDataEvent,
  SportsDataFighterBasic,
  SportsDataFight,
  SportsDataFightStats,
  SportsDataEventWithFights,
} from './types';

import type {
  Event,
  Bout,
  Result,
  UFCFighter
} from '../../types/database';

// ============================================================================
// ID Mapping
// ============================================================================

/**
 * Create a lookup key for mapping SportsData IDs to internal IDs
 * You'll need to maintain a mapping table for this
 */
export interface IdMapping {
  sportsdata_id: number;
  internal_id: string;
  entity_type: 'event' | 'fighter' | 'fight';
}

// ============================================================================
// Event Mappers
// ============================================================================

/**
 * Map SportsData event to your Event schema
 */
export function mapSportsDataEvent(
  sdEvent: SportsDataEvent,
  existingId?: string
): Omit<Event, 'created_at'> {
  return {
    id: existingId || crypto.randomUUID(),
    ufcstats_event_id: `sd_${sdEvent.EventId}`, // Prefix to distinguish from UFCStats IDs
    name: sdEvent.Name,
    event_date: sdEvent.DateTime,
    location: null, // Not available in basic endpoint
    status: mapEventStatus(sdEvent.Status),
    last_synced_at: new Date().toISOString(),
  };
}

/**
 * Map SportsData event status to your schema
 */
function mapEventStatus(sdStatus: string): 'upcoming' | 'in_progress' | 'completed' {
  switch (sdStatus) {
    case 'Scheduled':
      return 'upcoming';
    case 'InProgress':
      return 'in_progress';
    case 'Final':
    case 'Canceled':
    case 'Postponed':
      return 'completed';
    default:
      return 'upcoming';
  }
}

// ============================================================================
// Fighter Mappers
// ============================================================================

/**
 * Map SportsData fighter to your UFCFighter schema
 * Note: Career stats (slpm, sapm, etc.) are not available from SportsData
 */
export function mapSportsDataFighter(
  sdFighter: SportsDataFighterBasic,
  snapshotId: string
): Omit<UFCFighter, 'created_at' | 'updated_at'> {
  const fullName = `${sdFighter.FirstName} ${sdFighter.LastName}`.trim();
  const wins = sdFighter.Wins || 0;
  const koWins = sdFighter.TechnicalKnockouts || 0;
  const subWins = sdFighter.Submissions || 0;
  const decisionWins = Math.max(0, wins - koWins - subWins);

  return {
    fighter_id: `sd_${sdFighter.FighterId}`, // Prefix to distinguish from UFCStats IDs
    first_name: sdFighter.FirstName || null,
    last_name: sdFighter.LastName || null,
    full_name: fullName,
    nickname: sdFighter.Nickname,
    dob: sdFighter.BirthDate ? sdFighter.BirthDate.split('T')[0] : null,
    height_inches: sdFighter.Height ? Math.round(sdFighter.Height) : null,
    weight_lbs: sdFighter.Weight ? Math.round(sdFighter.Weight) : null,
    reach_inches: sdFighter.Reach ? Math.round(sdFighter.Reach) : null,
    stance: null, // Not available from SportsData
    record_wins: wins,
    record_losses: sdFighter.Losses || 0,
    record_draws: sdFighter.Draws || 0,
    record_nc: sdFighter.NoContests || 0,

    // Career stats - NOT AVAILABLE from SportsData
    // Would need to calculate from historical fight data
    slpm: null,
    sapm: null,
    str_acc: null,
    str_def: null,
    td_avg: null,
    td_acc: null,
    td_def: null,
    sub_avg: null,

    ufcstats_url: null,
    source_snapshot_id: snapshotId,
    ranking: null, // Not available from SportsData
    weight_class: mapWeightClass(sdFighter.WeightClass),
    espn_fighter_id: null,

    // Win method breakdown - Available from SportsData
    ko_tko_wins: koWins,
    submission_wins: subWins,
    decision_wins: decisionWins,
    ko_percentage: wins > 0 ? (koWins / wins) * 100 : 0,
    sub_percentage: wins > 0 ? (subWins / wins) * 100 : 0,
  };
}

/**
 * Normalize weight class names
 */
function mapWeightClass(sdWeightClass: string): string | null {
  const normalized: Record<string, string> = {
    'Strawweight': "Women's Strawweight",
    'Flyweight': 'Flyweight',
    'Bantamweight': 'Bantamweight',
    'Featherweight': 'Featherweight',
    'Lightweight': 'Lightweight',
    'Welterweight': 'Welterweight',
    'Middleweight': 'Middleweight',
    'Light Heavyweight': 'Light Heavyweight',
    'Heavyweight': 'Heavyweight',
    "Women's Strawweight": "Women's Strawweight",
    "Women's Flyweight": "Women's Flyweight",
    "Women's Bantamweight": "Women's Bantamweight",
    "Women's Featherweight": "Women's Featherweight",
  };

  return normalized[sdWeightClass] || sdWeightClass || null;
}

// ============================================================================
// Bout/Fight Mappers
// ============================================================================

/**
 * Map SportsData fight to your Bout schema
 */
export function mapSportsDataFight(
  sdFight: SportsDataFight,
  eventId: string,
  fighterIdMap: Map<number, string> // Map SportsData fighter IDs to your IDs
): Omit<Bout, 'created_at'> {
  const redFighter = sdFight.Fighters[0];
  const blueFighter = sdFight.Fighters[1];

  return {
    id: crypto.randomUUID(),
    ufcstats_fight_id: `sd_${sdFight.FightId}`,
    event_id: eventId,
    order_index: sdFight.Order,
    weight_class: sdFight.WeightClass !== 'Scrambled' ? sdFight.WeightClass : null,
    red_fighter_ufcstats_id: redFighter ? `sd_${redFighter.FighterId}` : '',
    blue_fighter_ufcstats_id: blueFighter ? `sd_${blueFighter.FighterId}` : '',
    red_name: redFighter ? `${redFighter.FirstName} ${redFighter.LastName}` : 'TBD',
    blue_name: blueFighter ? `${blueFighter.FirstName} ${blueFighter.LastName}` : 'TBD',
    status: mapFightStatus(sdFight.Status, sdFight.WinnerId),
    card_snapshot: 1,
    scheduled_rounds: sdFight.Rounds || 3,
    last_synced_at: new Date().toISOString(),
  };
}

function mapFightStatus(sdStatus: string, winnerId: number | null): 'scheduled' | 'completed' | 'canceled' | 'replaced' {
  if (sdStatus === 'Canceled') return 'canceled';
  if (winnerId !== null) return 'completed';
  if (sdStatus === 'Final') return 'completed';
  return 'scheduled';
}

/**
 * Map SportsData fight result to your Result schema
 */
export function mapSportsDataResult(
  sdFight: SportsDataFight,
  boutId: string
): Result | null {
  // No result if fight hasn't been decided
  if (sdFight.WinnerId === null && sdFight.Status !== 'Final') {
    return null;
  }

  const redFighter = sdFight.Fighters[0];
  const blueFighter = sdFight.Fighters[1];

  let winnerCorner: 'red' | 'blue' | 'draw' | 'nc' | null = null;

  if (sdFight.WinnerId) {
    if (redFighter && sdFight.WinnerId === redFighter.FighterId) {
      winnerCorner = 'red';
    } else if (blueFighter && sdFight.WinnerId === blueFighter.FighterId) {
      winnerCorner = 'blue';
    }
  }

  // Handle no contest or draw
  if (sdFight.ResultType === 'Draw') {
    winnerCorner = 'draw';
  } else if (sdFight.ResultType === 'No Contest' || sdFight.ResultType === 'NC') {
    winnerCorner = 'nc';
  }

  return {
    bout_id: boutId,
    winner_corner: winnerCorner,
    method: mapResultMethod(sdFight.ResultType),
    round: sdFight.ResultRound,
    time: sdFight.ResultClock ? formatFightTime(sdFight.ResultClock) : null,
    details: null,
    synced_at: new Date().toISOString(),
  };
}

/**
 * Map SportsData result type to your method format
 * Note: ResultType may be "Scrambled" in trial mode
 */
function mapResultMethod(sdResultType: string | null): string | null {
  if (!sdResultType || sdResultType === 'Scrambled') {
    return null;
  }

  const methodMap: Record<string, string> = {
    'KO': 'KO/TKO',
    'TKO': 'KO/TKO',
    'Submission': 'Submission',
    'SUB': 'Submission',
    'Decision': 'Decision',
    'DEC': 'Decision',
    'Unanimous Decision': 'Decision - Unanimous',
    'Split Decision': 'Decision - Split',
    'Majority Decision': 'Decision - Majority',
    'Draw': 'Draw',
    'No Contest': 'No Contest',
    'NC': 'No Contest',
    'DQ': 'Disqualification',
  };

  return methodMap[sdResultType] || sdResultType;
}

/**
 * Format fight time from seconds to MM:SS
 */
function formatFightTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================================
// Batch Processing
// ============================================================================

/**
 * Map an entire event with fights to your schema
 */
export function mapFullEvent(
  sdEvent: SportsDataEventWithFights,
  existingEventId?: string
): {
  event: Omit<Event, 'created_at'>;
  bouts: Omit<Bout, 'created_at'>[];
  results: Result[];
} {
  const event = mapSportsDataEvent(sdEvent, existingEventId);

  const bouts: Omit<Bout, 'created_at'>[] = [];
  const results: Result[] = [];

  for (const fight of sdEvent.Fights || []) {
    const bout = mapSportsDataFight(fight, event.id, new Map());
    bouts.push(bout);

    const result = mapSportsDataResult(fight, bout.id);
    if (result) {
      results.push(result);
    }
  }

  return { event, bouts, results };
}

// ============================================================================
// ID Matching Utilities
// ============================================================================

/**
 * Attempt to match a SportsData fighter to your existing fighter by name
 * Returns the matched internal ID or null
 */
export function findMatchingFighter(
  sdFighter: SportsDataFighterBasic,
  existingFighters: Array<{ fighter_id: string; full_name: string }>
): string | null {
  const sdName = `${sdFighter.FirstName} ${sdFighter.LastName}`.toLowerCase().trim();

  for (const existing of existingFighters) {
    if (existing.full_name.toLowerCase().trim() === sdName) {
      return existing.fighter_id;
    }
  }

  return null;
}

/**
 * Attempt to match a SportsData event to your existing event by name and date
 */
export function findMatchingEvent(
  sdEvent: SportsDataEvent,
  existingEvents: Array<{ id: string; name: string; event_date: string }>
): string | null {
  const sdDate = new Date(sdEvent.DateTime).toDateString();

  for (const existing of existingEvents) {
    const existingDate = new Date(existing.event_date).toDateString();

    // Match by date and similar name
    if (existingDate === sdDate) {
      // Check for name similarity (contains event number or main event)
      if (
        existing.name.toLowerCase().includes(sdEvent.ShortName.toLowerCase()) ||
        sdEvent.Name.toLowerCase().includes(existing.name.toLowerCase())
      ) {
        return existing.id;
      }
    }
  }

  return null;
}
