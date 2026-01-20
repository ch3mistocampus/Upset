/**
 * Sync upcoming UFC events from MMA API (ESPN data)
 * Run with: node scripts/sync-mma-api-events.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const mmaApiKey = process.env.MMA_API_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials (need service role key)');
  process.exit(1);
}

if (!mmaApiKey) {
  console.error('❌ Missing MMA_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const BASE_URL = 'https://mma-api1.p.rapidapi.com';

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

async function getUpcomingEvents() {
  const year = new Date().getFullYear();
  const data = await fetchAPI('/schedule', { year: year.toString(), league: 'ufc' });

  // Response is keyed by date (YYYYMMDD)
  const events = [];
  const now = new Date();

  for (const [dateKey, dayEvents] of Object.entries(data)) {
    if (!Array.isArray(dayEvents)) continue;

    for (const event of dayEvents) {
      // Skip non-UFC events (like PFL)
      if (!event.name?.includes('UFC')) continue;

      const eventDate = event.date ? new Date(event.date) : null;
      if (eventDate && eventDate > now) {
        events.push({
          espn_event_id: event.id,
          name: event.name,
          event_date: eventDate.toISOString(),
          location: event.venue?.fullName || null,
          city: event.venue?.address?.city || null,
          country: event.venue?.address?.country || null,
          status: 'upcoming',
        });
      }
    }
  }

  return events.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
}

async function syncEvents() {
  console.log('🔄 Fetching upcoming UFC events from MMA API...\n');

  const events = await getUpcomingEvents();
  console.log(`📅 Found ${events.length} upcoming UFC events\n`);

  if (events.length === 0) {
    console.log('No upcoming events to sync');
    return;
  }

  // Display events
  events.forEach((e, i) => {
    const date = new Date(e.event_date).toLocaleDateString();
    console.log(`  ${i + 1}. ${e.name}`);
    console.log(`     Date: ${date}`);
    console.log(`     ESPN ID: ${e.espn_event_id}`);
    console.log(`     Location: ${e.location || 'TBD'}`);
    console.log('');
  });

  console.log('📤 Syncing to database...\n');

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const event of events) {
    // Check if event exists by ESPN ID
    const { data: existingByEspn } = await supabase
      .from('events')
      .select('id, name')
      .eq('espn_event_id', event.espn_event_id)
      .single();

    if (existingByEspn) {
      // Update existing event
      const { error } = await supabase
        .from('events')
        .update({
          name: event.name,
          event_date: event.event_date,
          location: event.location,
          status: event.status,
          last_synced_at: new Date().toISOString(),
        })
        .eq('espn_event_id', event.espn_event_id);

      if (error) {
        console.log(`  ⚠️  Failed to update ${event.name}: ${error.message}`);
      } else {
        console.log(`  🔄 Updated: ${event.name}`);
        updated++;
      }
      continue;
    }

    // Check if event exists by similar name (to link ESPN ID)
    const baseName = event.name.split(':')[0].trim();
    const { data: existingByName } = await supabase
      .from('events')
      .select('id, name, espn_event_id, location')
      .or(`name.ilike.%${baseName}%,name.ilike.%${event.name}%`)
      .is('espn_event_id', null)
      .gte('event_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(1)
      .single();

    if (existingByName && !existingByName.espn_event_id) {
      // Link ESPN ID to existing event
      const { error } = await supabase
        .from('events')
        .update({
          espn_event_id: event.espn_event_id,
          name: event.name,
          event_date: event.event_date,
          location: event.location || existingByName.location,
          status: event.status,
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', existingByName.id);

      if (error) {
        console.log(`  ⚠️  Failed to link ${event.name}: ${error.message}`);
      } else {
        console.log(`  🔗 Linked ESPN ID to: ${event.name}`);
        updated++;
      }
      continue;
    }

    // Insert new event (generate placeholder ufcstats_event_id since it's required)
    const ufcstatsId = `espn-${event.espn_event_id}`;
    const { error } = await supabase
      .from('events')
      .insert({
        ufcstats_event_id: ufcstatsId,
        espn_event_id: event.espn_event_id,
        name: event.name,
        event_date: event.event_date,
        location: event.location,
        status: event.status,
        last_synced_at: new Date().toISOString(),
      });

    if (error) {
      if (error.code === '23505') {
        // Duplicate - skip
        skipped++;
      } else {
        console.log(`  ⚠️  Failed to insert ${event.name}: ${error.message}`);
      }
    } else {
      console.log(`  ✅ Inserted: ${event.name}`);
      inserted++;
    }
  }

  console.log(`\n📊 Summary: ${inserted} inserted, ${updated} updated, ${skipped} skipped`);

  // Verify
  console.log('\n📋 Current upcoming events in database:\n');
  const { data: dbEvents } = await supabase
    .from('events')
    .select('name, event_date, status, espn_event_id, ufcstats_event_id')
    .in('status', ['upcoming', 'live'])
    .order('event_date', { ascending: true })
    .limit(10);

  dbEvents?.forEach((e, i) => {
    const date = new Date(e.event_date).toLocaleDateString();
    const ids = [
      e.espn_event_id ? `ESPN:${e.espn_event_id}` : null,
      e.ufcstats_event_id ? `UFCS:${e.ufcstats_event_id}` : null,
    ].filter(Boolean).join(', ') || 'No IDs';
    console.log(`  ${i + 1}. ${e.name} (${date})`);
    console.log(`     IDs: ${ids}`);
  });
}

async function main() {
  console.log('🥊 MMA API Event Sync\n');
  console.log('This uses 1 API call (schedule endpoint)\n');

  await syncEvents();

  console.log('\n✅ Done!');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
