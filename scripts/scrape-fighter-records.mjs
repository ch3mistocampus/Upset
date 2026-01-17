/**
 * Scrape Fighter Records from UFCStats.com
 *
 * Fetches full MMA career records for fighters that currently have
 * UFC-only records in the database.
 *
 * Usage:
 *   SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/scrape-fighter-records.mjs
 *
 * Options:
 *   --dry-run    Show what would be updated without making changes
 *   --limit=N    Only process N fighters (for testing)
 *   --all        Process all fighters, not just those with UFC-only records
 */

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

// Configuration
const DELAY_MS = 800; // Rate limiting between requests
const REQUEST_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ALL_FIGHTERS = args.includes('--all');
const limitArg = args.find(a => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing environment variables:');
  if (!supabaseUrl) console.error('  - SUPABASE_URL');
  if (!serviceRoleKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

/**
 * Sleep utility for rate limiting
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with retry logic and timeout
 */
async function fetchWithRetry(url, retries = MAX_RETRIES) {
  let lastError = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      if (attempt > 0) {
        const backoff = DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`  Retry ${attempt}, waiting ${backoff}ms...`);
        await sleep(backoff);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      lastError = error;
      console.error(`  Attempt ${attempt + 1} failed:`, error.message);
    }
  }

  throw new Error(`Failed after ${retries} attempts: ${lastError?.message}`);
}

/**
 * Parse fighter record from UFCStats page HTML
 * Record format on page: "Record: 26-5-0 (W-L-D)"
 */
function parseRecordFromHtml(html) {
  const $ = cheerio.load(html);

  // Try to find the record in the fighter info section
  // UFCStats format: "Record: 26-5-0"
  let recordText = null;

  // Method 1: Look for record in the main info list
  $('li.b-list__box-list-item').each((_, el) => {
    const text = $(el).text();
    if (text.includes('Record:')) {
      recordText = text;
    }
  });

  // Method 2: Look in any element containing "Record:"
  if (!recordText) {
    $('*').each((_, el) => {
      const text = $(el).text();
      if (text.includes('Record:') && text.match(/\d+-\d+/)) {
        recordText = text;
        return false; // break
      }
    });
  }

  if (!recordText) {
    return null;
  }

  // Parse the record: "Record: 26-5-0" or "26-5-0 (1 NC)"
  const match = recordText.match(/Record:\s*(\d+)-(\d+)-(\d+)/);
  if (!match) {
    // Try alternate pattern without "Record:" prefix
    const altMatch = recordText.match(/(\d+)-(\d+)-(\d+)/);
    if (altMatch) {
      return {
        wins: parseInt(altMatch[1], 10),
        losses: parseInt(altMatch[2], 10),
        draws: parseInt(altMatch[3], 10),
      };
    }
    return null;
  }

  return {
    wins: parseInt(match[1], 10),
    losses: parseInt(match[2], 10),
    draws: parseInt(match[3], 10),
  };
}

// Check for --low-records flag
const LOW_RECORDS = args.includes('--low-records');

/**
 * Get fighters that need their records updated
 */
async function getFightersToUpdate() {
  console.log('\nFetching fighters from database...');

  if (ALL_FIGHTERS) {
    // Get all fighters with a UFCStats URL
    const { data, error } = await supabase
      .from('ufc_fighters')
      .select('fighter_id, full_name, ufcstats_url, record_wins, record_losses, record_draws')
      .not('ufcstats_url', 'is', null)
      .order('full_name');

    if (error) throw error;
    return data || [];
  }

  if (LOW_RECORDS) {
    // Get fighters with low total records (likely have pre-UFC careers not captured)
    console.log('  Mode: Low record fighters (wins + losses < 10)');
    const { data, error } = await supabase
      .from('ufc_fighters')
      .select('fighter_id, full_name, ufcstats_url, record_wins, record_losses, record_draws')
      .not('ufcstats_url', 'is', null)
      .lt('record_wins', 10)
      .order('full_name');

    if (error) throw error;
    return data || [];
  }

  // Get fighters whose records match their UFC-only record (potentially overwritten)
  // This query finds fighters where their current record equals what we can calculate from UFC fights
  const { data, error } = await supabase.rpc('get_fighters_with_ufc_only_records');

  if (error) {
    // If RPC doesn't exist, fall back to fetching all fighters and we'll filter client-side
    console.log('  RPC not found, fetching all fighters for comparison...');

    // Get all fighters with URLs
    const { data: allFighters, error: fetchError } = await supabase
      .from('ufc_fighters')
      .select('fighter_id, full_name, ufcstats_url, record_wins, record_losses, record_draws')
      .not('ufcstats_url', 'is', null);

    if (fetchError) throw fetchError;

    // Get UFC fight records
    const { data: ufcRecords, error: recordsError } = await supabase
      .from('ufc_fights')
      .select('winner_fighter_id, loser_fighter_id')
      .not('winner_fighter_id', 'is', null);

    if (recordsError) throw recordsError;

    // Calculate UFC-only records
    const ufcWins = new Map();
    const ufcLosses = new Map();

    for (const fight of ufcRecords || []) {
      if (fight.winner_fighter_id) {
        ufcWins.set(fight.winner_fighter_id, (ufcWins.get(fight.winner_fighter_id) || 0) + 1);
      }
      if (fight.loser_fighter_id) {
        ufcLosses.set(fight.loser_fighter_id, (ufcLosses.get(fight.loser_fighter_id) || 0) + 1);
      }
    }

    // Filter to fighters whose records match UFC-only
    const fightersToUpdate = (allFighters || []).filter(f => {
      const ufcW = ufcWins.get(f.fighter_id) || 0;
      const ufcL = ufcLosses.get(f.fighter_id) || 0;

      // Only include if they have UFC fights AND their record matches UFC-only
      if (ufcW === 0 && ufcL === 0) return false;

      return f.record_wins === ufcW && f.record_losses === ufcL;
    });

    return fightersToUpdate;
  }

  return data || [];
}

/**
 * Update fighter record in database
 */
async function updateFighterRecord(fighterId, record) {
  if (DRY_RUN) {
    return { success: true };
  }

  const { error } = await supabase
    .from('ufc_fighters')
    .update({
      record_wins: record.wins,
      record_losses: record.losses,
      record_draws: record.draws,
      updated_at: new Date().toISOString(),
    })
    .eq('fighter_id', fighterId);

  if (error) {
    return { success: false, error };
  }

  return { success: true };
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(60));
  console.log('UFC Fighter Record Scraper');
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('\n*** DRY RUN MODE - No changes will be made ***\n');
  }

  if (ALL_FIGHTERS) {
    console.log('Mode: All fighters with UFCStats URLs');
  } else {
    console.log('Mode: Fighters with UFC-only records');
  }

  if (LIMIT) {
    console.log(`Limit: ${LIMIT} fighters`);
  }

  // Get fighters to update
  let fighters = await getFightersToUpdate();
  console.log(`Found ${fighters.length} fighters to process`);

  if (LIMIT && fighters.length > LIMIT) {
    fighters = fighters.slice(0, LIMIT);
    console.log(`Limited to ${LIMIT} fighters`);
  }

  if (fighters.length === 0) {
    console.log('\nNo fighters to update!');
    return;
  }

  // Process fighters
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  const changes = [];

  console.log('\nProcessing fighters...\n');

  for (let i = 0; i < fighters.length; i++) {
    const fighter = fighters[i];
    const progress = `[${i + 1}/${fighters.length}]`;

    if (!fighter.ufcstats_url) {
      console.log(`${progress} ${fighter.full_name}: No URL, skipping`);
      skipped++;
      continue;
    }

    process.stdout.write(`${progress} ${fighter.full_name}... `);

    try {
      // Rate limit
      if (i > 0) {
        await sleep(DELAY_MS);
      }

      // Fetch and parse
      const html = await fetchWithRetry(fighter.ufcstats_url);
      const record = parseRecordFromHtml(html);

      if (!record) {
        console.log('Could not parse record');
        errors++;
        continue;
      }

      // Check if different from current
      const currentRecord = `${fighter.record_wins}-${fighter.record_losses}-${fighter.record_draws}`;
      const newRecord = `${record.wins}-${record.losses}-${record.draws}`;

      if (currentRecord === newRecord) {
        console.log(`${newRecord} (no change)`);
        skipped++;
        continue;
      }

      // Update
      const result = await updateFighterRecord(fighter.fighter_id, record);

      if (result.success) {
        console.log(`${currentRecord} -> ${newRecord}`);
        updated++;
        changes.push({
          name: fighter.full_name,
          from: currentRecord,
          to: newRecord,
        });
      } else {
        console.log(`Update failed: ${result.error?.message}`);
        errors++;
      }
    } catch (error) {
      console.log(`Error: ${error.message}`);
      errors++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`  Total processed: ${fighters.length}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped (no change): ${skipped}`);
  console.log(`  Errors: ${errors}`);

  if (DRY_RUN && changes.length > 0) {
    console.log('\nChanges that would be made:');
    for (const change of changes.slice(0, 20)) {
      console.log(`  ${change.name}: ${change.from} -> ${change.to}`);
    }
    if (changes.length > 20) {
      console.log(`  ... and ${changes.length - 20} more`);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
