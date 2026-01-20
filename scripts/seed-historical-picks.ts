/**
 * Seed Historical Picks Script
 *
 * Creates actual individual pick records for all test users
 * across the last N completed events.
 *
 * Run with: deno run --allow-net --allow-env scripts/seed-historical-picks.ts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TEST_USERS = [
  { username: 'alicechen', pickStyle: 'favorite', bias: 0.65 },
  { username: 'bsantos', pickStyle: 'underdog', bias: 0.40 },
  { username: 'charliej', pickStyle: 'random', bias: 0.50 },
  { username: 'dkim23', pickStyle: 'heavy_favorite', bias: 0.80 },
  { username: 'emmarod', pickStyle: 'slight_favorite', bias: 0.55 },
  { username: 'bigfrank', pickStyle: 'favorite', bias: 0.60 },
  { username: 'gracet', pickStyle: 'slight_underdog', bias: 0.45 },
  { username: 'henryjack', pickStyle: 'favorite', bias: 0.70 },
  { username: 'irismtz', pickStyle: 'heavy_underdog', bias: 0.30 },
  { username: 'jmorrison', pickStyle: 'slight_favorite', bias: 0.55 },
  { username: 'kateo', pickStyle: 'random', bias: 0.50 },
  { username: 'leonak', pickStyle: 'favorite', bias: 0.60 },
  { username: 'miadavis', pickStyle: 'favorite', bias: 0.65 },
];

const EVENTS_TO_SEED = 5;

interface UserProfile {
  user_id: string;
  username: string;
}

interface Event {
  id: string;
  name: string;
  event_date: string;
  status: string;
}

interface Bout {
  id: string;
  event_id: string;
  red_name: string;
  blue_name: string;
  status: string;
  results: { winner_corner: string } | null;
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

  console.log('🚀 Seeding historical picks for all test users...\n');
  console.log('='.repeat(60));

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Disable pick lock trigger using RPC function
  console.log('\n🔓 Disabling pick lock trigger...');
  const { error: disableError } = await supabase.rpc('disable_pick_lock_trigger');
  if (disableError) {
    console.error('   ❌ Failed to disable trigger:', disableError.message);
    console.error('   Run the migration: npx supabase db push');
    Deno.exit(1);
  } else {
    console.log('   ✅ Trigger disabled');
  }

  // Step 1: Get test user profiles
  console.log('\n👥 Finding test users...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, username')
    .in('username', TEST_USERS.map(u => u.username));

  if (profilesError || !profiles || profiles.length === 0) {
    console.error('❌ Test users not found. Run seed-test-users.ts first.');
    Deno.exit(1);
  }

  console.log(`   ✅ Found ${profiles.length} test users`);

  // Step 2: Get last N completed events
  console.log(`\n📅 Fetching last ${EVENTS_TO_SEED} completed events...`);
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'completed')
    .order('event_date', { ascending: false })
    .limit(EVENTS_TO_SEED);

  if (eventsError || !events || events.length === 0) {
    console.error('❌ No completed events found.');
    Deno.exit(1);
  }

  console.log(`   ✅ Found ${events.length} completed events:`);
  events.forEach((e, i) => {
    console.log(`      ${i + 1}. ${e.name} (${new Date(e.event_date).toLocaleDateString()})`);
  });

  // Step 3: Process each event
  let totalPicksCreated = 0;
  let totalPicksSkipped = 0;

  const userStats: Map<string, { total: number; correct: number; streak: number; bestStreak: number }> = new Map();

  // Initialize user stats
  profiles.forEach(p => {
    userStats.set(p.username, { total: 0, correct: 0, streak: 0, bestStreak: 0 });
  });

  // Process events in chronological order (oldest first) for streak calculation
  const sortedEvents = [...events].reverse();

  for (const event of sortedEvents) {
    console.log(`\n🥊 Processing: ${event.name}`);

    // Get bouts for this event with results
    const { data: bouts, error: boutsError } = await supabase
      .from('bouts')
      .select('*, results(winner_corner)')
      .eq('event_id', event.id)
      .order('order_index', { ascending: true });

    if (boutsError || !bouts || bouts.length === 0) {
      console.log(`   ⚠️  No bouts found for this event, skipping...`);
      continue;
    }

    console.log(`   Found ${bouts.length} bouts`);

    // Create picks for each user
    for (const profile of profiles) {
      const testUser = TEST_USERS.find(u => u.username === profile.username);
      if (!testUser) continue;

      const stats = userStats.get(profile.username)!;
      let userEventPicks = 0;

      for (const bout of bouts) {
        // Skip bouts without results
        const winnerCorner = bout.results?.winner_corner;
        if (!winnerCorner || winnerCorner === 'draw' || winnerCorner === 'nc') {
          continue;
        }

        // Check if pick already exists
        const { data: existingPick } = await supabase
          .from('picks')
          .select('id')
          .eq('user_id', profile.user_id)
          .eq('bout_id', bout.id)
          .maybeSingle();

        if (existingPick) {
          totalPicksSkipped++;
          continue;
        }

        // Simulate pick based on user's bias
        // Higher bias = more likely to pick red corner (typically the favorite)
        const pickRed = Math.random() < testUser.bias;
        const pickedCorner = pickRed ? 'red' : 'blue';
        const isCorrect = pickedCorner === winnerCorner;

        // Create the pick with score (graded)
        const { error: pickError } = await supabase
          .from('picks')
          .insert({
            user_id: profile.user_id,
            event_id: event.id,
            bout_id: bout.id,
            picked_corner: pickedCorner,
            score: isCorrect ? 1 : 0,
            status: 'graded',
          });

        if (pickError) {
          console.error(`   ❌ Error creating pick for ${profile.username}: ${pickError.message}`);
        } else {
          totalPicksCreated++;
          userEventPicks++;
          stats.total++;

          if (isCorrect) {
            stats.correct++;
            stats.streak++;
            if (stats.streak > stats.bestStreak) {
              stats.bestStreak = stats.streak;
            }
          } else {
            stats.streak = 0;
          }
        }
      }

      if (userEventPicks > 0) {
        console.log(`   ✅ ${profile.username}: ${userEventPicks} picks created`);
      }
    }
  }

  // Step 4: Update user_stats table
  console.log('\n📊 Updating user stats...');

  for (const profile of profiles) {
    const stats = userStats.get(profile.username)!;

    if (stats.total === 0) continue;

    const accuracy = Math.round((stats.correct / stats.total) * 1000) / 10;

    const { error: statsError } = await supabase
      .from('user_stats')
      .upsert({
        user_id: profile.user_id,
        total_picks: stats.total,
        correct_winner: stats.correct,
        accuracy_pct: accuracy,
        current_streak: stats.streak,
        best_streak: stats.bestStreak,
      }, { onConflict: 'user_id' });

    if (statsError) {
      console.error(`   ❌ Failed to update stats for ${profile.username}: ${statsError.message}`);
    } else {
      console.log(`   ✅ ${profile.username}: ${accuracy}% (${stats.correct}/${stats.total}), streak: ${stats.streak}, best: ${stats.bestStreak}`);
    }
  }

  // Re-enable pick lock trigger
  console.log('\n🔒 Re-enabling pick lock trigger...');
  const { error: enableError } = await supabase.rpc('enable_pick_lock_trigger');
  if (enableError) {
    console.error('   ⚠️  Failed to re-enable trigger:', enableError.message);
  } else {
    console.log('   ✅ Trigger re-enabled');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✨ HISTORICAL PICKS SEEDED!');
  console.log('='.repeat(60));
  console.log(`\n📅 Events processed: ${events.length}`);
  console.log(`✅ Picks created: ${totalPicksCreated}`);
  console.log(`⚠️  Picks skipped (already exist): ${totalPicksSkipped}`);

  console.log('\n📊 Final Leaderboard:');
  const sortedUsers = [...userStats.entries()]
    .filter(([_, s]) => s.total > 0)
    .sort((a, b) => {
      const accA = a[1].correct / a[1].total;
      const accB = b[1].correct / b[1].total;
      return accB - accA;
    });

  sortedUsers.forEach(([username, stats], i) => {
    const accuracy = Math.round((stats.correct / stats.total) * 1000) / 10;
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    console.log(`   ${medal} ${username}: ${accuracy}% (${stats.correct}/${stats.total})`);
  });

  console.log('\n✨ Users can now view their pick history for past events!');
}

if (import.meta.main) {
  main().catch(error => {
    console.error('Fatal error:', error);
    Deno.exit(1);
  });
}
