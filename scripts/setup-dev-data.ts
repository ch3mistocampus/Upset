/**
 * Setup Development Data Script
 *
 * Comprehensive script to set up all development data:
 * 1. Sync UFC events from UFCStats.com
 * 2. Sync bouts for the next upcoming event
 * 3. Create test users
 * 4. Create mock picks for test users
 *
 * Run with: deno run --allow-net --allow-env scripts/setup-dev-data.ts
 *
 * Requirements:
 * - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Test user configurations
const TEST_USERS = [
  { email: 'alice@test.com', password: 'Password123', username: 'alice_ufc' },
  { email: 'bob@test.com', password: 'Password123', username: 'bob_fighter' },
  { email: 'charlie@test.com', password: 'Password123', username: 'charlie_picks' },
];

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

  console.log('🚀 Setting up development data...\n');
  console.log('='.repeat(60));

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // =========================================================================
  // Step 1: Sync Events
  // =========================================================================
  console.log('\n📅 STEP 1: Syncing UFC Events from UFCStats.com...\n');

  try {
    const eventsResponse = await fetch(`${supabaseUrl}/functions/v1/sync-events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
    });

    const eventsResult = await eventsResponse.json();

    if (eventsResult.success) {
      console.log(`✅ Events synced successfully!`);
      console.log(`   Inserted: ${eventsResult.inserted}`);
      console.log(`   Updated: ${eventsResult.updated}`);
      console.log(`   Total: ${eventsResult.total}`);
    } else {
      console.log(`⚠️  Events sync returned: ${eventsResult.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error(`❌ Failed to sync events: ${error.message}`);
    console.log('   Continuing with existing data...');
  }

  await sleep(1000);

  // =========================================================================
  // Step 2: Sync Next Event Card (Bouts)
  // =========================================================================
  console.log('\n🥊 STEP 2: Syncing Bouts for Next Event...\n');

  try {
    const cardResponse = await fetch(`${supabaseUrl}/functions/v1/sync-next-event-card`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
    });

    const cardResult = await cardResponse.json();

    if (cardResult.success) {
      console.log(`✅ Event card synced successfully!`);
      console.log(`   Event: ${cardResult.event_name || 'Unknown'}`);
      console.log(`   Bouts: ${cardResult.bouts_count || cardResult.inserted + cardResult.updated || 0}`);
    } else {
      console.log(`⚠️  Card sync returned: ${cardResult.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error(`❌ Failed to sync event card: ${error.message}`);
    console.log('   Continuing with existing data...');
  }

  await sleep(1000);

  // =========================================================================
  // Step 3: Create Test Users
  // =========================================================================
  console.log('\n👥 STEP 3: Creating Test Users...\n');

  const createdUsers: { user_id: string; username: string }[] = [];

  for (const testUser of TEST_USERS) {
    try {
      // Check if user exists by email
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id, username')
        .eq('username', testUser.username)
        .single();

      if (existingProfile) {
        console.log(`⚠️  User exists: ${testUser.username}`);
        createdUsers.push(existingProfile);
        continue;
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: testUser.email,
        password: testUser.password,
        email_confirm: true,
      });

      if (authError) {
        if (authError.message.includes('already')) {
          console.log(`⚠️  Auth user exists: ${testUser.email}`);
          // Try to get the user ID
          const { data: users } = await supabase.auth.admin.listUsers();
          const existingUser = users?.users?.find(u => u.email === testUser.email);
          if (existingUser) {
            // Check if profile exists
            const { data: profile } = await supabase
              .from('profiles')
              .select('user_id, username')
              .eq('user_id', existingUser.id)
              .single();
            if (profile) {
              createdUsers.push(profile);
            }
          }
          continue;
        }
        throw authError;
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user!.id,
          username: testUser.username,
        });

      if (profileError) {
        console.error(`❌ Profile error for ${testUser.username}: ${profileError.message}`);
        continue;
      }

      console.log(`✅ Created: ${testUser.username} (${testUser.email})`);
      createdUsers.push({ user_id: authData.user!.id, username: testUser.username });

    } catch (error) {
      console.error(`❌ Error creating ${testUser.username}: ${error.message}`);
    }
  }

  await sleep(500);

  // =========================================================================
  // Step 4: Get Next Event and Bouts
  // =========================================================================
  console.log('\n📋 STEP 4: Getting Next Event Data...\n');

  const { data: nextEvent } = await supabase
    .from('events')
    .select('*')
    .neq('status', 'completed')
    .order('event_date', { ascending: true })
    .limit(1)
    .single();

  if (!nextEvent) {
    console.error('❌ No upcoming events found!');
    console.log('\nPlease check that the sync-events function is working.');
    Deno.exit(1);
  }

  console.log(`📅 Next Event: ${nextEvent.name}`);
  console.log(`   Date: ${new Date(nextEvent.event_date).toLocaleDateString()}`);
  console.log(`   Location: ${nextEvent.location}`);

  const { data: bouts } = await supabase
    .from('bouts')
    .select('*')
    .eq('event_id', nextEvent.id)
    .eq('status', 'scheduled')
    .order('order_index', { ascending: true });

  if (!bouts || bouts.length === 0) {
    console.error('\n❌ No bouts found for this event!');
    console.log('   The sync-next-event-card may have failed or the event has no fights yet.');
    Deno.exit(1);
  }

  console.log(`🥊 Bouts: ${bouts.length}`);
  bouts.forEach((bout, i) => {
    console.log(`   ${i + 1}. ${bout.red_name} vs ${bout.blue_name} (${bout.weight_class})`);
  });

  // =========================================================================
  // Step 5: Create Mock Picks
  // =========================================================================
  console.log('\n🎯 STEP 5: Creating Mock Picks...\n');

  let picksCreated = 0;
  let picksSkipped = 0;

  for (const user of createdUsers) {
    console.log(`Creating picks for ${user.username}...`);

    for (const bout of bouts) {
      // Vary pick distribution per user
      const userIndex = TEST_USERS.findIndex(u => u.username === user.username);
      const redProb = 0.35 + (userIndex * 0.15); // 35%, 50%, 65%
      const pickedCorner = Math.random() < redProb ? 'red' : 'blue';

      // Check if pick exists
      const { data: existingPick } = await supabase
        .from('picks')
        .select('id')
        .eq('user_id', user.user_id)
        .eq('bout_id', bout.id)
        .single();

      if (existingPick) {
        picksSkipped++;
        continue;
      }

      // Create pick
      const { error } = await supabase
        .from('picks')
        .insert({
          user_id: user.user_id,
          event_id: nextEvent.id,
          bout_id: bout.id,
          picked_corner: pickedCorner,
        });

      if (!error) {
        picksCreated++;
      }
    }
  }

  console.log(`✅ Picks created: ${picksCreated}`);
  console.log(`⚠️  Picks skipped (already exist): ${picksSkipped}`);

  // =========================================================================
  // Step 6: Initialize User Stats with Mock Data
  // =========================================================================
  console.log('\n📊 STEP 6: Initializing User Stats with Mock Data...\n');

  // Mock stats to make the leaderboard interesting
  const MOCK_STATS = [
    { username: 'alice_ufc', total_picks: 45, correct_winner: 32, accuracy_pct: 71.1, current_streak: 5, best_streak: 8 },
    { username: 'bob_fighter', total_picks: 38, correct_winner: 24, accuracy_pct: 63.2, current_streak: 2, best_streak: 6 },
    { username: 'charlie_picks', total_picks: 52, correct_winner: 29, accuracy_pct: 55.8, current_streak: 0, best_streak: 4 },
  ];

  for (const user of createdUsers) {
    const mockStats = MOCK_STATS.find(s => s.username === user.username);
    if (!mockStats) continue;

    // Upsert user_stats (update if exists, insert if not)
    const { error } = await supabase
      .from('user_stats')
      .upsert({
        user_id: user.user_id,
        total_picks: mockStats.total_picks,
        correct_winner: mockStats.correct_winner,
        accuracy_pct: mockStats.accuracy_pct,
        current_streak: mockStats.current_streak,
        best_streak: mockStats.best_streak,
      }, { onConflict: 'user_id' });

    if (error) {
      console.error(`❌ Failed to upsert stats for ${user.username}: ${error.message}`);
    } else {
      console.log(`✅ Stats set for ${user.username}: ${mockStats.accuracy_pct}% accuracy`);
    }
  }

  // =========================================================================
  // Step 7: Create Friendships Between Test Users
  // =========================================================================
  console.log('\n👫 STEP 7: Creating Friendships Between Test Users...\n');

  let friendshipsCreated = 0;
  let friendshipsSkipped = 0;

  // Create friendships: alice-bob, alice-charlie, bob-charlie
  const friendshipPairs = [
    [0, 1], // alice - bob
    [0, 2], // alice - charlie
    [1, 2], // bob - charlie
  ];

  for (const [i, j] of friendshipPairs) {
    const user1 = createdUsers[i];
    const user2 = createdUsers[j];

    if (!user1 || !user2) continue;

    // Check if friendship already exists
    const { data: existing } = await supabase
      .from('friendships')
      .select('id')
      .or(`and(user_id.eq.${user1.user_id},friend_id.eq.${user2.user_id}),and(user_id.eq.${user2.user_id},friend_id.eq.${user1.user_id})`)
      .limit(1)
      .single();

    if (existing) {
      console.log(`⚠️  Friendship exists: ${user1.username} ↔ ${user2.username}`);
      friendshipsSkipped++;
      continue;
    }

    // Create accepted friendship
    const { error } = await supabase
      .from('friendships')
      .insert({
        user_id: user1.user_id,
        friend_id: user2.user_id,
        status: 'accepted',
      });

    if (error) {
      console.error(`❌ Failed to create friendship: ${error.message}`);
    } else {
      console.log(`✅ Friends: ${user1.username} ↔ ${user2.username}`);
      friendshipsCreated++;
    }
  }

  console.log(`\n✅ Friendships created: ${friendshipsCreated}`);
  console.log(`⚠️  Friendships skipped: ${friendshipsSkipped}`);

  // =========================================================================
  // Step 8: Initialize Privacy Settings for Test Users
  // =========================================================================
  console.log('\n🔒 STEP 8: Setting Privacy to Public for Test Users...\n');

  for (const user of createdUsers) {
    const { error } = await supabase
      .from('privacy_settings')
      .upsert({
        user_id: user.user_id,
        picks_visibility: 'public',
        profile_visibility: 'public',
        stats_visibility: 'public',
      }, { onConflict: 'user_id' });

    if (error) {
      console.log(`⚠️  Privacy settings error for ${user.username}: ${error.message}`);
    } else {
      console.log(`✅ Privacy set to public for ${user.username}`);
    }
  }

  // =========================================================================
  // Summary
  // =========================================================================
  console.log('\n' + '='.repeat(60));
  console.log('✨ SETUP COMPLETE!');
  console.log('='.repeat(60));
  console.log('\n📅 Next Event:');
  console.log(`   ${nextEvent.name}`);
  console.log(`   ${bouts.length} fights`);
  console.log('\n👥 Test Users (Password: Password123):');
  TEST_USERS.forEach(u => {
    console.log(`   • ${u.username} → ${u.email}`);
  });
  console.log('\n🎯 What was set up:');
  console.log('   • Mock picks for upcoming event');
  console.log('   • User stats with accuracy data (for leaderboards)');
  console.log('   • Friendships between all test users');
  console.log('   • Privacy settings set to public');
  console.log('\n📊 Leaderboard Preview:');
  MOCK_STATS.forEach((s, i) => {
    console.log(`   ${i + 1}. ${s.username}: ${s.accuracy_pct}% (${s.correct_winner}/${s.total_picks})`);
  });
  console.log('\n📱 Open the app and sign in with any test user to see:');
  console.log('   • Picks for upcoming event');
  console.log('   • Global leaderboard with rankings');
  console.log('   • Friends list with all test users');

  console.log('\n💡 TIP: For more realistic stats based on real UFC results, run:');
  console.log('   deno run --allow-net --allow-env scripts/seed-real-historical-data.ts');
  console.log('   This fetches data from the last 2 completed UFC events!');
}

if (import.meta.main) {
  main().catch(error => {
    console.error('Fatal error:', error);
    Deno.exit(1);
  });
}
