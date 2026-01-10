/**
 * Test MMA API for fetching upcoming UFC events
 *
 * Setup:
 * 1. Go to https://rapidapi.com/developer-developer-default/api/mma-api1
 * 2. Subscribe to the API (free tier: 80 requests/month)
 * 3. Copy your API key
 * 4. Add to mobile/.env: MMA_API_KEY=your_key_here
 *
 * Run with: node scripts/test-mma-api.mjs
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../mobile/.env') });

const API_KEY = process.env.MMA_API_KEY;
const BASE_URL = 'https://mma-api1.p.rapidapi.com';

if (!API_KEY) {
  console.error('❌ MMA_API_KEY not found in mobile/.env');
  console.log('\nTo set up:');
  console.log('1. Go to: https://rapidapi.com/developer-developer-default/api/mma-api1');
  console.log('2. Subscribe to the free tier (80 requests/month)');
  console.log('3. Copy your API key');
  console.log('4. Add to mobile/.env: MMA_API_KEY=your_key_here');
  process.exit(1);
}

async function fetchAPI(endpoint, params = {}) {
  const url = new URL(endpoint, BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  console.log(`\n📡 Fetching: ${endpoint}`);

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

  console.log(`Raw response type: ${typeof data}`);
  console.log(`Is array: ${Array.isArray(data)}`);

  if (Array.isArray(data)) {
    console.log(`Total events: ${data.length}`);

    const now = new Date();
    const upcoming = data.filter(e => {
      const eventDate = e.date ? new Date(e.date) : null;
      return eventDate && eventDate > now;
    });

    const past = data.filter(e => {
      const eventDate = e.date ? new Date(e.date) : null;
      return eventDate && eventDate <= now;
    });

    console.log(`\n📅 Upcoming events: ${upcoming.length}`);
    console.log(`📆 Past events: ${past.length}`);

    if (upcoming.length > 0) {
      console.log('\n✅ UPCOMING UFC EVENTS:\n');
      upcoming.slice(0, 10).forEach((event, i) => {
        const date = event.date ? new Date(event.date).toLocaleDateString() : 'Unknown';
        console.log(`  ${i + 1}. ${event.name || event.title || 'Unnamed'}`);
        console.log(`     Date: ${date}`);
        console.log(`     ID: ${event.eventId || event.id || 'N/A'}`);
        console.log(`     Location: ${event.location || event.venue || 'TBD'}`);
        console.log('');
      });
    } else {
      console.log('\n⚠️  No upcoming events found in response');
      console.log('Sample event structure:');
      console.log(JSON.stringify(data[0], null, 2));
    }
  } else if (data && typeof data === 'object') {
    console.log('\nResponse is an object. Keys:', Object.keys(data));
    console.log(JSON.stringify(data, null, 2).slice(0, 2000));
  }
}

async function testScoreboard() {
  console.log('\n🥊 Testing /scoreboard endpoint...\n');

  const data = await fetchAPI('/scoreboard', { league: 'ufc' });

  console.log(`Raw response type: ${typeof data}`);

  if (data) {
    console.log('Response structure:');
    if (Array.isArray(data)) {
      console.log(`Array with ${data.length} items`);
      if (data.length > 0) {
        console.log('First item keys:', Object.keys(data[0]));
      }
    } else {
      console.log('Object keys:', Object.keys(data));
    }

    // Try to find events
    const events = data.events || data;
    if (Array.isArray(events) && events.length > 0) {
      console.log('\n📍 Found events:');
      events.slice(0, 3).forEach((event, i) => {
        console.log(`\n  ${i + 1}. ${event.name || event.shortName || 'Event'}`);
        console.log(`     Date: ${event.date || 'N/A'}`);
        console.log(`     Status: ${event.status?.type?.name || 'N/A'}`);
      });
    }
  }
}

async function main() {
  console.log('🔑 MMA API Key found, testing endpoints...\n');

  try {
    await testSchedule();
  } catch (error) {
    console.error('❌ Schedule test failed:', error.message);
  }

  try {
    await testScoreboard();
  } catch (error) {
    console.error('❌ Scoreboard test failed:', error.message);
  }

  console.log('\n✅ API test complete!');
}

main().catch(console.error);
