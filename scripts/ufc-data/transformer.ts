/**
 * UFC Data Transformer
 *
 * Normalizes CSV data into database-ready format.
 */

import {
  extractIdFromUrl,
  parseHeightToInches,
  parseWeight,
  parseReach,
  parseDate,
  parseTimeToSeconds,
  parseCtrlTime,
  parseOfFormat,
  parseScheduledRounds,
  isTitleFight,
  parseWeightClass,
  LOG,
} from './config.ts';
import { getSnapshotData } from './validator.ts';

// ============================================================================
// Types
// ============================================================================

export interface TransformedData {
  fighters: FighterRecord[];
  events: EventRecord[];
  fights: FightRecord[];
  fightStats: FightStatsRecord[];
  summary: TransformSummary;
}

export interface TransformSummary {
  fighterCount: number;
  eventCount: number;
  fightCount: number;
  fightStatsCount: number;
  warnings: string[];
  skipped: {
    fighters: number;
    events: number;
    fights: number;
    fightStats: number;
  };
}

export interface FighterRecord {
  fighter_id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  nickname: string | null;
  dob: string | null; // ISO date string
  height_inches: number | null;
  weight_lbs: number | null;
  reach_inches: number | null;
  stance: string | null;
  ufcstats_url: string;
}

export interface EventRecord {
  event_id: string;
  name: string;
  event_date: string | null; // ISO date string
  location: string | null;
  ufcstats_url: string;
}

export interface FightRecord {
  fight_id: string;
  event_id: string;
  bout_order: number | null;
  weight_class: string | null;
  is_title_fight: boolean;
  scheduled_rounds: number;
  red_fighter_id: string | null;
  blue_fighter_id: string | null;
  red_fighter_name: string;
  blue_fighter_name: string;
  winner_fighter_id: string | null;
  loser_fighter_id: string | null;
  result_method: string | null;
  result_method_details: string | null;
  result_round: number | null;
  result_time_seconds: number | null;
  referee: string | null;
  ufcstats_url: string;
}

export interface FightStatsRecord {
  id: string;
  fight_id: string;
  fighter_id: string;
  opponent_id: string | null;
  round: number | null;
  is_total: boolean;
  knockdowns: number;
  sig_str_landed: number;
  sig_str_attempted: number;
  total_str_landed: number;
  total_str_attempted: number;
  td_landed: number;
  td_attempted: number;
  sub_attempts: number;
  reversals: number;
  ctrl_time_seconds: number;
  head_landed: number;
  head_attempted: number;
  body_landed: number;
  body_attempted: number;
  leg_landed: number;
  leg_attempted: number;
  distance_landed: number;
  distance_attempted: number;
  clinch_landed: number;
  clinch_attempted: number;
  ground_landed: number;
  ground_attempted: number;
}

// ============================================================================
// Transformer Functions
// ============================================================================

/**
 * Transform fighters from fighter_details + fighter_tott CSVs
 */
function transformFighters(
  fighterDetails: Record<string, string>[],
  fighterTott: Record<string, string>[]
): { fighters: FighterRecord[]; skipped: number; warnings: string[] } {
  const warnings: string[] = [];
  let skipped = 0;

  // Build URL -> tott data lookup
  const tottByUrl = new Map<string, Record<string, string>>();
  for (const row of fighterTott) {
    if (row.URL) {
      tottByUrl.set(row.URL, row);
    }
  }

  // Process fighter details
  const fighters: FighterRecord[] = [];
  const seenIds = new Set<string>();

  for (const row of fighterDetails) {
    const url = row.URL;
    if (!url) {
      skipped++;
      continue;
    }

    const fighterId = extractIdFromUrl(url, 'fighter');
    if (!fighterId) {
      warnings.push(`Could not extract fighter ID from URL: ${url}`);
      skipped++;
      continue;
    }

    // Skip duplicates
    if (seenIds.has(fighterId)) {
      continue;
    }
    seenIds.add(fighterId);

    // Merge with tott data
    const tott = tottByUrl.get(url) || {};

    const firstName = row.FIRST?.trim() || null;
    const lastName = row.LAST?.trim() || null;
    const fullName = tott.FIGHTER?.trim() || `${firstName || ''} ${lastName || ''}`.trim();

    if (!fullName) {
      warnings.push(`Fighter has no name: ${url}`);
      skipped++;
      continue;
    }

    fighters.push({
      fighter_id: fighterId,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      nickname: row.NICKNAME?.trim() || null,
      dob: tott.DOB ? parseDate(tott.DOB)?.toISOString().split('T')[0] || null : null,
      height_inches: tott.HEIGHT ? parseHeightToInches(tott.HEIGHT) : null,
      weight_lbs: tott.WEIGHT ? parseWeight(tott.WEIGHT) : null,
      reach_inches: tott.REACH ? parseReach(tott.REACH) : null,
      stance: tott.STANCE?.trim() || null,
      ufcstats_url: url,
    });
  }

  return { fighters, skipped, warnings };
}

/**
 * Transform events from event_details CSV
 */
function transformEvents(
  eventDetails: Record<string, string>[]
): { events: EventRecord[]; eventIdByName: Map<string, string>; skipped: number; warnings: string[] } {
  const warnings: string[] = [];
  let skipped = 0;

  const events: EventRecord[] = [];
  const seenIds = new Set<string>();
  const eventIdByName = new Map<string, string>();

  for (const row of eventDetails) {
    const url = row.URL;
    if (!url) {
      skipped++;
      continue;
    }

    const eventId = extractIdFromUrl(url, 'event');
    if (!eventId) {
      warnings.push(`Could not extract event ID from URL: ${url}`);
      skipped++;
      continue;
    }

    if (seenIds.has(eventId)) {
      continue;
    }
    seenIds.add(eventId);

    const name = row.EVENT?.trim();
    if (!name) {
      warnings.push(`Event has no name: ${url}`);
      skipped++;
      continue;
    }

    // Store mapping for fight lookups
    eventIdByName.set(name, eventId);

    events.push({
      event_id: eventId,
      name,
      event_date: row.DATE ? parseDate(row.DATE)?.toISOString().split('T')[0] || null : null,
      location: row.LOCATION?.trim() || null,
      ufcstats_url: url,
    });
  }

  return { events, eventIdByName, skipped, warnings };
}

/**
 * Parse bout string "Fighter A vs. Fighter B" into fighter names
 */
function parseBoutString(bout: string): { redName: string; blueName: string } | null {
  if (!bout) return null;

  // Handle "vs." or "vs" separator
  const parts = bout.split(/\s+vs\.?\s+/i);
  if (parts.length !== 2) {
    return null;
  }

  return {
    redName: parts[0].trim(),
    blueName: parts[1].trim(),
  };
}

/**
 * Build fighter name to ID lookup
 */
function buildFighterLookup(fighters: FighterRecord[]): Map<string, string> {
  const lookup = new Map<string, string>();

  for (const f of fighters) {
    // Add full name
    lookup.set(f.full_name.toLowerCase(), f.fighter_id);

    // Add first + last combo
    if (f.first_name && f.last_name) {
      lookup.set(`${f.first_name} ${f.last_name}`.toLowerCase(), f.fighter_id);
    }
  }

  return lookup;
}

/**
 * Transform fights from fight_results CSV
 */
function transformFights(
  fightResults: Record<string, string>[],
  eventIdByName: Map<string, string>,
  fighterLookup: Map<string, string>
): { fights: FightRecord[]; fightIdByBoutEvent: Map<string, string>; skipped: number; warnings: string[] } {
  const warnings: string[] = [];
  let skipped = 0;

  const fights: FightRecord[] = [];
  const seenIds = new Set<string>();
  const fightIdByBoutEvent = new Map<string, string>();
  const boutOrderByEvent = new Map<string, number>();

  for (const row of fightResults) {
    const url = row.URL;
    if (!url) {
      skipped++;
      continue;
    }

    const fightId = extractIdFromUrl(url, 'fight');
    if (!fightId) {
      warnings.push(`Could not extract fight ID from URL: ${url}`);
      skipped++;
      continue;
    }

    if (seenIds.has(fightId)) {
      continue;
    }
    seenIds.add(fightId);

    // Find event
    const eventName = row.EVENT?.trim();
    const eventId = eventName ? eventIdByName.get(eventName) : null;

    if (!eventId) {
      warnings.push(`Could not find event for fight: ${eventName}`);
      skipped++;
      continue;
    }

    // Parse bout
    const bout = parseBoutString(row.BOUT);
    if (!bout) {
      warnings.push(`Could not parse bout: ${row.BOUT}`);
      skipped++;
      continue;
    }

    // Track bout order within event
    const currentOrder = boutOrderByEvent.get(eventId) || 0;
    boutOrderByEvent.set(eventId, currentOrder + 1);

    // Create lookup key for stats matching
    const boutKey = `${eventName}||${row.BOUT}`;
    fightIdByBoutEvent.set(boutKey, fightId);

    // Find fighter IDs
    const redFighterId = fighterLookup.get(bout.redName.toLowerCase()) || null;
    const blueFighterId = fighterLookup.get(bout.blueName.toLowerCase()) || null;

    // Parse outcome (format: "L/W" means red lost, blue won)
    let winnerFighterId: string | null = null;
    let loserFighterId: string | null = null;

    const outcome = row.OUTCOME?.trim();
    if (outcome === 'L/W') {
      // Red lost, blue won
      winnerFighterId = blueFighterId;
      loserFighterId = redFighterId;
    } else if (outcome === 'W/L') {
      // Red won, blue lost
      winnerFighterId = redFighterId;
      loserFighterId = blueFighterId;
    }
    // For draws, NC, etc., both are null

    fights.push({
      fight_id: fightId,
      event_id: eventId,
      bout_order: currentOrder + 1,
      weight_class: row.WEIGHTCLASS ? parseWeightClass(row.WEIGHTCLASS) : null,
      is_title_fight: row.WEIGHTCLASS ? isTitleFight(row.WEIGHTCLASS) : false,
      scheduled_rounds: row['TIME FORMAT'] ? parseScheduledRounds(row['TIME FORMAT']) : 3,
      red_fighter_id: redFighterId,
      blue_fighter_id: blueFighterId,
      red_fighter_name: bout.redName,
      blue_fighter_name: bout.blueName,
      winner_fighter_id: winnerFighterId,
      loser_fighter_id: loserFighterId,
      result_method: row.METHOD?.trim() || null,
      result_method_details: row.DETAILS?.trim() || null,
      result_round: row.ROUND ? parseInt(row.ROUND, 10) || null : null,
      result_time_seconds: row.TIME ? parseTimeToSeconds(row.TIME) : null,
      referee: row.REFEREE?.trim() || null,
      ufcstats_url: url,
    });
  }

  return { fights, fightIdByBoutEvent, skipped, warnings };
}

/**
 * Transform fight stats from fight_stats CSV
 */
function transformFightStats(
  fightStatsRaw: Record<string, string>[],
  fightIdByBoutEvent: Map<string, string>,
  fighterLookup: Map<string, string>
): { fightStats: FightStatsRecord[]; skipped: number; warnings: string[] } {
  const warnings: string[] = [];
  let skipped = 0;

  const fightStats: FightStatsRecord[] = [];
  const seenIds = new Set<string>();

  // Group stats by fight + fighter to compute totals
  const statsByFightFighter = new Map<string, Record<string, string>[]>();

  for (const row of fightStatsRaw) {
    const eventName = row.EVENT?.trim();
    const boutStr = row.BOUT?.trim();

    if (!eventName || !boutStr) {
      skipped++;
      continue;
    }

    const boutKey = `${eventName}||${boutStr}`;
    const fightId = fightIdByBoutEvent.get(boutKey);

    if (!fightId) {
      // This is common for fights that failed validation
      skipped++;
      continue;
    }

    const fighterName = row.FIGHTER?.trim();
    if (!fighterName) {
      skipped++;
      continue;
    }

    const fighterId = fighterLookup.get(fighterName.toLowerCase());
    if (!fighterId) {
      // Fighter not in our database
      skipped++;
      continue;
    }

    // Determine opponent
    const bout = parseBoutString(boutStr);
    let opponentId: string | null = null;
    if (bout) {
      const opponentName = fighterName.toLowerCase() === bout.redName.toLowerCase()
        ? bout.blueName
        : bout.redName;
      opponentId = fighterLookup.get(opponentName.toLowerCase()) || null;
    }

    // Parse round
    const roundStr = row.ROUND?.trim();
    const isTotal = roundStr?.toLowerCase() === 'total' || roundStr?.toLowerCase() === 'totals';
    const round = isTotal ? null : (parseInt(roundStr || '0', 10) || null);

    // Generate unique ID
    const statId = `${fightId}_${fighterId}_${isTotal ? 'total' : `r${round}`}`;

    if (seenIds.has(statId)) {
      continue;
    }
    seenIds.add(statId);

    // Parse strike stats
    const sigStr = parseOfFormat(row['SIG.STR.'] || '');
    const totalStr = parseOfFormat(row['TOTAL STR.'] || '');
    const td = parseOfFormat(row['TD'] || '');
    const head = parseOfFormat(row['HEAD'] || '');
    const body = parseOfFormat(row['BODY'] || '');
    const leg = parseOfFormat(row['LEG'] || '');
    const distance = parseOfFormat(row['DISTANCE'] || '');
    const clinch = parseOfFormat(row['CLINCH'] || '');
    const ground = parseOfFormat(row['GROUND'] || '');

    fightStats.push({
      id: statId,
      fight_id: fightId,
      fighter_id: fighterId,
      opponent_id: opponentId,
      round,
      is_total: isTotal,
      knockdowns: parseInt(row['KD'] || '0', 10) || 0,
      sig_str_landed: sigStr.landed,
      sig_str_attempted: sigStr.attempted,
      total_str_landed: totalStr.landed,
      total_str_attempted: totalStr.attempted,
      td_landed: td.landed,
      td_attempted: td.attempted,
      sub_attempts: parseInt(row['SUB.ATT'] || '0', 10) || 0,
      reversals: parseInt(row['REV.'] || '0', 10) || 0,
      ctrl_time_seconds: parseCtrlTime(row['CTRL'] || ''),
      head_landed: head.landed,
      head_attempted: head.attempted,
      body_landed: body.landed,
      body_attempted: body.attempted,
      leg_landed: leg.landed,
      leg_attempted: leg.attempted,
      distance_landed: distance.landed,
      distance_attempted: distance.attempted,
      clinch_landed: clinch.landed,
      clinch_attempted: clinch.attempted,
      ground_landed: ground.landed,
      ground_attempted: ground.attempted,
    });
  }

  return { fightStats, skipped, warnings };
}

// ============================================================================
// Main Transform Function
// ============================================================================

/**
 * Transform all snapshot data into database-ready format
 */
export async function transformSnapshot(snapshotId: string): Promise<TransformedData> {
  LOG.step(1, 'Loading snapshot data...');
  const data = await getSnapshotData(snapshotId);

  const allWarnings: string[] = [];

  // Transform fighters
  LOG.step(2, 'Transforming fighters...');
  const { fighters, skipped: fighterSkipped, warnings: fighterWarnings } =
    transformFighters(data.fighter_details, data.fighter_tott);
  allWarnings.push(...fighterWarnings);
  LOG.info(`  Fighters: ${fighters.length} (skipped: ${fighterSkipped})`);

  // Build fighter lookup for subsequent transforms
  const fighterLookup = buildFighterLookup(fighters);

  // Transform events
  LOG.step(3, 'Transforming events...');
  const { events, eventIdByName, skipped: eventSkipped, warnings: eventWarnings } =
    transformEvents(data.event_details);
  allWarnings.push(...eventWarnings);
  LOG.info(`  Events: ${events.length} (skipped: ${eventSkipped})`);

  // Transform fights
  LOG.step(4, 'Transforming fights...');
  const { fights, fightIdByBoutEvent, skipped: fightSkipped, warnings: fightWarnings } =
    transformFights(data.fight_results, eventIdByName, fighterLookup);
  allWarnings.push(...fightWarnings);
  LOG.info(`  Fights: ${fights.length} (skipped: ${fightSkipped})`);

  // Transform fight stats
  LOG.step(5, 'Transforming fight statistics...');
  const { fightStats, skipped: statsSkipped, warnings: statsWarnings } =
    transformFightStats(data.fight_stats, fightIdByBoutEvent, fighterLookup);
  allWarnings.push(...statsWarnings);
  LOG.info(`  Fight stats: ${fightStats.length} (skipped: ${statsSkipped})`);

  // Summary
  const summary: TransformSummary = {
    fighterCount: fighters.length,
    eventCount: events.length,
    fightCount: fights.length,
    fightStatsCount: fightStats.length,
    warnings: allWarnings,
    skipped: {
      fighters: fighterSkipped,
      events: eventSkipped,
      fights: fightSkipped,
      fightStats: statsSkipped,
    },
  };

  LOG.step(6, 'Transform complete');
  if (allWarnings.length > 0) {
    LOG.warn(`${allWarnings.length} warnings generated`);
  }

  return {
    fighters,
    events,
    fights,
    fightStats,
    summary,
  };
}

// CLI entry point
if (import.meta.main) {
  const snapshotId = Deno.args[0];

  if (!snapshotId) {
    console.log('Usage: deno run --allow-read transformer.ts <snapshot_id>');
    Deno.exit(1);
  }

  LOG.info('🔄 UFC Data Transformer');
  LOG.info('='.repeat(50));

  const result = await transformSnapshot(snapshotId);

  LOG.info('\n' + '='.repeat(50));
  LOG.info('Summary:');
  LOG.info(`  Fighters: ${result.summary.fighterCount}`);
  LOG.info(`  Events: ${result.summary.eventCount}`);
  LOG.info(`  Fights: ${result.summary.fightCount}`);
  LOG.info(`  Fight Stats: ${result.summary.fightStatsCount}`);
}
