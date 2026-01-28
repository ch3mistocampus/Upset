/**
 * sync-recent-results-and-grade Edge Function
 * Syncs fight results and grades user picks
 * Uses UFCStats data source with smart caching
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { createUFCStatsProvider } from "../_shared/ufcstats-provider.ts";
import { scrapeFighterProfile, sleep } from "../_shared/ufcstats-scraper.ts";
import { createLogger } from "../_shared/logger.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const logger = createLogger("sync-results-and-grade");

serve(async (req) => {
  const startTime = Date.now();

  try {
    logger.info("Starting results sync and grading");

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse query params
    const url = new URL(req.url);
    const eventIdOverride = url.searchParams.get("event_id");
    const force = url.searchParams.get("force") === "true";

    // Check if sync is needed (unless force=true or specific event)
    if (!force && !eventIdOverride) {
      const { data: shouldSync } = await supabase.rpc('should_sync', { p_sync_type: 'results' });

      if (shouldSync === false) {
        logger.info("Cache still valid, skipping sync");
        return new Response(
          JSON.stringify({
            success: true,
            skipped: true,
            message: "Cache still valid, sync not needed",
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      }
    }

    logger.info("Using data source: UFCStats");

    // Create UFCStats provider
    const provider = createUFCStatsProvider();

    let eventsToProcess: any[];

    if (eventIdOverride) {
      // Manual override for specific event
      logger.info("Using event_id override", { eventId: eventIdOverride });
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
      logger.info("Finding recent events to check for results");
      const { data: pendingEvents, error: pendingError } = await supabase
        .from("events")
        .select("*")
        .lte("event_date", new Date().toISOString())
        .neq("status", "completed")
        .order("event_date", { ascending: false })
        .limit(5);

      if (pendingError) {
        throw pendingError;
      }

      // Safety net: also find completed events that still have ungraded picks
      const { data: ungradedEvents, error: ungradedError } = await supabase
        .rpc("get_events_with_ungraded_picks");

      if (ungradedError) {
        logger.error("Error fetching ungraded events", ungradedError);
      }

      // Merge and deduplicate by event ID
      const eventMap = new Map<string, any>();
      for (const event of (pendingEvents || [])) {
        eventMap.set(event.id, event);
      }
      for (const event of (ungradedEvents || [])) {
        if (!eventMap.has(event.id)) {
          logger.info("Found completed event with ungraded picks", { name: event.name });
          eventMap.set(event.id, event);
        }
      }

      eventsToProcess = Array.from(eventMap.values());
    }

    if (eventsToProcess.length === 0) {
      logger.info("No events to process");

      // Update sync timestamp even if no events
      await supabase.rpc('update_sync_timestamp', { p_sync_type: 'results' });

      return new Response(
        JSON.stringify({
          success: true,
          message: "No events to process",
          events_processed: 0,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    logger.info("Processing events", { count: eventsToProcess.length });

    let totalResultsSynced = 0;
    let totalPicksGraded = 0;
    let eventsCompleted = 0;
    const errors: any[] = [];
    const affectedUsers = new Set<string>();

    for (const event of eventsToProcess) {
      logger.info("Processing event", { name: event.name, id: event.id });

      try {
        // Get bouts for this event
        const { data: bouts } = await supabase
          .from("bouts")
          .select("*")
          .eq("event_id", event.id)
          .order("order_index", { ascending: true });

        if (!bouts || bouts.length === 0) {
          logger.info("No bouts found for event", { name: event.name });
          continue;
        }

        // Separate active bouts from canceled/replaced ones for completion tracking
        const activeBouts = bouts.filter(
          (b: any) => b.status !== "canceled" && b.status !== "replaced"
        );
        const canceledCount = bouts.length - activeBouts.length;

        logger.debug("Found bouts for event", {
          count: bouts.length,
          active: activeBouts.length,
          canceled: canceledCount,
          event: event.name,
        });

        let resultsSynced = 0;
        let boutsWithResults = 0;

        // Process each bout (only active ones need result fetching)
        for (const bout of bouts) {
          try {
            // Skip canceled/replaced bouts
            if (bout.status === "canceled" || bout.status === "replaced") {
              logger.debug("Skipping canceled/replaced bout", {
                boutId: bout.id,
                redName: bout.red_name,
                blueName: bout.blue_name,
                status: bout.status,
              });
              continue;
            }

            // Get the UFCStats fight ID
            const fightExternalId = bout.ufcstats_fight_id;

            if (!fightExternalId) {
              logger.debug("Bout missing UFCStats ID, skipping", {
                boutId: bout.id,
                redName: bout.red_name,
                blueName: bout.blue_name,
              });
              continue;
            }

            // Check if result already exists
            const { data: existingResult } = await supabase
              .from("results")
              .select("*")
              .eq("bout_id", bout.id)
              .single();

            // Fetch result from provider
            logger.debug("Fetching result", { fight: `${bout.red_name} vs ${bout.blue_name}` });
            const result = await provider.getFightResult(fightExternalId);

            if (result && result.winnerCorner) {
              // We have a result!
              logger.info("Result found", {
                fight: `${bout.red_name} vs ${bout.blue_name}`,
                winner: result.winnerCorner,
                method: result.method,
              });

              // Map provider winner format to database format
              const winnerCorner = result.winnerCorner === 'red' ? 'red' :
                                   result.winnerCorner === 'blue' ? 'blue' :
                                   result.winnerCorner === 'draw' ? 'draw' : 'nc';

              // Upsert result
              if (existingResult) {
                await supabase
                  .from("results")
                  .update({
                    winner_corner: winnerCorner,
                    method: result.method,
                    round: result.round,
                    time: result.time,
                    synced_at: new Date().toISOString(),
                  })
                  .eq("bout_id", bout.id);
              } else {
                await supabase
                  .from("results")
                  .insert({
                    bout_id: bout.id,
                    winner_corner: winnerCorner,
                    method: result.method,
                    round: result.round,
                    time: result.time,
                  });

                resultsSynced++;
              }

              boutsWithResults++;

              // Grade picks for this bout atomically via RPC
              const { data: gradeResult, error: gradeError } = await supabase
                .rpc("grade_bout_picks", {
                  p_bout_id: bout.id,
                  p_winner_corner: winnerCorner,
                  p_event_date: event.event_date,
                });

              if (gradeError) {
                logger.error("Error grading picks", gradeError, { boutId: bout.id });
                errors.push({
                  bout: `${bout.red_name} vs ${bout.blue_name}`,
                  error: `Grading failed: ${gradeError.message}`,
                });
              } else if (gradeResult) {
                const graded = gradeResult.graded || 0;
                const users = gradeResult.affected_users || [];
                totalPicksGraded += graded;
                for (const userId of users) {
                  affectedUsers.add(userId);
                }
                if (graded > 0) {
                  logger.debug("Graded picks", { count: graded, bout: bout.id });
                }
              }

              // Update bout status
              await supabase
                .from("bouts")
                .update({ status: "completed" })
                .eq("id", bout.id);

              // Auto-detect champion change from title bout results
              if (bout.is_title_bout && winnerCorner !== 'draw' && winnerCorner !== 'nc') {
                const winnerFighterId = winnerCorner === 'red'
                  ? bout.red_fighter_ufcstats_id
                  : bout.blue_fighter_ufcstats_id;
                const loserFighterId = winnerCorner === 'red'
                  ? bout.blue_fighter_ufcstats_id
                  : bout.red_fighter_ufcstats_id;

                if (winnerFighterId && bout.weight_class) {
                  // Normalize weight class (strip "Title Bout", "Championship" etc.)
                  const normalizedWeightClass = bout.weight_class
                    .replace(/\s*(title|championship)\s*(bout|fight)?/gi, '')
                    .replace(/^ufc\s*/i, '')
                    .trim();

                  logger.info("Title bout result — updating champion", {
                    weightClass: normalizedWeightClass,
                    winner: winnerCorner === 'red' ? bout.red_name : bout.blue_name,
                    winnerId: winnerFighterId,
                  });

                  // Clear previous champion for this weight class
                  await supabase
                    .from("ufc_fighters")
                    .update({ ranking: null, is_interim_champion: false })
                    .eq("weight_class", normalizedWeightClass)
                    .eq("ranking", 0);

                  // Set new champion
                  await supabase
                    .from("ufc_fighters")
                    .update({ ranking: 0, is_interim_champion: false, weight_class: normalizedWeightClass })
                    .eq("fighter_id", winnerFighterId);

                  // If the loser was interim champion, clear that flag
                  if (loserFighterId) {
                    await supabase
                      .from("ufc_fighters")
                      .update({ is_interim_champion: false })
                      .eq("fighter_id", loserFighterId);
                  }
                }
              }
            } else {
              logger.debug("No result yet", { fight: `${bout.red_name} vs ${bout.blue_name}` });
            }
          } catch (error) {
            logger.error("Error processing bout", error, {
              bout: `${bout.red_name} vs ${bout.blue_name}`,
              boutId: bout.id,
            });
            errors.push({
              bout: `${bout.red_name} vs ${bout.blue_name}`,
              error: (error as Error).message,
            });
          }
        }

        // Check if event is fully completed
        // (all active/non-canceled bouts have results)
        if (activeBouts.length > 0 && boutsWithResults === activeBouts.length) {
          logger.info("Event complete - all active fights have results", {
            name: event.name,
            activeBouts: activeBouts.length,
            canceled: canceledCount,
          });

          await supabase
            .from("events")
            .update({ status: "completed" })
            .eq("id", event.id);

          eventsCompleted++;

          // Refresh fighter records/stats after event completion
          // Their win/loss records and career stats change after each fight
          const fighterIds = new Set<string>();
          for (const bout of bouts) {
            if (bout.red_fighter_ufcstats_id) fighterIds.add(bout.red_fighter_ufcstats_id);
            if (bout.blue_fighter_ufcstats_id) fighterIds.add(bout.blue_fighter_ufcstats_id);
          }

          logger.info("Refreshing fighter records after event completion", {
            event: event.name,
            fighters: fighterIds.size,
          });

          for (const fighterId of fighterIds) {
            try {
              await sleep(2000);
              const profile = await scrapeFighterProfile(fighterId);
              if (profile) {
                await supabase
                  .from("ufc_fighters")
                  .update({
                    record_wins: profile.record_wins,
                    record_losses: profile.record_losses,
                    record_draws: profile.record_draws,
                    record_nc: profile.record_nc,
                    slpm: profile.slpm,
                    sapm: profile.sapm,
                    str_acc: profile.str_acc,
                    str_def: profile.str_def,
                    td_avg: profile.td_avg,
                    td_acc: profile.td_acc,
                    td_def: profile.td_def,
                    sub_avg: profile.sub_avg,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("fighter_id", fighterId);
              }
            } catch (err) {
              logger.error("Error refreshing fighter", err, { fighterId });
            }
          }
        } else {
          logger.info("Event not complete", {
            name: event.name,
            boutsWithResults,
            activeBouts: activeBouts.length,
            canceled: canceledCount,
          });

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
        logger.error("Error processing event", error, { name: event.name });
        errors.push({
          event: event.name,
          error: (error as Error).message,
        });
      }
    }

    // Recalculate stats for all affected users
    logger.info("Recalculating stats for affected users", { count: affectedUsers.size });

    for (const userId of affectedUsers) {
      try {
        // Call the recalculate_user_stats function
        const { error } = await supabase.rpc("recalculate_user_stats", {
          target_user_id: userId,
        });

        if (error) {
          logger.error("Error recalculating stats", error, { userId });
          errors.push({
            user_id: userId,
            error: error.message,
          });
        }
      } catch (error) {
        logger.error("Error recalculating stats", error, { userId });
      }
    }

    // Update sync timestamp
    await supabase.rpc('update_sync_timestamp', { p_sync_type: 'results' });

    const duration = Date.now() - startTime;

    const hasErrors = errors.length > 0;
    const result = {
      success: !hasErrors,
      provider: provider.name,
      events_processed: eventsToProcess.length,
      events_completed: eventsCompleted,
      results_synced: totalResultsSynced,
      picks_graded: totalPicksGraded,
      users_updated: affectedUsers.size,
      errors: hasErrors ? errors : undefined,
      duration_ms: duration,
    };

    logger.success("Results sync and grading complete", duration, {
      provider: provider.name,
      eventsProcessed: eventsToProcess.length,
      eventsCompleted,
      resultsSynced: totalResultsSynced,
      picksGraded: totalPicksGraded,
      usersUpdated: affectedUsers.size,
    });

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("Fatal error during results sync and grading", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
        stack: (error as Error).stack,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
