/**
 * sync-recent-results-and-grade Edge Function
 * Syncs fight results and grades user picks
 * Runs every 6 hours to catch completed events
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { scrapeFightDetails } from "../_shared/ufcstats-scraper.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  const startTime = Date.now();

  try {
    console.log("=== SYNC RESULTS AND GRADE: Starting ===");

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse query params for manual event override
    const url = new URL(req.url);
    const eventIdOverride = url.searchParams.get("event_id");

    let eventsToProcess: any[];

    if (eventIdOverride) {
      // Manual override for specific event
      console.log(`Using event_id override: ${eventIdOverride}`);
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventIdOverride);

      if (error || !data) {
        throw new Error(`Event not found: ${eventIdOverride}`);
      }

      eventsToProcess = data;
    } else {
      // Find recent events that might have results
      // Events in the past that aren't marked as completed
      console.log("Finding recent events to check for results...");
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .lte("event_date", new Date().toISOString())
        .neq("status", "completed")
        .order("event_date", { ascending: false })
        .limit(2);

      if (error) {
        throw error;
      }

      eventsToProcess = data || [];
    }

    if (eventsToProcess.length === 0) {
      console.log("No events to process");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No events to process",
          events_processed: 0,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${eventsToProcess.length} events`);

    let totalResultsSynced = 0;
    let totalPicksGraded = 0;
    let eventsCompleted = 0;
    const errors: any[] = [];
    const affectedUsers = new Set<string>();

    for (const event of eventsToProcess) {
      console.log(`\nProcessing event: ${event.name}`);

      try {
        // Get bouts for this event
        const { data: bouts } = await supabase
          .from("bouts")
          .select("*")
          .eq("event_id", event.id)
          .order("order_index", { ascending: true });

        if (!bouts || bouts.length === 0) {
          console.log(`No bouts found for event ${event.name}`);
          continue;
        }

        console.log(`Found ${bouts.length} bouts`);

        let resultsSynced = 0;
        let boutsWithResults = 0;

        // Process each bout
        for (const bout of bouts) {
          try {
            // Check if result already exists
            const { data: existingResult } = await supabase
              .from("results")
              .select("*")
              .eq("bout_id", bout.id)
              .single();

            // Build fight URL
            const fightUrl = `http://ufcstats.com/fight-details/${bout.ufcstats_fight_id}`;

            // Scrape fight details
            console.log(`Scraping result for: ${bout.red_name} vs ${bout.blue_name}`);
            const result = await scrapeFightDetails(fightUrl);

            if (result.winner_corner) {
              // We have a result!
              console.log(`Result: ${result.winner_corner} wins via ${result.method}`);

              // Upsert result
              if (existingResult) {
                await supabase
                  .from("results")
                  .update({
                    winner_corner: result.winner_corner,
                    method: result.method,
                    round: result.round,
                    time: result.time,
                    details: result.details,
                    synced_at: new Date().toISOString(),
                  })
                  .eq("bout_id", bout.id);
              } else {
                await supabase
                  .from("results")
                  .insert({
                    bout_id: bout.id,
                    winner_corner: result.winner_corner,
                    method: result.method,
                    round: result.round,
                    time: result.time,
                    details: result.details,
                  });

                resultsSynced++;
              }

              boutsWithResults++;

              // Grade picks for this bout
              const { data: picks } = await supabase
                .from("picks")
                .select("*")
                .eq("bout_id", bout.id)
                .eq("status", "active");

              if (picks && picks.length > 0) {
                console.log(`Grading ${picks.length} picks...`);

                for (const pick of picks) {
                  let newStatus: string;
                  let score: number | null;

                  if (result.winner_corner === "draw" || result.winner_corner === "nc") {
                    // Void picks for draws and no contests
                    newStatus = "voided";
                    score = null;
                  } else {
                    // Grade as correct (1) or incorrect (0)
                    newStatus = "graded";
                    score = pick.picked_corner === result.winner_corner ? 1 : 0;
                  }

                  await supabase
                    .from("picks")
                    .update({
                      status: newStatus,
                      score,
                      locked_at: event.event_date, // Set lock time to event start
                    })
                    .eq("id", pick.id);

                  affectedUsers.add(pick.user_id);
                  totalPicksGraded++;
                }
              }

              // Update bout status
              await supabase
                .from("bouts")
                .update({ status: "completed" })
                .eq("id", bout.id);
            } else {
              console.log("No result yet for this fight");
            }
          } catch (error) {
            console.error(`Error processing bout ${bout.id}:`, error);
            errors.push({
              bout: `${bout.red_name} vs ${bout.blue_name}`,
              error: error.message,
            });
          }
        }

        // Check if event is fully completed
        // (all bouts have results)
        if (boutsWithResults === bouts.length) {
          console.log(`Event ${event.name} is complete (all fights have results)`);

          await supabase
            .from("events")
            .update({ status: "completed" })
            .eq("id", event.id);

          eventsCompleted++;
        } else {
          console.log(
            `Event ${event.name} not complete: ${boutsWithResults}/${bouts.length} fights have results`
          );

          // Update to in_progress if at least one result
          if (boutsWithResults > 0 && event.status === "upcoming") {
            await supabase
              .from("events")
              .update({ status: "in_progress" })
              .eq("id", event.id);
          }
        }

        totalResultsSynced += resultsSynced;
      } catch (error) {
        console.error(`Error processing event ${event.name}:`, error);
        errors.push({
          event: event.name,
          error: error.message,
        });
      }
    }

    // Recalculate stats for all affected users
    console.log(`\nRecalculating stats for ${affectedUsers.size} users...`);

    for (const userId of affectedUsers) {
      try {
        // Call the recalculate_user_stats function
        const { error } = await supabase.rpc("recalculate_user_stats", {
          target_user_id: userId,
        });

        if (error) {
          console.error(`Error recalculating stats for user ${userId}:`, error);
          errors.push({
            user_id: userId,
            error: error.message,
          });
        }
      } catch (error) {
        console.error(`Error recalculating stats for user ${userId}:`, error);
      }
    }

    const duration = Date.now() - startTime;

    const result = {
      success: true,
      events_processed: eventsToProcess.length,
      events_completed: eventsCompleted,
      results_synced: totalResultsSynced,
      picks_graded: totalPicksGraded,
      users_updated: affectedUsers.size,
      errors: errors.length > 0 ? errors : undefined,
      duration_ms: duration,
    };

    console.log("=== SYNC RESULTS AND GRADE: Complete ===");
    console.log(JSON.stringify(result, null, 2));

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("=== SYNC RESULTS AND GRADE: Fatal Error ===");
    console.error(error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
