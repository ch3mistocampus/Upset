/**
 * Seed Test Users Script
 *
 * Creates test users for development and testing.
 * Run with: deno run --allow-net --allow-env scripts/seed-test-users.ts
 *
 * Requirements:
 * - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
 * - Or pass them as arguments
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface TestUser {
  email: string;
  password: string;
  username: string;
}

const TEST_USERS: TestUser[] = [
  // Original 3 users
  { email: 'alice@test.com', password: 'Password123', username: 'alice_ufc' },
  { email: 'bob@test.com', password: 'Password123', username: 'bob_fighter' },
  { email: 'charlie@test.com', password: 'Password123', username: 'charlie_picks' },
  // 10 new users with distinct personalities
  { email: 'david@test.com', password: 'Password123', username: 'david_mma' },        // Chalk picker
  { email: 'emma@test.com', password: 'Password123', username: 'emma_octagon' },      // Technical
  { email: 'frank@test.com', password: 'Password123', username: 'frank_knockout' },   // Finish picker
  { email: 'grace@test.com', password: 'Password123', username: 'grace_grappling' },  // Submission picker
  { email: 'henry@test.com', password: 'Password123', username: 'henry_heavyweight' },// Power picker
  { email: 'iris@test.com', password: 'Password123', username: 'iris_insider' },      // Contrarian
  { email: 'jack@test.com', password: 'Password123', username: 'jack_judge' },        // Analyst
  { email: 'kate@test.com', password: 'Password123', username: 'kate_kicks' },        // Striker picker
  { email: 'leo@test.com', password: 'Password123', username: 'leo_legacy' },         // Experience picker
  { email: 'mia@test.com', password: 'Password123', username: 'mia_momentum' },       // Streak picker
];

async function main() {
  // Get environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.args[0];
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.args[1];

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    console.error('');
    console.error('Usage:');
    console.error('  deno run --allow-net --allow-env scripts/seed-test-users.ts');
    console.error('  OR');
    console.error('  deno run --allow-net scripts/seed-test-users.ts <SUPABASE_URL> <SERVICE_KEY>');
    Deno.exit(1);
  }

  console.log('🚀 Seeding test users...\n');

  // Create admin client (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const testUser of TEST_USERS) {
    try {
      console.log(`Creating user: ${testUser.email} (${testUser.username})`);

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: testUser.email,
        password: testUser.password,
        email_confirm: true, // Auto-confirm email
      });

      if (authError) {
        // Check if user already exists
        if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
          console.log(`  ⚠️  User already exists: ${testUser.email}`);
          skipped++;
          continue;
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error('No user returned from createUser');
      }

      console.log(`  ✅ Auth user created: ${authData.user.id}`);

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          username: testUser.username,
        });

      if (profileError) {
        // Check if profile already exists
        if (profileError.code === '23505') { // Unique violation
          console.log(`  ⚠️  Profile already exists: ${testUser.username}`);
          skipped++;
          continue;
        }
        throw profileError;
      }

      console.log(`  ✅ Profile created: ${testUser.username}`);
      console.log(`  📧 Email: ${testUser.email}`);
      console.log(`  🔑 Password: ${testUser.password}\n`);
      created++;

    } catch (error) {
      console.error(`  ❌ Error creating user ${testUser.email}:`, error);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Summary:');
  console.log(`  ✅ Created: ${created}`);
  console.log(`  ⚠️  Skipped (already exist): ${skipped}`);
  console.log(`  ❌ Errors: ${errors}`);
  console.log('='.repeat(60));

  if (created > 0 || skipped > 0) {
    console.log('\n📱 Test Users:');
    TEST_USERS.forEach(user => {
      console.log(`  • ${user.username} → ${user.email} / ${user.password}`);
    });
    console.log('\n✨ You can now sign in with these credentials!');
  }
}

// Run the script
if (import.meta.main) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    Deno.exit(1);
  });
}
