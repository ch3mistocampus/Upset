/**
 * Test script for SportsData.io MMA API
 *
 * Run with:
 *   node scripts/test-sportsdata-api.mjs
 */

const API_KEY = process.env.SPORTSDATA_API_KEY || 'd3e269ed0b4747629bd4259b46252b5e';
const BASE_URL = 'https://api.sportsdata.io/v3/mma';

async function testEndpoint(category, endpoint, description) {
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
      fullData: data,
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
  console.log('='.repeat(60) + '\n');

  const results = [];

  // Test Scores endpoints
  console.log('📊 SCORES ENDPOINTS\n');

  results.push(await testEndpoint('scores', 'Leagues', 'All leagues'));
  console.log('  ✓ Leagues');

  results.push(await testEndpoint('scores', 'Schedule/UFC/2026', 'UFC 2026 schedule'));
  console.log('  ✓ Schedule/UFC/2026');

  results.push(await testEndpoint('scores', 'FightersBasic', 'Basic fighter list'));
  console.log('  ✓ FightersBasic');

  results.push(await testEndpoint('scores', 'Fighters', 'Full fighter profiles'));
  console.log('  ✓ Fighters');

  results.push(await testEndpoint('scores', 'Fighter/140000004', 'Individual fighter'));
  console.log('  ✓ Fighter/140000004');

  // Get first upcoming event ID from schedule for further testing
  let testEventId = 891; // Default
  const scheduleResult = results.find(r => r.endpoint.includes('Schedule') && r.status === 'success');
  if (scheduleResult?.fullData) {
    const now = new Date();
    const upcoming = scheduleResult.fullData
      .filter(e => new Date(e.DateTime) > now && e.Active)
      .sort((a, b) => new Date(a.DateTime).getTime() - new Date(b.DateTime).getTime());
    if (upcoming.length > 0) {
      testEventId = upcoming[0].EventId;
    }
  }

  results.push(await testEndpoint('scores', `Event/${testEventId}`, `Event details`));
  console.log(`  ✓ Event/${testEventId}`);

  // Test Stats endpoints
  console.log('\n📈 STATS ENDPOINTS\n');
  results.push(await testEndpoint('stats', 'Fight/1', 'Fight live stats'));
  console.log('  ✓ Fight/1');

  results.push(await testEndpoint('stats', 'FightFinal/1', 'Fight final stats'));
  console.log('  ✓ FightFinal/1');

  // Test Odds endpoints
  console.log('\n💰 ODDS ENDPOINTS\n');
  results.push(await testEndpoint('odds', `EventOdds/${testEventId}`, 'Event betting odds'));
  console.log(`  ✓ EventOdds/${testEventId}`);

  results.push(await testEndpoint('odds', 'UpcomingBettingEvents', 'Upcoming events with odds'));
  console.log('  ✓ UpcomingBettingEvents');

  // Print results summary
  console.log('\n' + '='.repeat(60));
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
  console.log('\n' + '='.repeat(60));
  console.log('📦 SAMPLE DATA\n');

  for (const result of successful.slice(0, 2)) {
    console.log(`\n--- ${result.endpoint} ---`);
    console.log(JSON.stringify(result.sample, null, 2));
  }

  // Show upcoming events
  if (scheduleResult?.status === 'success') {
    console.log('\n' + '='.repeat(60));
    console.log('📅 UPCOMING UFC EVENTS (2026)\n');

    const now = new Date();
    const upcoming = scheduleResult.fullData
      .filter(e => new Date(e.DateTime) > now && e.Active)
      .sort((a, b) => new Date(a.DateTime).getTime() - new Date(b.DateTime).getTime())
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
      console.log('');
    }
  }

  // Show event details with fights
  const eventResult = results.find(r => r.endpoint.includes('Event/') && r.status === 'success');
  if (eventResult?.sample) {
    console.log('\n' + '='.repeat(60));
    console.log(`🥊 EVENT DETAILS: ${eventResult.sample.Name}\n`);

    const event = eventResult.sample;
    console.log(`  Event ID: ${event.EventId}`);
    console.log(`  Date: ${new Date(event.DateTime).toLocaleDateString()}`);
    console.log(`  Status: ${event.Status}`);

    if (event.Fights && event.Fights.length > 0) {
      console.log(`\n  Fights (${event.Fights.length} total):`);
      for (const fight of event.Fights.slice(0, 5)) {
        const f1 = fight.Fighters?.[0];
        const f2 = fight.Fighters?.[1];
        if (f1 && f2) {
          console.log(`    ${fight.CardSegment}: ${f1.FirstName} ${f1.LastName} vs ${f2.FirstName} ${f2.LastName}`);
          console.log(`      Weight: ${fight.WeightClass} | Rounds: ${fight.Rounds}`);
        }
      }
      if (event.Fights.length > 5) {
        console.log(`    ... and ${event.Fights.length - 5} more fights`);
      }
    }
  }

  // Show fighter count and sample
  const fightersData = results.find(r => r.endpoint === 'scores/FightersBasic' && r.status === 'success');
  if (fightersData) {
    console.log('\n' + '='.repeat(60));
    console.log(`👊 FIGHTERS: ${fightersData.dataCount} total in database\n`);

    // Show a few sample fighters
    const topFighters = fightersData.fullData
      .filter(f => f.Wins >= 20)
      .sort((a, b) => b.Wins - a.Wins)
      .slice(0, 5);

    console.log('  Top fighters by wins:');
    for (const f of topFighters) {
      console.log(`    ${f.FirstName} ${f.LastName} (${f.Nickname || 'no nickname'})`);
      console.log(`      Record: ${f.Wins}-${f.Losses}-${f.Draws} | ${f.WeightClass}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ API Test Complete\n');
}

main().catch(console.error);
