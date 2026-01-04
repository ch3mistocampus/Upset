/**
 * Grade Historical Picks Script
 *
 * Updates the score column for all historical picks based on
 * whether picked_corner matches winner_corner from results.
 *
 * Run with: deno run --allow-net --allow-env scripts/grade-historical-picks.ts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

async function main() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables:');
    console.error('   export SUPABASE_URL="https://your-project.supabase.co"');
    console.error('   export SUPABASE_SERVICE_ROLE_KEY="your-service-key"');
    Deno.exit(1);
  }

  console.log('Grading all historical picks...\n');
  console.log('='.repeat(60));

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Get all picks with their bout results
  const { data: picks, error: picksError } = await supabase
    .from('picks')
    .select(`
      id,
      user_id,
      picked_corner,
      score,
      status,
      bouts!inner (
        id,
        results (
          winner_corner
        )
      )
    `);

  if (picksError) {
    console.error('Failed to fetch picks:', picksError.message);
    Deno.exit(1);
  }

  console.log(`Found ${picks?.length || 0} picks to process\n`);

  let graded = 0;
  let correct = 0;
  let incorrect = 0;
  let skipped = 0;

  for (const pick of picks || []) {
    const winnerCorner = (pick.bouts as any)?.results?.[0]?.winner_corner;

    // Skip if no result yet
    if (!winnerCorner) {
      skipped++;
      continue;
    }

    // Skip draws and no contests
    if (winnerCorner === 'draw' || winnerCorner === 'nc') {
      // Mark as voided
      await supabase
        .from('picks')
        .update({ score: null, status: 'voided' })
        .eq('id', pick.id);
      skipped++;
      continue;
    }

    const isCorrect = pick.picked_corner === winnerCorner;
    const newScore = isCorrect ? 1 : 0;

    // Update the pick with score and status
    const { error: updateError } = await supabase
      .from('picks')
      .update({
        score: newScore,
        status: 'graded',
      })
      .eq('id', pick.id);

    if (updateError) {
      console.error(`Failed to update pick ${pick.id}: ${updateError.message}`);
    } else {
      graded++;
      if (isCorrect) correct++;
      else incorrect++;
    }
  }

  console.log(`Graded: ${graded} picks`);
  console.log(`  Correct: ${correct}`);
  console.log(`  Incorrect: ${incorrect}`);
  console.log(`Skipped: ${skipped} (no result or draw/nc)`);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('PICKS GRADED!');
  console.log('='.repeat(60));
  console.log('\nPer-event stats should now show correctly in the app.');
}

if (import.meta.main) {
  main().catch(error => {
    console.error('Fatal error:', error);
    Deno.exit(1);
  });
}
