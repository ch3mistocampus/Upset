/**
 * Check if ESPN ID columns exist in database
 * Run with: node scripts/check-db-schema.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('🔍 Checking database schema...\n');

  // Check events table for espn_event_id
  console.log('📅 Events table:');
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, name, event_date, status, espn_event_id, ufcstats_event_id')
    .limit(3);

  if (eventsError) {
    if (eventsError.message.includes('espn_event_id')) {
      console.log('  ❌ espn_event_id column does NOT exist');
      console.log('  → Run migration: 20260112000001_add_espn_fighter_id.sql');
    } else {
      console.log('  ❌ Error:', eventsError.message);
    }
  } else {
    const hasEspnId = events?.[0]?.hasOwnProperty('espn_event_id');
    console.log(`  ${hasEspnId ? '✅' : '❌'} espn_event_id column: ${hasEspnId ? 'EXISTS' : 'MISSING'}`);
    console.log(`  Sample: ${events?.length || 0} events found`);
  }

  // Check ufc_fighters table for espn_fighter_id
  console.log('\n🥊 UFC Fighters table:');
  const { data: fighters, error: fightersError } = await supabase
    .from('ufc_fighters')
    .select('fighter_id, full_name, espn_fighter_id')
    .limit(3);

  if (fightersError) {
    if (fightersError.message.includes('espn_fighter_id')) {
      console.log('  ❌ espn_fighter_id column does NOT exist');
    } else {
      console.log('  ❌ Error:', fightersError.message);
    }
  } else {
    const hasEspnId = fighters?.[0]?.hasOwnProperty('espn_fighter_id');
    console.log(`  ${hasEspnId ? '✅' : '❌'} espn_fighter_id column: ${hasEspnId ? 'EXISTS' : 'MISSING'}`);
    console.log(`  Sample: ${fighters?.length || 0} fighters found`);
  }

  // Check bouts table for espn columns
  console.log('\n⚔️ Bouts table:');
  const { data: bouts, error: boutsError } = await supabase
    .from('bouts')
    .select('id, espn_fight_id, espn_red_fighter_id, espn_blue_fighter_id')
    .limit(3);

  if (boutsError) {
    if (boutsError.message.includes('espn')) {
      console.log('  ❌ ESPN columns do NOT exist');
    } else {
      console.log('  ❌ Error:', boutsError.message);
    }
  } else {
    const hasEspnId = bouts?.[0]?.hasOwnProperty('espn_fight_id');
    console.log(`  ${hasEspnId ? '✅' : '❌'} ESPN columns: ${hasEspnId ? 'EXIST' : 'MISSING'}`);
  }

  // Check current events
  console.log('\n📋 Current upcoming events:');
  const { data: upcoming } = await supabase
    .from('events')
    .select('name, event_date, status')
    .in('status', ['upcoming', 'live'])
    .order('event_date', { ascending: true })
    .limit(5);

  if (upcoming?.length) {
    upcoming.forEach((e, i) => {
      const date = new Date(e.event_date).toLocaleDateString();
      console.log(`  ${i + 1}. ${e.name} (${date}) [${e.status}]`);
    });
  } else {
    console.log('  No upcoming events found');
  }
}

checkSchema().catch(console.error);
