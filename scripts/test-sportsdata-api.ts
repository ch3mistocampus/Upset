/**
 * Test script for SportsData.io MMA API
 *
 * Run with:
 *   deno run --allow-net --allow-env scripts/test-sportsdata-api.ts
 */

const API_KEY = Deno.env.get('SPORTSDATA_API_KEY') || 'd3e269ed0b4747629bd4259b46252b5e';
const BASE_URL = 'https://api.sportsdata.io/v3/mma';

interface TestResult {
  endpoint: string;
  status: 'success' | 'unauthorized' | 'error';
  dataCount?: number;
  sample?: unknown;
  error?: string;
}

async function testEndpoint(
  category: 'scores' | 'stats' | 'odds',
  endpoint: string,
  description: string
): Promise<TestResult> {
  const url = `${BASE_URL}/${category}/json/${endpoint}?key=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    // Check for API error
    if (data.HttpStatusCode) {
      if (data.HttpStatusCode === 401) {
        return {
          endpoint: `${category}/${endpoint}`,
          status: 'unauthorized',
          error: `${data.Description} (Requires paid subscription)`,
        };
      }
      return {
        endpoint: `${category}/${endpoint}`,
        status: 'error',
        error: data.Description,
      };
    }

    const count = Array.isArray(data) ? data.length : 1;
    const sample = Array.isArray(data) ? data[0] : data;

    return {
      endpoint: `${category}/${endpoint}`,
      status: 'success',
      dataCount: count,
      sample,
    };
  } catch (err) {
    return {
      endpoint: `${category}/${endpoint}`,
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

async function main() {
  console.log('🔍 Testing SportsData.io MMA API\n');
  console.log(`API Key: ${API_KEY.slice(0, 8)}...${API_KEY.slice(-4)}`);
  console.log('=' .repeat(60) + '\n');

  const results: TestResult[] = [];

  // Test Scores endpoints
  console.log('📊 SCORES ENDPOINTS\n');

  results.push(await testEndpoint('scores', 'Leagues', 'All leagues'));
  results.push(await testEndpoint('scores', 'Schedule/UFC/2026', 'UFC 2026 schedule'));
  results.push(await testEndpoint('scores', 'FightersBasic', 'Basic fighter list'));
  results.push(await testEndpoint('scores', 'Fighters', 'Full fighter profiles'));
  results.push(await testEndpoint('scores', 'Fighter/140000004', 'Individual fighter (Belal Muhammad)'));

  // Get first event ID from schedule for further testing
  let testEventId = 891; // UFC 324 default
  const scheduleResult = results.find(r => r.endpoint.includes('Schedule') && r.status === 'success');
  if (scheduleResult?.sample) {
    const events = scheduleResult.sample as { EventId: number }[];
    if (Array.isArray(events) && events.length > 0) {
      // Find upcoming event
      const upcoming = (scheduleResult as any).sample;
    }
  }

  results.push(await testEndpoint('scores', `Event/${testEventId}`, `Event details (ID: ${testEventId})`));

  // Test Stats endpoints
  console.log('\n📈 STATS ENDPOINTS\n');
  results.push(await testEndpoint('stats', 'Fight/1', 'Fight live stats'));
  results.push(await testEndpoint('stats', 'FightFinal/1', 'Fight final stats'));

  // Test Odds endpoints
  console.log('\n💰 ODDS ENDPOINTS\n');
  results.push(await testEndpoint('odds', `EventOdds/${testEventId}`, 'Event betting odds'));
  results.push(await testEndpoint('odds', 'UpcomingBettingEvents', 'Upcoming events with odds'));

  // Print results summary
  console.log('\n' + '=' .repeat(60));
  console.log('📋 RESULTS SUMMARY\n');

  const successful = results.filter(r => r.status === 'success');
  const unauthorized = results.filter(r => r.status === 'unauthorized');
  const errors = results.filter(r => r.status === 'error');

  console.log(`✅ Working endpoints: ${successful.length}`);
  successful.forEach(r => {
    console.log(`   ${r.endpoint} (${r.dataCount} items)`);
  });

  console.log(`\n🔒 Requires paid subscription: ${unauthorized.length}`);
  unauthorized.forEach(r => {
    console.log(`   ${r.endpoint}`);
  });

  if (errors.length > 0) {
    console.log(`\n❌ Errors: ${errors.length}`);
    errors.forEach(r => {
      console.log(`   ${r.endpoint}: ${r.error}`);
    });
  }

  // Show sample data from working endpoints
  console.log('\n' + '=' .repeat(60));
  console.log('📦 SAMPLE DATA\n');

  for (const result of successful.slice(0, 3)) {
    console.log(`\n--- ${result.endpoint} ---`);
    console.log(JSON.stringify(result.sample, null, 2).slice(0, 1000));
  }

  // Show upcoming events
  const scheduleData = results.find(r => r.endpoint.includes('Schedule') && r.status === 'success');
  if (scheduleData) {
    console.log('\n' + '=' .repeat(60));
    console.log('📅 UPCOMING UFC EVENTS (2026)\n');

    // Fetch full schedule to show upcoming
    const url = `${BASE_URL}/scores/json/Schedule/UFC/2026?key=${API_KEY}`;
    const response = await fetch(url);
    const events = await response.json();

    const now = new Date();
    const upcoming = events
      .filter((e: any) => new Date(e.DateTime) > now && e.Active)
      .sort((a: any, b: any) => new Date(a.DateTime).getTime() - new Date(b.DateTime).getTime())
      .slice(0, 5);

    for (const event of upcoming) {
      const date = new Date(event.DateTime).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      console.log(`  ${event.EventId}: ${event.Name}`);
      console.log(`     📆 ${date} | Status: ${event.Status}`);
    }
  }

  // Show fighter count
  const fightersData = results.find(r => r.endpoint === 'scores/FightersBasic' && r.status === 'success');
  if (fightersData) {
    console.log('\n' + '=' .repeat(60));
    console.log(`👊 FIGHTERS: ${fightersData.dataCount} total in database\n`);
  }
}

main().catch(console.error);
