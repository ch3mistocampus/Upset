/**
 * Import UFC Fighter Stats from local CSV files
 *
 * Imports all UFC fighters from locally downloaded CSV files
 * Files should be in scripts/data/ directory
 *
 * Usage:
 *   SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/import-all-fighters.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CSV_FILES = {
  fighter_details: join(__dirname, 'data', 'ufc_fighter_details.csv'),
  fighter_tott: join(__dirname, 'data', 'ufc_fighter_tott.csv'),
};

// Simple CSV parser
function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx];
      });
      rows.push(row);
    }
  }

  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// Extract fighter ID from UFCStats URL
function extractFighterId(url) {
  if (!url) return null;
  const match = url.match(/fighter-details\/([a-f0-9]+)$/);
  return match ? match[1] : null;
}

// Parse height string to inches
function parseHeight(height) {
  if (!height || height === '--') return null;
  const match = height.match(/(\d+)'\s*(\d+)?/);
  if (!match) return null;
  const feet = parseInt(match[1], 10);
  const inches = parseInt(match[2] || '0', 10);
  return feet * 12 + inches;
}

// Parse weight string to pounds
function parseWeight(weight) {
  if (!weight || weight === '--') return null;
  const match = weight.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// Parse reach string to inches
function parseReach(reach) {
  if (!reach || reach === '--') return null;
  const match = reach.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// Parse date string
function parseDate(dateStr) {
  if (!dateStr || dateStr === '--') return null;
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
}

function loadCSV(filepath) {
  console.log(`  Loading ${filepath}...`);
  const text = readFileSync(filepath, 'utf-8');
  const rows = parseCSV(text);
  console.log(`    Found ${rows.length} rows`);
  return rows;
}

async function main() {
  console.log('='.repeat(60));
  console.log('UFC Fighter Import - Full Database');
  console.log('='.repeat(60));

  // Check environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('\nMissing environment variables:');
    if (!supabaseUrl) console.error('  - SUPABASE_URL');
    if (!serviceRoleKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY');
    console.error('\nUsage:');
    console.error('  SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/import-all-fighters.mjs');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Step 1: Load CSV files
  console.log('\n[1] Loading CSV files...');

  const fighterDetails = loadCSV(CSV_FILES.fighter_details);
  const fighterTott = loadCSV(CSV_FILES.fighter_tott);

  // Step 2: Create snapshot record
  console.log('\n[2] Creating source snapshot...');

  const snapshotId = `import_${Date.now()}`;
  const { error: snapshotError } = await supabase
    .from('ufc_source_snapshots')
    .upsert({
      snapshot_id: snapshotId,
      source: 'greco1899_github',
      fetched_at: new Date().toISOString(),
      git_ref: 'main',
      notes: 'Full import from local CSV files (Greco1899/scrape_ufc_stats)',
      row_counts: {
        fighter_details: fighterDetails.length,
        fighter_tott: fighterTott.length,
      },
    }, { onConflict: 'snapshot_id' });

  if (snapshotError) {
    console.error('Error creating snapshot:', snapshotError);
    process.exit(1);
  }
  console.log(`  Snapshot created: ${snapshotId}`);

  // Step 3: Merge fighter data
  console.log('\n[3] Merging fighter data...');

  // Create lookup map by URL for tott data
  const tottByUrl = new Map();
  for (const row of fighterTott) {
    if (row.URL) {
      tottByUrl.set(row.URL, row);
    }
  }

  // Merge fighters
  const fighters = [];
  const seenIds = new Set();

  for (const detail of fighterDetails) {
    const fighterId = extractFighterId(detail.URL);
    if (!fighterId || seenIds.has(fighterId)) continue;
    seenIds.add(fighterId);

    const tott = tottByUrl.get(detail.URL) || {};

    const fighter = {
      fighter_id: fighterId,
      first_name: detail.FIRST || null,
      last_name: detail.LAST || null,
      full_name: `${detail.FIRST || ''} ${detail.LAST || ''}`.trim() || 'Unknown',
      nickname: detail.NICKNAME || null,
      dob: parseDate(tott.DOB),
      height_inches: parseHeight(tott.HEIGHT),
      weight_lbs: parseWeight(tott.WEIGHT),
      reach_inches: parseReach(tott.REACH),
      stance: tott.STANCE && tott.STANCE !== '--' ? tott.STANCE : null,
      record_wins: 0,
      record_losses: 0,
      record_draws: 0,
      record_nc: 0,
      ufcstats_url: detail.URL || null,
      source_snapshot_id: snapshotId,
    };

    fighters.push(fighter);
  }

  console.log(`  Merged ${fighters.length} unique fighters`);

  // Step 4: Insert fighters in batches
  console.log('\n[4] Inserting fighters into database...');

  const BATCH_SIZE = 500;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < fighters.length; i += BATCH_SIZE) {
    const batch = fighters.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('ufc_fighters')
      .upsert(batch, { onConflict: 'fighter_id' });

    if (error) {
      console.error(`  Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }

    // Progress indicator
    const progress = Math.round(((i + batch.length) / fighters.length) * 100);
    process.stdout.write(`\r  Progress: ${progress}% (${inserted} inserted, ${errors} errors)`);
  }

  console.log('\n');

  // Summary
  console.log('='.repeat(60));
  console.log('Import Complete!');
  console.log('='.repeat(60));
  console.log(`  Total fighters: ${fighters.length}`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Snapshot ID: ${snapshotId}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
