/**
 * Seed Real Historical Data Script
 *
 * Fetches real data from the last 2 completed UFC events and creates
 * realistic mock picks/stats for test users based on actual fight outcomes.
 *
 * Run with: deno run --allow-net --allow-env scripts/seed-real-historical-data.ts
 *
 * Requirements:
 * - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
 * - Test users must already exist
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { load } from 'https://esm.sh/cheerio@1.0.0-rc.12';

const TEST_USERS = [
  { username: 'alice_ufc', pickStyle: 'favorite' },    // Tends to pick favorites
  { username: 'bob_fighter', pickStyle: 'underdog' },  // Tends to pick underdogs
  { username: 'charlie_picks', pickStyle: 'random' },  // Random picks
];

const DELAY_MS = 800;

interface FightResult {
  redName: string;
  blueName: string;
  winnerCorner: 'red' | 'blue' | 'draw' | 'nc' | null;
  method: string | null;
  round: number | null;
}

interface EventData {
  name: string;
  date: string;
  ufcstatsId: string;
  fights: FightResult[];
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, retries = 3): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      if (attempt > 0) {
        const backoff = DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`   Retry attempt ${attempt}, waiting ${backoff}ms`);
        await sleep(backoff);
      } else {
        await sleep(DELAY_MS);
      }

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      lastError = error as Error;
      console.error(`   Fetch attempt ${attempt + 1} failed:`, error);
    }
  }

  throw new Error(`Failed after ${retries} attempts: ${lastError?.message}`);
}

/**
 * Get the last N completed events from UFCStats (most recent first)
 * UFCStats lists events in reverse chronological order on the completed page
 */
async function getRecentCompletedEvents(count: number): Promise<{ name: string; url: string; date: string; id: string }[]> {
  console.log(`\n📅 Fetching the ${count} MOST RECENT completed UFC events...`);
  console.log('   (Today is: ' + new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  }) + ')');

  // Fetch from completed events page (first page = most recent events)
  const html = await fetchWithRetry('http://ufcstats.com/statistics/events/completed');
  const $ = load(html);
  const events: { name: string; url: string; date: string; id: string }[] = [];

  // UFCStats table rows are in reverse chronological order (newest first)
  $('table.b-statistics__table-events tbody tr').each((_, row) => {
    if (events.length >= count) return false;

    const $row = $(row);
    const link = $row.find('a.b-link').first();
    const eventUrl = link.attr('href');
    const eventName = link.text().trim();
    const dateText = $row.find('span.b-statistics__date').text().trim();

    // Skip if this looks like an upcoming event or placeholder
    if (!eventUrl || !eventName) return;
    if (eventName.toLowerCase().includes('upcoming')) return;
    if (eventName.toLowerCase().includes('tbd')) return;

    const eventId = eventUrl.split('/').pop() || '';
    events.push({
      name: eventName,
      url: eventUrl,
      date: dateText,
      id: eventId,
    });
  });

  // Log the events we found with their dates
  console.log(`\n   ✅ Found ${events.length} most recent completed events:`);
  events.forEach((e, i) => {
    console.log(`      ${i + 1}. ${e.name} (${e.date})`);
  });

  return events;
}

/**
 * Scrape fight results from an event page
 */
async function getEventResults(eventUrl: string, eventName: string): Promise<FightResult[]> {
  console.log(`\n🥊 Scraping results for: ${eventName}`);

  const html = await fetchWithRetry(eventUrl);
  const $ = load(html);
  const fights: FightResult[] = [];

  $('table.b-fight-details__table tbody tr.b-fight-details__table-row').each((_, row) => {
    const $row = $(row);

    // Get fighter names
    const fighterLinks = $row.find('td.b-fight-details__table-col a.b-link');
    if (fighterLinks.length < 2) return;

    const redName = fighterLinks.eq(0).text().trim();
    const blueName = fighterLinks.eq(1).text().trim();

    // Get winner - check for (W) indicator in first column
    const firstCol = $row.find('td.b-fight-details__table-col').first();
    const winIndicators = firstCol.find('p.b-fight-details__table-text');

    let winnerCorner: 'red' | 'blue' | 'draw' | 'nc' | null = null;

    // Check each indicator for W, D, or NC
    winIndicators.each((idx, el) => {
      const text = $(el).text().trim();
      if (text === 'win') {
        winnerCorner = idx === 0 ? 'red' : 'blue';
      } else if (text.toLowerCase().includes('draw')) {
        winnerCorner = 'draw';
      } else if (text.toLowerCase().includes('nc')) {
        winnerCorner = 'nc';
      }
    });

    // Alternative: check the first cell for win/loss indicators
    const firstCellText = firstCol.text().toLowerCase();
    if (!winnerCorner) {
      if (firstCellText.includes('win')) {
        // The winner is typically the first fighter listed
        winnerCorner = 'red';
      }
    }

    // Get method
    const methodCol = $row.find('td.b-fight-details__table-col').eq(7);
    const method = methodCol.find('p.b-fight-details__table-text').first().text().trim() || null;

    // Get round
    const roundCol = $row.find('td.b-fight-details__table-col').eq(8);
    const roundText = roundCol.find('p.b-fight-details__table-text').first().text().trim();
    const round = roundText ? parseInt(roundText) : null;

    if (redName && blueName) {
      fights.push({
        redName,
        blueName,
        winnerCorner,
        method,
        round,
      });
    }
  });

  // If we couldn't parse winner from table, try individual fight pages or use heuristics
  // For now, default red corner as winner if we couldn't determine (first listed usually wins)
  fights.forEach((fight, idx) => {
    if (!fight.winnerCorner) {
      // UFCStats typically lists winner first, so red is usually the winner
      fight.winnerCorner = 'red';
    }
    console.log(`   ${idx + 1}. ${fight.redName} vs ${fight.blueName} → Winner: ${fight.winnerCorner} corner`);
  });

  return fights;
}

/**
 * Simulate a user's pick for a fight based on their pick style
 */
function simulatePick(
  fight: FightResult,
  pickStyle: 'favorite' | 'underdog' | 'random',
  fightIndex: number
): 'red' | 'blue' {
  switch (pickStyle) {
    case 'favorite':
      // Favorites tend to be in the red corner (first listed) 70% of the time
      return Math.random() < 0.7 ? 'red' : 'blue';

    case 'underdog':
      // Underdogs tend to be in the blue corner 60% of the time
      return Math.random() < 0.6 ? 'blue' : 'red';

    case 'random':
      // Truly random 50/50
      return Math.random() < 0.5 ? 'red' : 'blue';

    default:
      return 'red';
  }
}

async function main() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.args[0];
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.args[1];

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables:');
    console.error('   export SUPABASE_URL="https://your-project.supabase.co"');
    console.error('   export SUPABASE_SERVICE_ROLE_KEY="your-service-key"');
    Deno.exit(1);
  }

  console.log('🚀 Seeding real historical UFC data...\n');
  console.log('='.repeat(60));

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Step 1: Get test users
  console.log('\n👥 Finding test users...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, username')
    .in('username', TEST_USERS.map(u => u.username));

  if (profilesError || !profiles || profiles.length === 0) {
    console.error('❌ Test users not found. Run setup-dev-data.ts first.');
    Deno.exit(1);
  }

  console.log(`   Found ${profiles.length} test users`);

  // Step 2: Get last 2 completed events
  const recentEvents = await getRecentCompletedEvents(2);

  if (recentEvents.length === 0) {
    console.error('❌ No completed events found!');
    Deno.exit(1);
  }

  // Step 3: Get fight results for each event
  const eventsWithResults: EventData[] = [];

  for (const event of recentEvents) {
    await sleep(DELAY_MS);
    const fights = await getEventResults(event.url, event.name);
    eventsWithResults.push({
      name: event.name,
      date: event.date,
      ufcstatsId: event.id,
      fights,
    });
  }

  // Step 4: Simulate picks and calculate stats
  console.log('\n📊 Calculating realistic stats based on real fight results...\n');

  const userStats: Map<string, {
    totalPicks: number;
    correctPicks: number;
    currentStreak: number;
    bestStreak: number;
  }> = new Map();

  // Initialize stats
  profiles.forEach(p => {
    userStats.set(p.username, {
      totalPicks: 0,
      correctPicks: 0,
      currentStreak: 0,
      bestStreak: 0,
    });
  });

  // Simulate picks for each event
  for (const event of eventsWithResults) {
    console.log(`\n📅 Simulating picks for: ${event.name} (${event.fights.length} fights)`);

    for (const profile of profiles) {
      const testUser = TEST_USERS.find(u => u.username === profile.username);
      if (!testUser) continue;

      const stats = userStats.get(profile.username)!;

      for (let i = 0; i < event.fights.length; i++) {
        const fight = event.fights[i];
        if (!fight.winnerCorner || fight.winnerCorner === 'draw' || fight.winnerCorner === 'nc') {
          continue; // Skip draws and no-contests
        }

        const userPick = simulatePick(fight, testUser.pickStyle as any, i);
        const isCorrect = userPick === fight.winnerCorner;

        stats.totalPicks++;
        if (isCorrect) {
          stats.correctPicks++;
          stats.currentStreak++;
          if (stats.currentStreak > stats.bestStreak) {
            stats.bestStreak = stats.currentStreak;
          }
        } else {
          stats.currentStreak = 0;
        }
      }
    }
  }

  // Step 5: Update user_stats in database
  console.log('\n💾 Updating user stats in database...\n');

  for (const profile of profiles) {
    const stats = userStats.get(profile.username)!;
    const accuracy = stats.totalPicks > 0
      ? Math.round((stats.correctPicks / stats.totalPicks) * 1000) / 10
      : 0;

    const { error } = await supabase
      .from('user_stats')
      .upsert({
        user_id: profile.user_id,
        total_picks: stats.totalPicks,
        correct_winner: stats.correctPicks,
        accuracy_pct: accuracy,
        current_streak: stats.currentStreak,
        best_streak: stats.bestStreak,
      }, { onConflict: 'user_id' });

    if (error) {
      console.error(`❌ Failed to update stats for ${profile.username}: ${error.message}`);
    } else {
      console.log(`✅ ${profile.username}: ${accuracy}% accuracy (${stats.correctPicks}/${stats.totalPicks} correct)`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✨ REAL HISTORICAL DATA SEEDED!');
  console.log('='.repeat(60));

  console.log('\n📅 Events Used:');
  eventsWithResults.forEach(e => {
    console.log(`   • ${e.name} (${e.date}) - ${e.fights.length} fights`);
  });

  console.log('\n📊 Updated User Stats:');
  profiles.forEach(profile => {
    const stats = userStats.get(profile.username)!;
    const accuracy = stats.totalPicks > 0
      ? Math.round((stats.correctPicks / stats.totalPicks) * 1000) / 10
      : 0;
    const testUser = TEST_USERS.find(u => u.username === profile.username)!;
    console.log(`   ${profile.username} (${testUser.pickStyle}): ${accuracy}% (${stats.correctPicks}/${stats.totalPicks})`);
    console.log(`      Current streak: ${stats.currentStreak}, Best: ${stats.bestStreak}`);
  });

  console.log('\n📱 The leaderboard will now show realistic stats based on');
  console.log('   the last 2 UFC events!');
}

if (import.meta.main) {
  main().catch(error => {
    console.error('Fatal error:', error);
    Deno.exit(1);
  });
}
