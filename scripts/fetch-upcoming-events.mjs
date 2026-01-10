/**
 * Fetch upcoming UFC events from UFCStats.com and insert into database
 * Run with: node scripts/fetch-upcoming-events.mjs
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

// UFCStats event list URL
const UFCSTATS_EVENTS_URL = 'http://www.ufcstats.com/statistics/events/completed?page=all';

async function fetchUFCStatsEvents() {
  console.log('🔍 Fetching events from UFCStats.com...\n');

  const response = await fetch(UFCSTATS_EVENTS_URL);
  const html = await response.text();

  // Parse events from HTML
  const events = [];

  // Match event rows - looking for upcoming events (no date in past)
  const eventRegex = /<a[^>]*href="(http:\/\/www\.ufcstats\.com\/event-details\/[^"]+)"[^>]*class="b-link[^"]*"[^>]*>([^<]+)<\/a>/g;
  const dateRegex = /<span[^>]*class="b-statistics__date"[^>]*>([^<]+)<\/span>/g;

  // Get all rows
  const rowRegex = /<tr[^>]*class="b-statistics__table-row"[^>]*>([\s\S]*?)<\/tr>/g;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];

    // Extract event link and name
    const linkMatch = /<a[^>]*href="(http:\/\/www\.ufcstats\.com\/event-details\/([^"]+))"[^>]*>([^<]+)<\/a>/i.exec(rowHtml);
    // Extract date
    const dateMatch = /<span[^>]*class="b-statistics__date"[^>]*>\s*([^<]+)\s*<\/span>/i.exec(rowHtml);

    if (linkMatch && dateMatch) {
      const eventUrl = linkMatch[1];
      const ufcstatsId = linkMatch[2];
      const eventName = linkMatch[3].trim();
      const dateStr = dateMatch[1].trim();

      // Parse date (format: "Month Day, Year")
      const eventDate = new Date(dateStr);

      if (!isNaN(eventDate.getTime())) {
        events.push({
          ufcstats_event_id: ufcstatsId,
          name: eventName,
          event_date: eventDate.toISOString(),
          status: eventDate > new Date() ? 'upcoming' : 'completed',
          url: eventUrl,
        });
      }
    }
  }

  return events;
}

async function main() {
  try {
    const events = await fetchUFCStatsEvents();

    console.log(`📅 Found ${events.length} total events\n`);

    // Filter to upcoming events
    const upcomingEvents = events.filter(e => e.status === 'upcoming');
    console.log(`🔜 Upcoming events: ${upcomingEvents.length}\n`);

    if (upcomingEvents.length === 0) {
      console.log('No upcoming events found on UFCStats.com');
      console.log('This might mean all listed events are in the past.\n');

      // Show the most recent events instead
      console.log('Most recent events found:');
      events.slice(0, 5).forEach(e => {
        console.log(`  - ${e.name} (${new Date(e.event_date).toLocaleDateString()}) [${e.status}]`);
      });
      return;
    }

    console.log('Upcoming events to sync:');
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
        // Update existing
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
        // Insert new
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

  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
