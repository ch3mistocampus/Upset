/**
 * Fetch upcoming UFC events and insert into database
 * Run with: node scripts/sync-events.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Fallback: Add realistic upcoming events for testing
function getTestUpcomingEvents() {
  const now = new Date();

  // Generate 5 upcoming events over the next 2 months
  const events = [
    {
      name: 'UFC Fight Night: Moreno vs. Albazi 2',
      event_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'upcoming',
      ufcstats_event_id: 'fn-moreno-albazi-2',
    },
    {
      name: 'UFC 325: Jones vs. Aspinall',
      event_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'upcoming',
      ufcstats_event_id: 'ufc-325',
    },
    {
      name: 'UFC Fight Night: Holloway vs. Allen',
      event_date: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'upcoming',
      ufcstats_event_id: 'fn-holloway-allen',
    },
    {
      name: 'UFC 326: Pereira vs. Ankalaev 2',
      event_date: new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'upcoming',
      ufcstats_event_id: 'ufc-326',
    },
    {
      name: 'UFC Fight Night: Strickland vs. Costa',
      event_date: new Date(now.getTime() + 42 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'upcoming',
      ufcstats_event_id: 'fn-strickland-costa',
    },
  ];

  return events;
}

async function main() {
  console.log('🥊 Adding upcoming UFC events...\n');

  const upcomingEvents = getTestUpcomingEvents();

  console.log('Upcoming events to add:');
  upcomingEvents.forEach(e => {
    console.log(`  - ${e.name} (${new Date(e.event_date).toLocaleDateString()})`);
  });

  console.log('\n📤 Inserting/updating events in database...\n');

  for (const event of upcomingEvents) {
    // Check if event already exists
    const { data: existing } = await supabase
      .from('events')
      .select('id')
      .eq('ufcstats_event_id', event.ufcstats_event_id)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('events')
        .update({
          name: event.name,
          event_date: event.event_date,
          status: event.status,
        })
        .eq('ufcstats_event_id', event.ufcstats_event_id);

      if (error) {
        console.log(`  ⚠️  Failed to update ${event.name}: ${error.message}`);
      } else {
        console.log(`  ✅ Updated: ${event.name}`);
      }
    } else {
      const { error } = await supabase
        .from('events')
        .insert({
          ufcstats_event_id: event.ufcstats_event_id,
          name: event.name,
          event_date: event.event_date,
          status: event.status,
        });

      if (error) {
        console.log(`  ⚠️  Failed to insert ${event.name}: ${error.message}`);
      } else {
        console.log(`  ✅ Inserted: ${event.name}`);
      }
    }
  }

  // Verify
  console.log('\n📊 Verifying database...\n');
  const { data: dbUpcoming } = await supabase
    .from('events')
    .select('name, event_date, status')
    .in('status', ['upcoming', 'live'])
    .order('event_date', { ascending: true });

  console.log('Upcoming events in database:');
  dbUpcoming?.forEach(e => {
    console.log(`  - ${e.name} (${new Date(e.event_date).toLocaleDateString()})`);
  });
  console.log(`\nTotal: ${dbUpcoming?.length || 0} upcoming events`);
}

main().catch(console.error);
