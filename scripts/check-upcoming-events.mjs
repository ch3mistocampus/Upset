/**
 * Check upcoming events in the database
 * Run with: node scripts/check-upcoming-events.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../mobile/.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('\n📅 Checking events in database...\n');

  // Get all events
  const { data: allEvents, error: allError } = await supabase
    .from('events')
    .select('id, name, event_date, status')
    .order('event_date', { ascending: false })
    .limit(20);

  if (allError) {
    console.error('Error fetching events:', allError.message);
    return;
  }

  console.log('=== All Events (most recent 20) ===\n');
  if (allEvents && allEvents.length > 0) {
    allEvents.forEach(e => {
      const date = new Date(e.event_date).toLocaleDateString();
      console.log(`  [${e.status.padEnd(10)}] ${date} - ${e.name}`);
    });
  } else {
    console.log('  No events found');
  }

  // Get upcoming events specifically
  const { data: upcomingEvents, error: upcomingError } = await supabase
    .from('events')
    .select('id, name, event_date, status')
    .in('status', ['upcoming', 'live'])
    .order('event_date', { ascending: true });

  console.log('\n=== Upcoming/Live Events ===\n');
  if (upcomingError) {
    console.error('Error:', upcomingError.message);
  } else if (upcomingEvents && upcomingEvents.length > 0) {
    upcomingEvents.forEach(e => {
      const date = new Date(e.event_date).toLocaleDateString();
      console.log(`  [${e.status.padEnd(10)}] ${date} - ${e.name}`);
    });
    console.log(`\n  Total: ${upcomingEvents.length} upcoming event(s)`);
  } else {
    console.log('  No upcoming events found');
  }

  // Count by status
  const { data: statusCounts } = await supabase
    .from('events')
    .select('status');

  if (statusCounts) {
    const counts = statusCounts.reduce((acc, e) => {
      acc[e.status] = (acc[e.status] || 0) + 1;
      return acc;
    }, {});

    console.log('\n=== Event Status Breakdown ===\n');
    Object.entries(counts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
  }

  console.log('\n');
}

main();
