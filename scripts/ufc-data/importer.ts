/**
 * UFC Data Importer
 *
 * Upserts transformed data into Supabase tables.
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { BATCH_SIZE, LOG, SNAPSHOTS_DIR } from './config.ts';
import { transformSnapshot, TransformedData, FighterRecord, EventRecord, FightRecord, FightStatsRecord } from './transformer.ts';

// ============================================================================
// Types
// ============================================================================

export interface ImportResult {
  success: boolean;
  snapshotId: string;
  counts: {
    fighters: { inserted: number; updated: number; errors: number };
    events: { inserted: number; updated: number; errors: number };
    fights: { inserted: number; updated: number; errors: number };
    fightStats: { inserted: number; updated: number; errors: number };
  };
  errors: string[];
  duration: number;
}

// ============================================================================
// Supabase Client
// ============================================================================

function createSupabaseClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !serviceKey) {
    throw new Error(
      'Missing environment variables. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ============================================================================
// Batch Upsert Functions
// ============================================================================

/**
 * Upsert records in batches with error handling
 */
async function batchUpsert<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  tableName: string,
  records: T[],
  conflictColumn: string,
  batchSize: number = BATCH_SIZE
): Promise<{ inserted: number; updated: number; errors: number; errorMessages: string[] }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;
  const errorMessages: string[] = [];

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    try {
      const { error, count } = await supabase
        .from(tableName)
        .upsert(batch, {
          onConflict: conflictColumn,
          ignoreDuplicates: false,
        })
        .select('*');

      if (error) {
        throw error;
      }

      // Count as updated (upsert doesn't distinguish)
      updated += batch.length;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errorMessages.push(`Batch ${Math.floor(i / batchSize) + 1}: ${msg}`);
      errors += batch.length;

      // Try individual inserts for this batch
      for (const record of batch) {
        try {
          const { error: singleError } = await supabase
            .from(tableName)
            .upsert(record, { onConflict: conflictColumn });

          if (singleError) {
            errors++;
            errorMessages.push(`Record: ${JSON.stringify(record).slice(0, 100)}... - ${singleError.message}`);
          } else {
            updated++;
            errors--; // Subtract from batch error count
          }
        } catch {
          // Already counted in batch errors
        }
      }
    }

    // Progress logging
    const processed = Math.min(i + batchSize, records.length);
    if (processed % 1000 === 0 || processed === records.length) {
      LOG.debug(`  ${tableName}: ${processed}/${records.length} processed`);
    }
  }

  return { inserted, updated, errors, errorMessages };
}

// ============================================================================
// Table-Specific Import Functions
// ============================================================================

/**
 * Create or update snapshot record
 */
async function upsertSnapshot(
  supabase: SupabaseClient,
  snapshotId: string,
  summary: TransformedData['summary']
): Promise<void> {
  const { error } = await supabase.from('ufc_source_snapshots').upsert({
    snapshot_id: snapshotId,
    source: 'greco1899',
    fetched_at: new Date().toISOString(),
    row_counts: {
      fighters: summary.fighterCount,
      events: summary.eventCount,
      fights: summary.fightCount,
      fight_stats: summary.fightStatsCount,
    },
    notes: `Imported via ufc-data pipeline. Skipped: ${JSON.stringify(summary.skipped)}`,
  }, { onConflict: 'snapshot_id' });

  if (error) {
    throw new Error(`Failed to create snapshot record: ${error.message}`);
  }
}

/**
 * Import fighters
 */
async function importFighters(
  supabase: SupabaseClient,
  fighters: FighterRecord[],
  snapshotId: string
): Promise<{ inserted: number; updated: number; errors: number; errorMessages: string[] }> {
  LOG.info(`Importing ${fighters.length} fighters...`);

  const records = fighters.map(f => ({
    fighter_id: f.fighter_id,
    first_name: f.first_name,
    last_name: f.last_name,
    full_name: f.full_name,
    nickname: f.nickname,
    dob: f.dob,
    height_inches: f.height_inches,
    weight_lbs: f.weight_lbs,
    reach_inches: f.reach_inches,
    stance: f.stance,
    ufcstats_url: f.ufcstats_url,
    source_snapshot_id: snapshotId,
  }));

  return batchUpsert(supabase, 'ufc_fighters', records, 'fighter_id');
}

/**
 * Import events
 */
async function importEvents(
  supabase: SupabaseClient,
  events: EventRecord[],
  snapshotId: string
): Promise<{ inserted: number; updated: number; errors: number; errorMessages: string[] }> {
  LOG.info(`Importing ${events.length} events...`);

  const records = events.map(e => ({
    event_id: e.event_id,
    name: e.name,
    event_date: e.event_date,
    location: e.location,
    ufcstats_url: e.ufcstats_url,
    source_snapshot_id: snapshotId,
  }));

  return batchUpsert(supabase, 'ufc_events', records, 'event_id');
}

/**
 * Import fights
 */
async function importFights(
  supabase: SupabaseClient,
  fights: FightRecord[],
  snapshotId: string
): Promise<{ inserted: number; updated: number; errors: number; errorMessages: string[] }> {
  LOG.info(`Importing ${fights.length} fights...`);

  const records = fights.map(f => ({
    fight_id: f.fight_id,
    event_id: f.event_id,
    bout_order: f.bout_order,
    weight_class: f.weight_class,
    is_title_fight: f.is_title_fight,
    scheduled_rounds: f.scheduled_rounds,
    red_fighter_id: f.red_fighter_id,
    blue_fighter_id: f.blue_fighter_id,
    red_fighter_name: f.red_fighter_name,
    blue_fighter_name: f.blue_fighter_name,
    winner_fighter_id: f.winner_fighter_id,
    loser_fighter_id: f.loser_fighter_id,
    result_method: f.result_method,
    result_method_details: f.result_method_details,
    result_round: f.result_round,
    result_time_seconds: f.result_time_seconds,
    referee: f.referee,
    ufcstats_url: f.ufcstats_url,
    source_snapshot_id: snapshotId,
  }));

  return batchUpsert(supabase, 'ufc_fights', records, 'fight_id');
}

/**
 * Import fight stats
 */
async function importFightStats(
  supabase: SupabaseClient,
  fightStats: FightStatsRecord[],
  snapshotId: string
): Promise<{ inserted: number; updated: number; errors: number; errorMessages: string[] }> {
  LOG.info(`Importing ${fightStats.length} fight stats...`);

  const records = fightStats.map(s => ({
    id: s.id,
    fight_id: s.fight_id,
    fighter_id: s.fighter_id,
    opponent_id: s.opponent_id,
    round: s.round,
    is_total: s.is_total,
    knockdowns: s.knockdowns,
    sig_str_landed: s.sig_str_landed,
    sig_str_attempted: s.sig_str_attempted,
    total_str_landed: s.total_str_landed,
    total_str_attempted: s.total_str_attempted,
    td_landed: s.td_landed,
    td_attempted: s.td_attempted,
    sub_attempts: s.sub_attempts,
    reversals: s.reversals,
    ctrl_time_seconds: s.ctrl_time_seconds,
    head_landed: s.head_landed,
    head_attempted: s.head_attempted,
    body_landed: s.body_landed,
    body_attempted: s.body_attempted,
    leg_landed: s.leg_landed,
    leg_attempted: s.leg_attempted,
    distance_landed: s.distance_landed,
    distance_attempted: s.distance_attempted,
    clinch_landed: s.clinch_landed,
    clinch_attempted: s.clinch_attempted,
    ground_landed: s.ground_landed,
    ground_attempted: s.ground_attempted,
    source_snapshot_id: snapshotId,
  }));

  return batchUpsert(supabase, 'ufc_fight_stats', records, 'id');
}

// ============================================================================
// Main Import Function
// ============================================================================

/**
 * Import a transformed snapshot into Supabase
 */
export async function importSnapshot(snapshotId: string): Promise<ImportResult> {
  const startTime = Date.now();
  const allErrors: string[] = [];

  LOG.info('🚀 UFC Data Importer');
  LOG.info('='.repeat(50));
  LOG.info(`Snapshot: ${snapshotId}`);

  // Create Supabase client
  const supabase = createSupabaseClient();

  // Transform data
  LOG.step(1, 'Transforming data...');
  const data = await transformSnapshot(snapshotId);

  // Create snapshot record
  LOG.step(2, 'Creating snapshot record...');
  await upsertSnapshot(supabase, snapshotId, data.summary);

  // Import in order (respecting foreign key constraints)
  LOG.step(3, 'Importing fighters...');
  const fighterResult = await importFighters(supabase, data.fighters, snapshotId);
  allErrors.push(...fighterResult.errorMessages);

  LOG.step(4, 'Importing events...');
  const eventResult = await importEvents(supabase, data.events, snapshotId);
  allErrors.push(...eventResult.errorMessages);

  LOG.step(5, 'Importing fights...');
  const fightResult = await importFights(supabase, data.fights, snapshotId);
  allErrors.push(...fightResult.errorMessages);

  LOG.step(6, 'Importing fight stats...');
  const statsResult = await importFightStats(supabase, data.fightStats, snapshotId);
  allErrors.push(...statsResult.errorMessages);

  const duration = Date.now() - startTime;

  const result: ImportResult = {
    success: allErrors.length === 0,
    snapshotId,
    counts: {
      fighters: fighterResult,
      events: eventResult,
      fights: fightResult,
      fightStats: statsResult,
    },
    errors: allErrors,
    duration,
  };

  // Save report
  const reportPath = `${SNAPSHOTS_DIR}/${snapshotId}/report.json`;
  await Deno.writeTextFile(reportPath, JSON.stringify(result, null, 2));

  // Summary
  LOG.info('\n' + '='.repeat(50));
  LOG.info('Import Summary:');
  LOG.info(`  Fighters: ${fighterResult.updated} updated, ${fighterResult.errors} errors`);
  LOG.info(`  Events: ${eventResult.updated} updated, ${eventResult.errors} errors`);
  LOG.info(`  Fights: ${fightResult.updated} updated, ${fightResult.errors} errors`);
  LOG.info(`  Fight Stats: ${statsResult.updated} updated, ${statsResult.errors} errors`);
  LOG.info(`  Duration: ${(duration / 1000).toFixed(1)}s`);
  LOG.info(`  Report saved: ${reportPath}`);

  if (allErrors.length > 0) {
    LOG.error(`\n${allErrors.length} errors occurred:`);
    allErrors.slice(0, 10).forEach(e => LOG.error(`  - ${e}`));
    if (allErrors.length > 10) {
      LOG.error(`  ... and ${allErrors.length - 10} more`);
    }
  }

  return result;
}

// CLI entry point
if (import.meta.main) {
  const snapshotId = Deno.args[0];

  if (!snapshotId) {
    console.log('Usage: deno run --allow-net --allow-env --allow-read --allow-write importer.ts <snapshot_id>');
    console.log('\nEnvironment variables required:');
    console.log('  SUPABASE_URL');
    console.log('  SUPABASE_SERVICE_ROLE_KEY');
    Deno.exit(1);
  }

  try {
    const result = await importSnapshot(snapshotId);

    // Output result for scripting
    console.log('\nIMPORT_RESULT=' + JSON.stringify({
      success: result.success,
      errorCount: result.errors.length,
      duration: result.duration,
    }));

    Deno.exit(result.success ? 0 : 1);
  } catch (error) {
    LOG.error(`Fatal error: ${error}`);
    Deno.exit(1);
  }
}
