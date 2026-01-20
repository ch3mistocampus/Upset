/**
 * Sync bouts/fights for upcoming UFC events from MMA API
 * Run with: node scripts/sync-mma-api-bouts.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const mmaApiKey = process.env.MMA_API_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials (need service role key)');
  process.exit(1);
}

if (!mmaApiKey) {
  console.error('Missing MMA_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const BASE_URL = 'https://mma-api1.p.rapidapi.com';

// Rate limiting
const DELAY_MS = 500;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchAPI(endpoint, params = {}) {
  const url = new URL(endpoint, BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'x-rapidapi-host': 'mma-api1.p.rapidapi.com',
      'x-rapidapi-key': mmaApiKey,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function getEventFightCard(espnEventId) {
  const data = await fetchAPI('/scoreboard-by-event', {
    eventId: espnEventId,
    league: 'ufc',
  });

  if (!data || !data.competitions) {
    return [];
  }

  const fights = [];

  // Reverse to get main event first (order_index 0 = main event)
  const competitions = [...data.competitions].reverse();

  for (let i = 0; i < competitions.length; i++) {
    const comp = competitions[i];
    const competitors = comp.competitors || [];

    if (competitors.length < 2) continue;

    // Red corner (order 1) and Blue corner (order 2)
    const red = competitors.find(c => c.order === 1) || competitors[0];
    const blue = competitors.find(c => c.order === 2) || competitors[1];

    // Determine scheduled rounds:
    // - Main event (order_index 0): 5 rounds
    // - Title/Championship fights: 5 rounds (check comp.type for "Championship" or "Title")
    // - Regular fights: 3 rounds
    const isMainEvent = i === 0;
    const isTitleFight = comp.type?.text?.toLowerCase()?.includes('title') ||
                         comp.type?.text?.toLowerCase()?.includes('championship');
    const scheduledRounds = (isMainEvent || isTitleFight) ? 5 : 3;

    fights.push({
      espn_fight_id: comp.id,
      order_index: i, // 0 = main event
      weight_class: comp.type?.abbreviation || comp.type?.text || null,
      scheduled_rounds: scheduledRounds,
      red_fighter_espn_id: red.id,
      blue_fighter_espn_id: blue.id,
      red_name: red.athlete?.displayName || 'TBD',
      blue_name: blue.athlete?.displayName || 'TBD',
      red_record: red.records?.[0]?.summary || null,
      blue_record: blue.records?.[0]?.summary || null,
    });
  }

  return fights;
}

async function syncBoutsForEvent(event) {
  console.log(`\n  Fetching fight card for ${event.name}...`);

  const fights = await getEventFightCard(event.espn_event_id);

  if (fights.length === 0) {
    console.log(`    No fights found for this event`);
    return { inserted: 0, updated: 0, skipped: 0 };
  }

  console.log(`    Found ${fights.length} fights`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const fight of fights) {
    // Generate a unique ufcstats_fight_id from ESPN data
    const ufcstatsFightId = `espn-${fight.espn_fight_id}`;

    // Check if bout exists
    const { data: existingBout } = await supabase
      .from('bouts')
      .select('id')
      .eq('ufcstats_fight_id', ufcstatsFightId)
      .single();

    if (existingBout) {
      // Update existing bout
      const { error } = await supabase
        .from('bouts')
        .update({
          order_index: fight.order_index,
          weight_class: fight.weight_class,
          scheduled_rounds: fight.scheduled_rounds,
          red_name: fight.red_name,
          blue_name: fight.blue_name,
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', existingBout.id);

      if (error) {
        console.log(`    [WARN] Failed to update bout: ${error.message}`);
      } else {
        updated++;
      }
      continue;
    }

    // Insert new bout
    const { error } = await supabase
      .from('bouts')
      .insert({
        ufcstats_fight_id: ufcstatsFightId,
        event_id: event.id,
        order_index: fight.order_index,
        weight_class: fight.weight_class,
        scheduled_rounds: fight.scheduled_rounds,
        red_fighter_ufcstats_id: `espn-${fight.red_fighter_espn_id}`,
        blue_fighter_ufcstats_id: `espn-${fight.blue_fighter_espn_id}`,
        red_name: fight.red_name,
        blue_name: fight.blue_name,
        status: 'scheduled',
        last_synced_at: new Date().toISOString(),
      });

    if (error) {
      if (error.code === '23505') {
        skipped++;
      } else {
        console.log(`    [WARN] Failed to insert bout: ${error.message}`);
      }
    } else {
      inserted++;
    }
  }

  // Log first few fights
  fights.slice(0, 3).forEach((f, i) => {
    const orderLabel = i === 0 ? 'MAIN' : i === 1 ? 'CO-MAIN' : `#${i + 1}`;
    console.log(`    [${orderLabel}] ${f.red_name} vs ${f.blue_name} (${f.weight_class})`);
  });
  if (fights.length > 3) {
    console.log(`    ... and ${fights.length - 3} more fights`);
  }

  return { inserted, updated, skipped };
}

async function main() {
  console.log('=== MMA API Bouts Sync ===\n');

  // Get all upcoming events with ESPN IDs
  const { data: events, error } = await supabase
    .from('events')
    .select('id, name, espn_event_id, event_date')
    .eq('status', 'upcoming')
    .not('espn_event_id', 'is', null)
    .order('event_date', { ascending: true });

  if (error) {
    console.error('Failed to fetch events:', error.message);
    process.exit(1);
  }

  console.log(`Found ${events.length} upcoming events with ESPN IDs\n`);

  let totalInserted = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let apiCalls = 0;

  for (const event of events) {
    const date = new Date(event.event_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    console.log(`\n[${date}] ${event.name}`);
    console.log(`  ESPN ID: ${event.espn_event_id}`);

    try {
      const result = await syncBoutsForEvent(event);
      totalInserted += result.inserted;
      totalUpdated += result.updated;
      totalSkipped += result.skipped;
      apiCalls++;

      console.log(`  Summary: ${result.inserted} new, ${result.updated} updated`);

      // Rate limit between events
      await sleep(DELAY_MS);
    } catch (err) {
      console.log(`  [ERROR] ${err.message}`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Events processed: ${events.length}`);
  console.log(`API calls made: ${apiCalls}`);
  console.log(`Bouts inserted: ${totalInserted}`);
  console.log(`Bouts updated: ${totalUpdated}`);
  console.log(`Bouts skipped: ${totalSkipped}`);

  // Verify
  console.log('\n=== Verification ===');
  const { data: boutCounts } = await supabase
    .from('events')
    .select(`
      name,
      event_date,
      bouts:bouts(count)
    `)
    .eq('status', 'upcoming')
    .order('event_date', { ascending: true })
    .limit(10);

  boutCounts?.forEach(e => {
    const date = new Date(e.event_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const count = e.bouts?.[0]?.count || 0;
    console.log(`  ${date} - ${e.name}: ${count} bouts`);
  });

  console.log('\nDone!');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
