/**
 * Seed Mock Picks Script
 *
 * Creates mock picks for test users on the next upcoming event.
 * Run with: deno run --allow-net --allow-env scripts/seed-mock-picks.ts
 *
 * Requirements:
 * - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
 * - Test users must already exist (run seed-test-users.ts first)
 * - Events and bouts must be synced (run sync-events and sync-next-event-card)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TEST_USERNAMES = ['alicechen', 'bsantos', 'charliej'];

async function main() {
  // Get environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.args[0];
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.args[1];

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    console.error('');
    console.error('Usage:');
    console.error('  deno run --allow-net --allow-env scripts/seed-mock-picks.ts');
    console.error('  OR');
    console.error('  deno run --allow-net scripts/seed-mock-picks.ts <SUPABASE_URL> <SERVICE_KEY>');
    Deno.exit(1);
  }

  console.log('🚀 Seeding mock picks for test users...\n');

  // Create admin client (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Step 1: Get the next upcoming event
  console.log('📅 Finding next upcoming event...');
  const { data: nextEvent, error: eventError } = await supabase
    .from('events')
    .select('*')
    .neq('status', 'completed')
    .order('event_date', { ascending: true })
    .limit(1)
    .single();

  if (eventError || !nextEvent) {
    console.error('❌ No upcoming events found. Run sync-events first.');
    console.error('   curl -X POST "YOUR_SUPABASE_URL/functions/v1/sync-events" \\');
    console.error('        -H "Authorization: Bearer YOUR_SERVICE_KEY"');
    Deno.exit(1);
  }

  console.log(`✅ Found event: ${nextEvent.name}`);
  console.log(`   Date: ${nextEvent.event_date}`);
  console.log(`   Location: ${nextEvent.location}\n`);

  // Step 2: Get bouts for the event
  console.log('🥊 Fetching bouts for event...');
  const { data: bouts, error: boutsError } = await supabase
    .from('bouts')
    .select('*')
    .eq('event_id', nextEvent.id)
    .eq('status', 'scheduled')
    .order('order_index', { ascending: true });

  if (boutsError || !bouts || bouts.length === 0) {
    console.error('❌ No bouts found for this event. Run sync-next-event-card first.');
    console.error('   curl -X POST "YOUR_SUPABASE_URL/functions/v1/sync-next-event-card" \\');
    console.error('        -H "Authorization: Bearer YOUR_SERVICE_KEY"');
    Deno.exit(1);
  }

  console.log(`✅ Found ${bouts.length} bouts\n`);

  // Step 3: Get test user IDs
  console.log('👥 Finding test users...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, username')
    .in('username', TEST_USERNAMES);

  if (profilesError || !profiles || profiles.length === 0) {
    console.error('❌ Test users not found. Run seed-test-users.ts first.');
    Deno.exit(1);
  }

  console.log(`✅ Found ${profiles.length} test users\n`);

  // Step 4: Create mock picks for each user
  let totalPicks = 0;
  let skippedPicks = 0;

  for (const profile of profiles) {
    console.log(`\n🎯 Creating picks for ${profile.username}...`);

    for (const bout of bouts) {
      // Randomly pick red or blue corner (with slight bias variations per user)
      const userBias = TEST_USERNAMES.indexOf(profile.username);
      const redProbability = 0.4 + (userBias * 0.1); // alice: 40%, bob: 50%, charlie: 60%
      const pickedCorner = Math.random() < redProbability ? 'red' : 'blue';
      const pickedFighter = pickedCorner === 'red' ? bout.red_name : bout.blue_name;

      // Check if pick already exists
      const { data: existingPick } = await supabase
        .from('picks')
        .select('id')
        .eq('user_id', profile.user_id)
        .eq('bout_id', bout.id)
        .single();

      if (existingPick) {
        console.log(`   ⚠️  Pick exists for ${bout.red_name} vs ${bout.blue_name}`);
        skippedPicks++;
        continue;
      }

      // Create pick
      const { error: pickError } = await supabase
        .from('picks')
        .insert({
          user_id: profile.user_id,
          event_id: nextEvent.id,
          bout_id: bout.id,
          picked_corner: pickedCorner,
        });

      if (pickError) {
        console.error(`   ❌ Error creating pick: ${pickError.message}`);
      } else {
        console.log(`   ✅ Picked ${pickedFighter} (${pickedCorner}) for ${bout.red_name} vs ${bout.blue_name}`);
        totalPicks++;
      }
    }
  }

  // Step 5: Initialize user_stats for test users (if not exists)
  console.log('\n📊 Initializing user stats...');
  for (const profile of profiles) {
    const { data: existingStats } = await supabase
      .from('user_stats')
      .select('user_id')
      .eq('user_id', profile.user_id)
      .single();

    if (!existingStats) {
      const { error: statsError } = await supabase
        .from('user_stats')
        .insert({
          user_id: profile.user_id,
          total_picks: 0,
          correct_winner: 0,
          accuracy_pct: 0,
          current_streak: 0,
          best_streak: 0,
        });

      if (statsError) {
        console.log(`   ⚠️  Stats already exist for ${profile.username}`);
      } else {
        console.log(`   ✅ Created stats for ${profile.username}`);
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Summary:');
  console.log(`  📅 Event: ${nextEvent.name}`);
  console.log(`  🥊 Bouts: ${bouts.length}`);
  console.log(`  👥 Users: ${profiles.length}`);
  console.log(`  ✅ Picks created: ${totalPicks}`);
  console.log(`  ⚠️  Picks skipped (already exist): ${skippedPicks}`);
  console.log('='.repeat(60));

  console.log('\n✨ Mock picks seeded successfully!');
  console.log('\nTest users can now sign in and see their picks:');
  TEST_USERNAMES.forEach(username => {
    console.log(`  • ${username} → Password123`);
  });
}

// Run the script
if (import.meta.main) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    Deno.exit(1);
  });
}
