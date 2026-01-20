#!/usr/bin/env node
/**
 * Direct SportsData.io API test
 * Shows what data will be synced to your database
 */

const API_KEY = 'd3e269ed0b4747629bd4259b46252b5e';
const BASE_URL = 'https://api.sportsdata.io/v3/mma/scores/json';

async function fetchApi(endpoint) {
  const url = `${BASE_URL}/${endpoint}?key=${API_KEY}`;
  const response = await fetch(url);
  return response.json();
}

async function main() {
  console.log('🔍 Fetching live data from SportsData.io API...\n');
  console.log('='.repeat(60));

  try {
    // 1. Fetch 2026 Schedule
    console.log('\n📅 UFC 2026 SCHEDULE\n');
    const schedule = await fetchApi('Schedule/UFC/2026');

    if (schedule.HttpStatusCode) {
      console.log('❌ Error:', schedule.Description);
      return;
    }

    const now = new Date();
    const upcoming = schedule
      .filter(e => new Date(e.DateTime) > now && e.Active)
      .sort((a, b) => new Date(a.DateTime) - new Date(b.DateTime))
      .slice(0, 8);

    console.log(`Total events in 2026: ${schedule.length}`);
    console.log(`Upcoming events: ${upcoming.length}\n`);

    for (const event of upcoming) {
      const date = new Date(event.DateTime).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric'
      });
      console.log(`  📌 ${event.EventId}: ${event.Name}`);
      console.log(`     ${date} | Status: ${event.Status}\n`);
    }

    // 2. Fetch Fighters
    console.log('='.repeat(60));
    console.log('\n👊 FIGHTERS DATABASE\n');
    const fighters = await fetchApi('FightersBasic');

    if (fighters.HttpStatusCode) {
      console.log('❌ Error:', fighters.Description);
    } else {
      console.log(`Total fighters: ${fighters.length}\n`);

      // Show top fighters by wins
      const topFighters = fighters
        .filter(f => f.Wins >= 15)
        .sort((a, b) => b.Wins - a.Wins)
        .slice(0, 10);

      console.log('Top 10 fighters by wins:');
      for (const f of topFighters) {
        const name = `${f.FirstName} ${f.LastName}`;
        const nickname = f.Nickname ? ` "${f.Nickname}"` : '';
        console.log(`  ${name}${nickname}`);
        console.log(`    Record: ${f.Wins}-${f.Losses}-${f.Draws} | ${f.WeightClass}`);
        console.log(`    KOs: ${f.TechnicalKnockouts} | Subs: ${f.Submissions}\n`);
      }
    }

    // 3. Fetch next event details with fight card
    if (upcoming.length > 0) {
      const nextEvent = upcoming[0];
      console.log('='.repeat(60));
      console.log(`\n🥊 NEXT EVENT DETAILS: ${nextEvent.Name}\n`);

      const eventDetails = await fetchApi(`Event/${nextEvent.EventId}`);

      if (eventDetails.HttpStatusCode) {
        console.log('❌ Error:', eventDetails.Description);
      } else if (eventDetails.Fights && eventDetails.Fights.length > 0) {
        console.log(`Fight card (${eventDetails.Fights.length} fights):\n`);

        // Sort by card segment and order
        const sortedFights = eventDetails.Fights.sort((a, b) => {
          const segmentOrder = { 'Main': 0, 'Preliminary': 1, 'Early Preliminary': 2 };
          const aOrder = segmentOrder[a.CardSegment] ?? 3;
          const bOrder = segmentOrder[b.CardSegment] ?? 3;
          if (aOrder !== bOrder) return aOrder - bOrder;
          return a.Order - b.Order;
        });

        let currentSegment = '';
        for (const fight of sortedFights) {
          if (fight.CardSegment !== currentSegment) {
            currentSegment = fight.CardSegment;
            console.log(`  --- ${currentSegment || 'Unknown'} Card ---\n`);
          }

          const f1 = fight.Fighters?.[0];
          const f2 = fight.Fighters?.[1];

          if (f1 && f2) {
            const name1 = `${f1.FirstName} ${f1.LastName}`;
            const name2 = `${f2.FirstName} ${f2.LastName}`;
            const record1 = `(${f1.PreFightWins ?? '?'}-${f1.PreFightLosses ?? '?'})`;
            const record2 = `(${f2.PreFightWins ?? '?'}-${f2.PreFightLosses ?? '?'})`;

            console.log(`  ${name1} ${record1} vs ${name2} ${record2}`);
            console.log(`    ${fight.WeightClass || 'TBD'} | ${fight.Rounds} rounds`);

            // Show odds if available
            if (f1.Moneyline || f2.Moneyline) {
              const odds1 = f1.Moneyline > 0 ? `+${f1.Moneyline}` : f1.Moneyline;
              const odds2 = f2.Moneyline > 0 ? `+${f2.Moneyline}` : f2.Moneyline;
              console.log(`    Odds: ${odds1} / ${odds2}`);
            }
            console.log('');
          }
        }
      } else {
        console.log('No fight card available yet for this event.');
      }
    }

    // Summary
    console.log('='.repeat(60));
    console.log('\n✅ DATA SUMMARY\n');
    console.log(`  Events to sync: ${schedule.length}`);
    console.log(`  Fighters to sync: ${fighters.length}`);
    console.log(`  Upcoming events: ${upcoming.length}`);
    console.log('\nThis data will populate your sportsdata_* tables.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
