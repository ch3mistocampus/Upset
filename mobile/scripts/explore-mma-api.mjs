/**
 * Explore MMA API to find event/fight details
 */
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.MMA_API_KEY;
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
      'x-rapidapi-key': API_KEY,
    },
  });

  if (!response.ok) {
    console.log(`${endpoint}: ${response.status} ${response.statusText}`);
    return null;
  }

  return response.json();
}

async function main() {
  console.log('Exploring MMA API for fight card data...\n');

  // Get schedule and check event structure
  const data = await fetchAPI('/schedule', { year: '2026', league: 'ufc' });

  if (!data) {
    console.log('Failed to fetch schedule');
    return;
  }

  // Find UFC 324
  for (const [dateKey, dayEvents] of Object.entries(data)) {
    if (!Array.isArray(dayEvents)) continue;

    for (const event of dayEvents) {
      if (event.name?.includes('324')) {
        console.log('Found UFC 324:');
        console.log('Keys:', Object.keys(event));
        console.log('\nFull data:');
        console.log(JSON.stringify(event, null, 2));
        console.log('\n---\n');
      }
    }
  }

  // Try scoreboard for a past event date that has data
  console.log('Testing scoreboard for recent past event...');
  const scoreboard = await fetchAPI('/scoreboard', { league: 'ufc' });

  if (scoreboard) {
    // Check if it's array-like object
    const events = Array.isArray(scoreboard) ? scoreboard : Object.values(scoreboard);

    if (events.length > 0 && events[0].competitions) {
      console.log('\nFound event with competitions!');
      const event = events[0];
      console.log('Event:', event.name);
      console.log('Competitions:', event.competitions.length);

      console.log('\nFirst fight structure:');
      console.log(JSON.stringify(event.competitions[0], null, 2));
    }
  }
}

main().catch(console.error);
