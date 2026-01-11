/**
 * Sync fighter advanced statistics from UFCStats.com
 * Scrapes fighter pages and updates the database with stats like SLpM, Str. Acc., etc.
 *
 * Run with: node scripts/sync-fighter-stats.mjs
 * Options:
 *   --limit=N      Process only N fighters (default: all)
 *   --fighter=ID   Process single fighter by fighter_id
 *   --dry-run      Show what would be updated without making changes
 */

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials (need SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Rate limiting
const DELAY_MS = 800;
const REQUEST_TIMEOUT_MS = 30000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse a percentage string like "49%" to a number (49)
 */
function parsePercentage(text) {
  const match = text.match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Parse a decimal number from text like "5.32"
 */
function parseDecimal(text) {
  const match = text.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Fetch with retry and rate limiting
 */
async function fetchWithRetry(url, retries = 3) {
  let lastError = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      if (attempt > 0) {
        const backoff = DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`  Retry attempt ${attempt}, waiting ${backoff}ms`);
        await sleep(backoff);
      } else {
        await sleep(DELAY_MS);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      if (!html || html.length < 100) {
        throw new Error('Empty or invalid response');
      }

      return html;
    } catch (error) {
      lastError = error;
      console.error(`  Fetch attempt ${attempt + 1} failed:`, error.message);
    }
  }

  throw new Error(`Failed after ${retries} attempts: ${lastError?.message}`);
}

/**
 * Scrape fighter stats from UFCStats page
 */
async function scrapeFighterStats(fighterUrl) {
  const stats = {
    slpm: null,
    sapm: null,
    str_acc: null,
    str_def: null,
    td_avg: null,
    td_acc: null,
    td_def: null,
    sub_avg: null,
  };

  const html = await fetchWithRetry(fighterUrl);
  const $ = cheerio.load(html);

  // Find all stat items
  $('li.b-list__box-list-item').each((_, el) => {
    const $el = $(el);
    const titleEl = $el.find('i.b-list__box-item-title');
    const title = titleEl.text().trim().toLowerCase();
    const fullText = $el.text().trim();
    const titleText = titleEl.text().trim();
    const valueText = fullText.replace(titleText, '').trim();

    if (title.includes('slpm')) {
      stats.slpm = parseDecimal(valueText);
    } else if (title.includes('sapm')) {
      stats.sapm = parseDecimal(valueText);
    } else if (title.includes('str. acc')) {
      stats.str_acc = parsePercentage(valueText);
    } else if (title.includes('str. def')) {
      stats.str_def = parsePercentage(valueText);
    } else if (title.includes('td avg')) {
      stats.td_avg = parseDecimal(valueText);
    } else if (title.includes('td acc')) {
      stats.td_acc = parsePercentage(valueText);
    } else if (title.includes('td def')) {
      stats.td_def = parsePercentage(valueText);
    } else if (title.includes('sub. avg')) {
      stats.sub_avg = parseDecimal(valueText);
    }
  });

  return stats;
}

/**
 * Check if stats have any non-null values
 */
function hasStats(stats) {
  return Object.values(stats).some(v => v !== null);
}

async function main() {
  // Parse CLI args
  const args = process.argv.slice(2);
  const limit = args.find(a => a.startsWith('--limit='))?.split('=')[1];
  const singleFighter = args.find(a => a.startsWith('--fighter='))?.split('=')[1];
  const dryRun = args.includes('--dry-run');

  console.log('🥊 UFC Fighter Stats Sync\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  if (limit) console.log(`Limit: ${limit} fighters`);
  if (singleFighter) console.log(`Single fighter: ${singleFighter}`);
  console.log('');

  // Fetch fighters that need stats
  let query = supabase
    .from('ufc_fighters')
    .select('fighter_id, full_name, ufcstats_url')
    .not('ufcstats_url', 'is', null);

  if (singleFighter) {
    query = query.eq('fighter_id', singleFighter);
  } else {
    // Only get fighters missing stats
    query = query
      .or('slpm.is.null,sapm.is.null,str_acc.is.null')
      .order('full_name', { ascending: true });
  }

  if (limit) {
    query = query.limit(parseInt(limit));
  }

  const { data: fighters, error: fetchError } = await query;

  if (fetchError) {
    console.error('❌ Failed to fetch fighters:', fetchError.message);
    process.exit(1);
  }

  if (!fighters || fighters.length === 0) {
    console.log('✅ All fighters already have stats populated!');
    return;
  }

  console.log(`📋 Found ${fighters.length} fighters needing stats\n`);

  let updated = 0;
  let failed = 0;
  let noStats = 0;

  for (let i = 0; i < fighters.length; i++) {
    const fighter = fighters[i];
    const progress = `[${i + 1}/${fighters.length}]`;

    process.stdout.write(`${progress} ${fighter.full_name}... `);

    try {
      const stats = await scrapeFighterStats(fighter.ufcstats_url);

      if (!hasStats(stats)) {
        console.log('⚪ No stats found');
        noStats++;
        continue;
      }

      if (dryRun) {
        console.log(`🔍 Would update: SLpM=${stats.slpm}, Acc=${stats.str_acc}%, TD=${stats.td_avg}`);
      } else {
        const { error: updateError } = await supabase
          .from('ufc_fighters')
          .update({
            slpm: stats.slpm,
            sapm: stats.sapm,
            str_acc: stats.str_acc,
            str_def: stats.str_def,
            td_avg: stats.td_avg,
            td_acc: stats.td_acc,
            td_def: stats.td_def,
            sub_avg: stats.sub_avg,
          })
          .eq('fighter_id', fighter.fighter_id);

        if (updateError) {
          console.log(`❌ ${updateError.message}`);
          failed++;
        } else {
          console.log(`✅ SLpM=${stats.slpm}, Acc=${stats.str_acc}%, TD=${stats.td_avg}`);
          updated++;
        }
      }
    } catch (err) {
      console.log(`❌ ${err.message}`);
      failed++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  ✅ Updated: ${updated}`);
  console.log(`  ⚪ No stats: ${noStats}`);
  console.log(`  ❌ Failed: ${failed}`);

  if (!dryRun && updated > 0) {
    // Verify stats were populated
    const { data: sample } = await supabase
      .from('ufc_fighters')
      .select('full_name, slpm, str_acc, td_avg')
      .not('slpm', 'is', null)
      .order('slpm', { ascending: false })
      .limit(5);

    console.log('\n🏆 Top 5 by SLpM:');
    sample?.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.full_name} - ${f.slpm} SLpM, ${f.str_acc}% acc`);
    });
  }

  console.log('\n✅ Done!');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
