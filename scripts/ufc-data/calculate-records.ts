/**
 * Calculate fighter records from fight results
 * Updates ufc_fighters.record_wins/losses/draws/nc based on ufc_fights data
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface FightResult {
  fighter_id: string;
  won: boolean;
  lost: boolean;
  draw: boolean;
  nc: boolean;
}

async function calculateRecords() {
  console.log('🥊 Calculating fighter records from fight history...\n');

  // Fetch ALL fights with pagination (Supabase default limit is 1000)
  const allFights: Array<{
    red_fighter_id: string | null;
    blue_fighter_id: string | null;
    winner_fighter_id: string | null;
    loser_fighter_id: string | null;
    result_method: string | null;
  }> = [];

  const PAGE_SIZE = 1000;
  let offset = 0;
  let hasMore = true;

  console.log('Fetching fights from database...');

  while (hasMore) {
    const { data: fights, error: fetchError } = await supabase
      .from('ufc_fights')
      .select('red_fighter_id, blue_fighter_id, winner_fighter_id, loser_fighter_id, result_method')
      .range(offset, offset + PAGE_SIZE - 1);

    if (fetchError) {
      console.error('Error fetching fights:', fetchError);
      Deno.exit(1);
    }

    if (!fights || fights.length === 0) {
      hasMore = false;
    } else {
      allFights.push(...fights);
      console.log(`  Fetched ${allFights.length} fights...`);
      offset += PAGE_SIZE;
      hasMore = fights.length === PAGE_SIZE;
    }
  }

  if (allFights.length === 0) {
    console.log('No fights found in database');
    Deno.exit(0);
  }

  const fights = allFights;
  console.log(`\nFound ${fights.length} fights to process\n`);

  // Aggregate records per fighter
  const records = new Map<string, { wins: number; losses: number; draws: number; nc: number }>();

  const getRecord = (fighterId: string) => {
    if (!records.has(fighterId)) {
      records.set(fighterId, { wins: 0, losses: 0, draws: 0, nc: 0 });
    }
    return records.get(fighterId)!;
  };

  for (const fight of fights) {
    const method = (fight.result_method || '').toLowerCase();
    const isDraw = method.includes('draw');
    const isNC = method.includes('no contest') || method === 'nc';

    // Process red corner fighter
    if (fight.red_fighter_id) {
      const record = getRecord(fight.red_fighter_id);
      if (isDraw) {
        record.draws++;
      } else if (isNC) {
        record.nc++;
      } else if (fight.winner_fighter_id === fight.red_fighter_id) {
        record.wins++;
      } else if (fight.loser_fighter_id === fight.red_fighter_id) {
        record.losses++;
      }
    }

    // Process blue corner fighter
    if (fight.blue_fighter_id) {
      const record = getRecord(fight.blue_fighter_id);
      if (isDraw) {
        record.draws++;
      } else if (isNC) {
        record.nc++;
      } else if (fight.winner_fighter_id === fight.blue_fighter_id) {
        record.wins++;
      } else if (fight.loser_fighter_id === fight.blue_fighter_id) {
        record.losses++;
      }
    }
  }

  console.log(`Calculated records for ${records.size} fighters\n`);

  // Update fighters in batches
  let updated = 0;
  let errors = 0;
  const entries = Array.from(records.entries());
  const BATCH_SIZE = 100;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);

    for (const [fighterId, record] of batch) {
      const { error: updateError } = await supabase
        .from('ufc_fighters')
        .update({
          record_wins: record.wins,
          record_losses: record.losses,
          record_draws: record.draws,
          record_nc: record.nc,
        })
        .eq('fighter_id', fighterId);

      if (updateError) {
        console.error(`Error updating ${fighterId}:`, updateError.message);
        errors++;
      } else {
        updated++;
      }
    }

    const processed = Math.min(i + BATCH_SIZE, entries.length);
    console.log(`Progress: ${processed}/${entries.length} fighters updated`);
  }

  console.log('\n✅ Record calculation complete!');
  console.log(`   Updated: ${updated} fighters`);
  console.log(`   Errors: ${errors}`);

  // Show sample of results
  const { data: sample } = await supabase
    .from('ufc_fighters')
    .select('full_name, record_wins, record_losses, record_draws')
    .gt('record_wins', 0)
    .order('record_wins', { ascending: false })
    .limit(10);

  if (sample && sample.length > 0) {
    console.log('\n📊 Top fighters by wins:');
    for (const fighter of sample) {
      console.log(`   ${fighter.full_name}: ${fighter.record_wins}-${fighter.record_losses}-${fighter.record_draws}`);
    }
  }
}

await calculateRecords();
