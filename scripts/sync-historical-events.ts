/**
 * Sync Historical Events Script
 *
 * Syncs real UFC event data including:
 * 1. All events (past and future) from UFCStats.com
 * 2. Fight cards for the last 5 completed events
 * 3. Results for completed events
 *
 * Run with: deno run --allow-net --allow-env scripts/sync-historical-events.ts
 *
 * Requirements:
 * - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const HISTORICAL_EVENT_COUNT = 5;
const DELAY_MS = 2000; // Delay between edge function calls to avoid rate limiting

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callEdgeFunction(
  supabaseUrl: string,
  serviceKey: string,
  functionName: string,
  params: Record<string, string> = {}
): Promise<any> {
  const queryString = Object.keys(params).length > 0
    ? '?' + new URLSearchParams(params).toString()
    : '';

  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}${queryString}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${functionName} failed: ${response.status} - ${text}`);
  }

  return await response.json();
}

async function main() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables:');
    console.error('   export SUPABASE_URL="https://your-project.supabase.co"');
    console.error('   export SUPABASE_SERVICE_ROLE_KEY="your-service-key"');
    Deno.exit(1);
  }

  console.log('🚀 Syncing Historical UFC Event Data...\n');
  console.log('='.repeat(60));

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // =========================================================================
  // Step 1: Sync All Events (Past + Future)
  // =========================================================================
  console.log('\n📅 STEP 1: Syncing ALL UFC Events from UFCStats.com...\n');

  try {
    const eventsResult = await callEdgeFunction(supabaseUrl, supabaseServiceKey, 'sync-events');

    if (eventsResult.success) {
      console.log(`✅ Events synced successfully!`);
      console.log(`   Inserted: ${eventsResult.inserted}`);
      console.log(`   Updated: ${eventsResult.updated}`);
      console.log(`   Total: ${eventsResult.total}`);
    } else {
      console.log(`⚠️  Events sync warning: ${eventsResult.error || 'Unknown'}`);
    }
  } catch (error) {
    console.error(`❌ Failed to sync events: ${(error as Error).message}`);
    Deno.exit(1);
  }

  await sleep(DELAY_MS);

  // =========================================================================
  // Step 2: Get Last N Completed Events from Database
  // =========================================================================
  console.log(`\n📊 STEP 2: Finding last ${HISTORICAL_EVENT_COUNT} completed events...\n`);

  const { data: completedEvents, error: eventsError } = await supabase
    .from('events')
    .select('id, ufcstats_event_id, name, event_date, status')
    .eq('status', 'completed')
    .order('event_date', { ascending: false })
    .limit(HISTORICAL_EVENT_COUNT);

  if (eventsError) {
    console.error(`❌ Failed to query completed events: ${eventsError.message}`);
    Deno.exit(1);
  }

  if (!completedEvents || completedEvents.length === 0) {
    console.log('⚠️  No completed events found in database.');
    console.log('   This might happen if events are marked as "upcoming".');
    console.log('   Will proceed to sync next event card...');
  } else {
    console.log(`✅ Found ${completedEvents.length} completed events:`);
    completedEvents.forEach((event, i) => {
      console.log(`   ${i + 1}. ${event.name} (${new Date(event.event_date).toLocaleDateString()})`);
    });
  }

  // =========================================================================
  // Step 3: Sync Fight Cards for Each Completed Event
  // =========================================================================
  console.log(`\n🥊 STEP 3: Syncing fight cards for completed events...\n`);

  for (const event of completedEvents || []) {
    console.log(`   Syncing: ${event.name}...`);

    try {
      const cardResult = await callEdgeFunction(
        supabaseUrl,
        supabaseServiceKey,
        'sync-next-event-card',
        { event_id: event.id }
      );

      if (cardResult.success) {
        const boutCount = cardResult.bouts_count || cardResult.inserted + cardResult.updated || 0;
        console.log(`   ✅ ${boutCount} bouts synced`);
      } else {
        console.log(`   ⚠️  Warning: ${cardResult.error || 'Unknown'}`);
      }
    } catch (error) {
      console.error(`   ❌ Failed: ${(error as Error).message}`);
    }

    await sleep(DELAY_MS);
  }

  // =========================================================================
  // Step 4: Sync Results for Each Completed Event
  // =========================================================================
  console.log(`\n🏆 STEP 4: Syncing results for completed events...\n`);

  let totalResultsSynced = 0;

  // Re-fetch completed events to include those we just synced cards for
  const { data: eventsForResults } = await supabase
    .from('events')
    .select('id, name')
    .eq('status', 'completed')
    .order('event_date', { ascending: false })
    .limit(HISTORICAL_EVENT_COUNT);

  for (const event of eventsForResults || []) {
    console.log(`   Syncing results: ${event.name}...`);

    try {
      const resultsResult = await callEdgeFunction(
        supabaseUrl,
        supabaseServiceKey,
        'sync-recent-results-and-grade',
        { event_id: event.id }
      );

      if (resultsResult.success) {
        const synced = resultsResult.results_synced || 0;
        totalResultsSynced += synced;
        console.log(`   ✅ ${synced} results synced`);
      } else {
        console.log(`   ⚠️  Warning: ${resultsResult.error || 'Unknown'}`);
      }
    } catch (error) {
      console.error(`   ❌ Failed: ${(error as Error).message}`);
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n   Total results synced: ${totalResultsSynced}`);

  // =========================================================================
  // Step 5: Also Sync Next Upcoming Event
  // =========================================================================
  console.log(`\n📅 STEP 5: Syncing next upcoming event card...\n`);

  try {
    const nextCardResult = await callEdgeFunction(
      supabaseUrl,
      supabaseServiceKey,
      'sync-next-event-card'
    );

    if (nextCardResult.success) {
      console.log(`✅ Next event synced: ${nextCardResult.event_name || 'Unknown'}`);
      console.log(`   Bouts: ${nextCardResult.bouts_count || nextCardResult.inserted + nextCardResult.updated || 0}`);
    } else {
      console.log(`⚠️  Warning: ${nextCardResult.error || 'Unknown'}`);
    }
  } catch (error) {
    console.error(`❌ Failed: ${(error as Error).message}`);
  }

  // =========================================================================
  // Summary
  // =========================================================================
  console.log('\n' + '='.repeat(60));
  console.log('✨ HISTORICAL DATA SYNC COMPLETE!');
  console.log('='.repeat(60));

  // Verify what's in the database now
  const { count: eventCount } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true });

  const { count: boutCount } = await supabase
    .from('bouts')
    .select('*', { count: 'exact', head: true });

  const { count: resultCount } = await supabase
    .from('results')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Database Summary:`);
  console.log(`   Events: ${eventCount || 0}`);
  console.log(`   Bouts: ${boutCount || 0}`);
  console.log(`   Results: ${resultCount || 0}`);

  console.log(`\n💡 Next step: Run seed-real-historical-data.ts to create test user picks`);
}

if (import.meta.main) {
  main().catch(error => {
    console.error('Fatal error:', error);
    Deno.exit(1);
  });
}
