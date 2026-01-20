/**
 * Test MMA API for fetching upcoming UFC events
 * Run with: node scripts/test-mma-api.mjs
 */

import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.MMA_API_KEY;
const BASE_URL = 'https://mma-api1.p.rapidapi.com';

if (!API_KEY) {
  console.error('❌ MMA_API_KEY not found in .env');
  process.exit(1);
}

async function fetchAPI(endpoint, params = {}) {
  const url = new URL(endpoint, BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  console.log(`📡 Fetching: ${url.pathname}${url.search}`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'x-rapidapi-host': 'mma-api1.p.rapidapi.com',
      'x-rapidapi-key': API_KEY,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function testSchedule() {
  console.log('\n🗓️  Testing /schedule endpoint...\n');

  const year = new Date().getFullYear();
  const data = await fetchAPI('/schedule', { year: year.toString(), league: 'ufc' });

  console.log(`Response type: ${typeof data}, isArray: ${Array.isArray(data)}`);

  if (Array.isArray(data)) {
    console.log(`Total events in ${year}: ${data.length}`);

    const now = new Date();
    const upcoming = data.filter(e => {
      const eventDate = e.date ? new Date(e.date) : null;
      return eventDate && eventDate > now;
    });

    console.log(`\n📅 Upcoming events: ${upcoming.length}`);

    if (upcoming.length > 0) {
      console.log('\n✅ UPCOMING UFC EVENTS:\n');
      upcoming.slice(0, 10).forEach((event, i) => {
        const date = event.date ? new Date(event.date).toLocaleDateString() : 'Unknown';
        console.log(`  ${i + 1}. ${event.name || event.shortName || 'Unnamed'}`);
        console.log(`     Date: ${date}`);
        console.log(`     ESPN ID: ${event.id || 'N/A'}`);
        console.log(`     Location: ${event.venue?.fullName || event.venue?.address?.city || 'TBD'}`);
        console.log('');
      });
    } else {
      console.log('\n⚠️  No upcoming events in response');
      if (data.length > 0) {
        console.log('\nSample event:');
        console.log(JSON.stringify(data[0], null, 2).slice(0, 1500));
      }
    }
  } else if (data && typeof data === 'object') {
    console.log('Response keys:', Object.keys(data));

    // Check for nested events
    const events = data.events || data.schedule || data.data;
    if (events) {
      console.log(`Found nested events: ${Array.isArray(events) ? events.length : 'object'}`);
    }

    console.log('\nFull response (first 2000 chars):');
    console.log(JSON.stringify(data, null, 2).slice(0, 2000));
  }

  return data;
}

async function testScoreboard() {
  console.log('\n🥊 Testing /scoreboard endpoint (live/recent)...\n');

  const data = await fetchAPI('/scoreboard', { league: 'ufc' });

  if (data && data.events) {
    console.log(`Found ${data.events.length} event(s) on scoreboard`);
    data.events.slice(0, 3).forEach((event, i) => {
      console.log(`\n  ${i + 1}. ${event.name || event.shortName}`);
      console.log(`     Date: ${event.date}`);
      console.log(`     ESPN ID: ${event.id}`);
      console.log(`     Status: ${event.status?.type?.description || 'N/A'}`);
      if (event.competitions) {
        console.log(`     Fights: ${event.competitions.length}`);
      }
    });
  } else {
    console.log('Response:', JSON.stringify(data, null, 2).slice(0, 1000));
  }

  return data;
}

async function main() {
  console.log('🔑 MMA API Key found, testing...\n');

  try {
    await testSchedule();
  } catch (error) {
    console.error('❌ Schedule error:', error.message);
  }

  try {
    await testScoreboard();
  } catch (error) {
    console.error('❌ Scoreboard error:', error.message);
  }

  console.log('\n✅ Done! (2 API calls used)');
}

main().catch(console.error);
