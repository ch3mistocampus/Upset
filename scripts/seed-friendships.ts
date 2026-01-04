/**
 * Seed Friendships Script
 *
 * Creates accepted friendships between all test users so they
 * appear on each other's friends leaderboards.
 *
 * Run with: deno run --allow-net --allow-env scripts/seed-friendships.ts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TEST_USERNAMES = [
  'alice_ufc',
  'bob_fighter',
  'charlie_picks',
  'david_mma',
  'emma_octagon',
  'frank_knockout',
  'grace_grappling',
  'henry_heavyweight',
  'iris_insider',
  'jack_judge',
  'kate_kicks',
  'leo_legacy',
  'mia_momentum',
];

async function main() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables:');
    console.error('   export SUPABASE_URL="https://your-project.supabase.co"');
    console.error('   export SUPABASE_SERVICE_ROLE_KEY="your-service-key"');
    Deno.exit(1);
  }

  console.log('Creating friendships between all test users...\n');
  console.log('='.repeat(60));

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Step 1: Get all test user profiles
  console.log('\nFinding test users...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, username')
    .in('username', TEST_USERNAMES);

  if (profilesError || !profiles || profiles.length === 0) {
    console.error('Test users not found. Run seed-test-users.ts first.');
    Deno.exit(1);
  }

  console.log(`   Found ${profiles.length} test users`);

  // Step 2: Create friendships between all pairs
  console.log('\nCreating friendships...');

  let created = 0;
  let skipped = 0;
  let errors = 0;

  // Create a friendship for each unique pair (A -> B, not B -> A)
  for (let i = 0; i < profiles.length; i++) {
    for (let j = i + 1; j < profiles.length; j++) {
      const user1 = profiles[i];
      const user2 = profiles[j];

      // Check if friendship already exists (in either direction)
      const { data: existing } = await supabase
        .from('friendships')
        .select('id')
        .or(`and(user_id.eq.${user1.user_id},friend_id.eq.${user2.user_id}),and(user_id.eq.${user2.user_id},friend_id.eq.${user1.user_id})`)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      // Create the friendship as accepted
      const { error: insertError } = await supabase
        .from('friendships')
        .insert({
          user_id: user1.user_id,
          friend_id: user2.user_id,
          status: 'accepted',
        });

      if (insertError) {
        console.error(`   Failed: ${user1.username} <-> ${user2.username}: ${insertError.message}`);
        errors++;
      } else {
        created++;
      }
    }
  }

  console.log(`   Created: ${created} friendships`);
  console.log(`   Skipped: ${skipped} (already exist)`);
  if (errors > 0) {
    console.log(`   Errors: ${errors}`);
  }

  // Step 3: Verify friendships
  console.log('\nVerifying friendships...');
  const { count: totalFriendships } = await supabase
    .from('friendships')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'accepted');

  console.log(`   Total accepted friendships: ${totalFriendships}`);

  // Expected: n*(n-1)/2 for n users (unique pairs)
  const expectedPairs = (profiles.length * (profiles.length - 1)) / 2;
  console.log(`   Expected for ${profiles.length} users: ${expectedPairs} pairs`);

  // Step 4: Update user_stats to ensure everyone is on leaderboard
  console.log('\nUpdating user stats for leaderboard...');

  for (const profile of profiles) {
    // Count correct picks
    const { data: picks } = await supabase
      .from('picks')
      .select('picked_corner, bouts!inner(results!inner(winner_corner))')
      .eq('user_id', profile.user_id);

    if (!picks) continue;

    let correct = 0;
    for (const pick of picks) {
      const winnerCorner = (pick.bouts as any)?.results?.winner_corner;
      if (winnerCorner && pick.picked_corner === winnerCorner) {
        correct++;
      }
    }

    const total = picks.length;
    const accuracy = total > 0 ? Math.round((correct / total) * 1000) / 10 : 0;

    const { error: statsError } = await supabase
      .from('user_stats')
      .upsert({
        user_id: profile.user_id,
        total_picks: total,
        correct_winner: correct,
        accuracy_pct: accuracy,
        current_streak: 0,
        best_streak: 0,
      }, { onConflict: 'user_id' });

    if (statsError) {
      console.error(`   Failed to update stats for ${profile.username}: ${statsError.message}`);
    } else {
      console.log(`   ${profile.username}: ${accuracy}% (${correct}/${total})`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('FRIENDSHIPS SEEDED!');
  console.log('='.repeat(60));
  console.log(`\nAll ${profiles.length} test users are now friends with each other.`);
  console.log('They will appear on each others friends leaderboard.');
}

if (import.meta.main) {
  main().catch(error => {
    console.error('Fatal error:', error);
    Deno.exit(1);
  });
}
