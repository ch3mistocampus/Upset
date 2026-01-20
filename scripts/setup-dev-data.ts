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

// Test user configurations - 13 users with varied picking styles
const TEST_USERS = [
  // Original 3 users
  { email: 'alice@test.com', password: 'Password123', username: 'alicechen' },
  { email: 'bob@test.com', password: 'Password123', username: 'bsantos' },
  { email: 'charlie@test.com', password: 'Password123', username: 'charliej' },
  // 10 new users with distinct personalities
  { email: 'david@test.com', password: 'Password123', username: 'dkim23' },        // Chalk picker - always favorites
  { email: 'emma@test.com', password: 'Password123', username: 'emmarod' },      // Technical - balanced
  { email: 'frank@test.com', password: 'Password123', username: 'bigfrank' },   // Finish picker - likes KO artists
  { email: 'grace@test.com', password: 'Password123', username: 'gracet' },  // Submission picker - grapplers
  { email: 'henry@test.com', password: 'Password123', username: 'henryjack' },// Power picker - bigger fighters
  { email: 'iris@test.com', password: 'Password123', username: 'irismtz' },      // Contrarian - picks underdogs
  { email: 'jack@test.com', password: 'Password123', username: 'jmorrison' },        // Analyst - very balanced
  { email: 'kate@test.com', password: 'Password123', username: 'kateo' },        // Striker - picks strikers
  { email: 'leo@test.com', password: 'Password123', username: 'leonak' },         // Experience - picks veterans
  { email: 'mia@test.com', password: 'Password123', username: 'miadavis' },       // Streak picker - hot fighters
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

  // Pick probability mapping based on user style
  // Red corner is typically the favorite (home/higher ranked fighter)
  const PICK_STYLES: Record<string, number> = {
    'alicechen': 0.65,         // Tends toward favorites
    'bsantos': 0.40,       // Tends toward underdogs
    'charliej': 0.50,     // Random/balanced
    'dkim23': 0.80,         // Heavy chalk - almost always favorites
    'emmarod': 0.55,      // Slight favorite lean
    'bigfrank': 0.60,    // Likes power (often red corner)
    'gracet': 0.45,   // Slight underdog lean (grapplers often blue)
    'henryjack': 0.70, // Bigger fighters (often favorites)
    'irismtz': 0.30,      // Contrarian - heavy underdog
    'jmorrison': 0.55,        // Balanced analyst
    'kateo': 0.50,        // Random striker picks
    'leonak': 0.60,        // Veterans often favorites
    'miadavis': 0.65,      // Picks momentum/hot fighters
  };

  for (const user of createdUsers) {
    console.log(`Creating picks for ${user.username}...`);

    for (const bout of bouts) {
      // Vary pick distribution per user based on their picking style
      const redProb = PICK_STYLES[user.username] || 0.50;
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
  // Step 5b: Create Mock Picks for Completed Events (graded)
  // =========================================================================
  console.log('\n🏆 STEP 5b: Creating Graded Picks for Completed Events...\n');

  // Get completed events with results
  const { data: completedEvents } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'completed')
    .order('event_date', { ascending: false })
    .limit(3);  // Last 3 completed events

  let gradedPicksCreated = 0;

  if (completedEvents && completedEvents.length > 0) {
    for (const event of completedEvents) {
      console.log(`\n📅 Processing: ${event.name}`);

      // Get bouts with results for this event
      const { data: completedBouts } = await supabase
        .from('bouts')
        .select('*, results(*)')
        .eq('event_id', event.id)
        .eq('status', 'completed')
        .order('order_index', { ascending: true });

      if (!completedBouts || completedBouts.length === 0) {
        console.log('   No completed bouts with results found');
        continue;
      }

      console.log(`   Found ${completedBouts.length} completed bouts`);

      for (const user of createdUsers) {
        const redProb = PICK_STYLES[user.username] || 0.50;

        for (const bout of completedBouts) {
          // Check if pick already exists
          const { data: existingPick } = await supabase
            .from('picks')
            .select('id')
            .eq('user_id', user.user_id)
            .eq('bout_id', bout.id)
            .single();

          if (existingPick) continue;

          // Generate pick based on user's style
          const pickedCorner = Math.random() < redProb ? 'red' : 'blue';

          // Get the result for this bout
          const result = bout.results?.[0] || bout.results;
          const winnerCorner = result?.winner_corner;

          // Calculate score: 1 for correct, 0 for incorrect, null for no result
          let score: number | null = null;
          if (winnerCorner && winnerCorner !== 'draw' && winnerCorner !== 'nc') {
            score = pickedCorner === winnerCorner ? 1 : 0;
          }

          // Create graded pick
          const { error } = await supabase
            .from('picks')
            .insert({
              user_id: user.user_id,
              event_id: event.id,
              bout_id: bout.id,
              picked_corner: pickedCorner,
              status: 'graded',
              score: score,
              locked_at: event.event_date,
            });

          if (!error) {
            gradedPicksCreated++;
          }
        }
      }
    }
  }

  console.log(`\n✅ Graded picks created: ${gradedPicksCreated}`);

  // =========================================================================
  // Step 6: Initialize User Stats with Mock Data
  // =========================================================================
  console.log('\n📊 STEP 6: Initializing User Stats with Mock Data...\n');

  // Realistic stats based on recent UFC events (verified Dec 2025):
  // - UFC 323 (Dec 6, 2025): Petr Yan def. Merab Dvalishvili via UD - reclaimed bantamweight title
  // - UFC Fight Night (Dec 13, 2025): Manel Kape def. Brandon Royval via R1 TKO
  // - UFC Fight Night (Dec 21, 2025): Various fights
  // Simulated picks across ~25-30 fights from these events
  const MOCK_STATS = [
    // Original 3 users
    { username: 'alicechen', total_picks: 28, correct_winner: 19, accuracy_pct: 67.9, current_streak: 4, best_streak: 7 },
    { username: 'bsantos', total_picks: 28, correct_winner: 15, accuracy_pct: 53.6, current_streak: 1, best_streak: 5 },
    { username: 'charliej', total_picks: 28, correct_winner: 17, accuracy_pct: 60.7, current_streak: 2, best_streak: 4 },
    // 10 new users with varied stats reflecting their picking styles
    { username: 'dkim23', total_picks: 30, correct_winner: 22, accuracy_pct: 73.3, current_streak: 6, best_streak: 9 },      // Chalk picker - high accuracy
    { username: 'emmarod', total_picks: 26, correct_winner: 17, accuracy_pct: 65.4, current_streak: 3, best_streak: 6 },   // Technical - solid
    { username: 'bigfrank', total_picks: 25, correct_winner: 14, accuracy_pct: 56.0, current_streak: 0, best_streak: 4 }, // Finish picker - volatile
    { username: 'gracet', total_picks: 27, correct_winner: 16, accuracy_pct: 59.3, current_streak: 2, best_streak: 5 },// Submission picker
    { username: 'henryjack', total_picks: 24, correct_winner: 13, accuracy_pct: 54.2, current_streak: 1, best_streak: 3 },// Power picker
    { username: 'irismtz', total_picks: 29, correct_winner: 13, accuracy_pct: 44.8, current_streak: 0, best_streak: 3 },   // Contrarian - low accuracy (underdogs lose)
    { username: 'jmorrison', total_picks: 30, correct_winner: 20, accuracy_pct: 66.7, current_streak: 5, best_streak: 8 },     // Analyst - very good
    { username: 'kateo', total_picks: 26, correct_winner: 15, accuracy_pct: 57.7, current_streak: 2, best_streak: 4 },     // Striker picker
    { username: 'leonak', total_picks: 28, correct_winner: 18, accuracy_pct: 64.3, current_streak: 3, best_streak: 6 },     // Experience picker
    { username: 'miadavis', total_picks: 27, correct_winner: 19, accuracy_pct: 70.4, current_streak: 7, best_streak: 10 },  // Streak picker - on fire!
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

  // Create friendships between users - mix of connections for realistic social graph
  // Each user has 2-5 friends, creating clusters and cross-connections
  const friendshipPairs = [
    // Original trio stays connected
    [0, 1],   // alice - bob
    [0, 2],   // alice - charlie
    [1, 2],   // bob - charlie
    // David (chalk picker) friends with high-accuracy users
    [3, 0],   // david - alice
    [3, 9],   // david - jack (both analytical)
    [3, 12],  // david - mia
    // Emma (technical) has diverse friends
    [4, 0],   // emma - alice
    [4, 5],   // emma - frank
    [4, 9],   // emma - jack
    // Frank (KO picker) friends with action fans
    [5, 7],   // frank - henry
    [5, 10],  // frank - kate
    // Grace (grappling) friends
    [6, 4],   // grace - emma
    [6, 11],  // grace - leo
    // Henry (heavyweight) connections
    [7, 1],   // henry - bob
    [7, 10],  // henry - kate
    // Iris (contrarian) connects with fellow risk-takers
    [8, 1],   // iris - bob
    [8, 5],   // iris - frank
    [8, 12],  // iris - mia
    // Jack (analyst) popular - friends with many
    [9, 2],   // jack - charlie
    [9, 11],  // jack - leo
    [9, 12],  // jack - mia
    // Kate (striker) friends
    [10, 4],  // kate - emma
    [10, 12], // kate - mia
    // Leo (legacy/veteran picker)
    [11, 0],  // leo - alice
    [11, 3],  // leo - david
    // Mia (momentum) is well connected - rising star
    [12, 2],  // mia - charlie
    [12, 6],  // mia - grace
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
  console.log('\n📊 Leaderboard Preview (sorted by accuracy):');
  const sortedStats = [...MOCK_STATS].sort((a, b) => b.accuracy_pct - a.accuracy_pct);
  sortedStats.slice(0, 10).forEach((s, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
    console.log(`   ${medal} ${i + 1}. ${s.username}: ${s.accuracy_pct}% (${s.correct_winner}/${s.total_picks})`);
  });
  if (sortedStats.length > 10) {
    console.log(`   ... and ${sortedStats.length - 10} more users`);
  }
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
