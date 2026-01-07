/**
 * sync-next-event-card Edge Function
 * Syncs bouts for the next upcoming UFC event
 * Detects canceled/changed fights and voids affected picks
 * Runs daily (more frequently near fight day)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { scrapeEventCard, healthCheck } from "../_shared/ufcstats-scraper.ts";
import { createLogger } from "../_shared/logger.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const logger = createLogger("sync-next-event-card");

// Minimum expected fights per event to detect scraping issues
const MIN_EXPECTED_FIGHTS = 3;

serve(async (req) => {
  const startTime = Date.now();

  // Parse query params
  const url = new URL(req.url);

  // Handle health check endpoint
  if (url.pathname.endsWith('/health') || url.searchParams.get('health') === 'true') {
    const health = await healthCheck();
    return new Response(JSON.stringify(health), {
      status: health.status === 'healthy' ? 200 : health.status === 'degraded' ? 206 : 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    logger.info("Starting event card sync");

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const eventIdOverride = url.searchParams.get("event_id");

    let event: any;

    if (eventIdOverride) {
      // Manual override for specific event
      logger.info("Using event_id override", { eventId: eventIdOverride });
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventIdOverride)
        .single();

      if (error || !data) {
        throw new Error(`Event not found: ${eventIdOverride}`);
      }

      event = data;
    } else {
      // Find next upcoming event
      logger.info("Finding next upcoming event");
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .neq("status", "completed")
        .order("event_date", { ascending: true })
        .limit(1)
        .single();

      if (error || !data) {
        logger.info("No upcoming events found");
        return new Response(
          JSON.stringify({
            success: false,
            message: "No upcoming events found",
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      }

      event = data;
    }

    logger.info("Syncing event", { name: event.name, date: event.event_date });

    // Get event URL from ufcstats_event_id
    const eventUrl = `http://ufcstats.com/event-details/${event.ufcstats_event_id}`;

    // Scrape fight card
    logger.info("Scraping event card", { url: eventUrl });
    const fights = await scrapeEventCard(eventUrl);

    if (fights.length === 0) {
      logger.warn("No fights returned from scraper - skipping to avoid data loss");
      return new Response(
        JSON.stringify({
          success: false,
          error: "No fights found",
          message: "Scraper returned 0 fights - possible parsing error or event canceled",
          event: { id: event.id, name: event.name },
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Sanity check: warn if unusually few fights
    if (fights.length < MIN_EXPECTED_FIGHTS) {
      logger.warn(`Only ${fights.length} fights found (expected at least ${MIN_EXPECTED_FIGHTS})`, {
        event: event.name,
      });
    }

    logger.info("Scraped fights", { count: fights.length });

    // Get existing bouts for this event
    const { data: existingBouts } = await supabase
      .from("bouts")
      .select("ufcstats_fight_id, id")
      .eq("event_id", event.id);

    const existingFightIds = new Set(
      existingBouts?.map((b) => b.ufcstats_fight_id) || []
    );

    // Track scraped fight IDs to detect cancellations
    const scrapedFightIds = new Set(fights.map((f) => f.ufcstats_fight_id));

    // Detect canceled fights (existed before, now missing)
    const canceledFights = existingBouts?.filter(
      (b) => !scrapedFightIds.has(b.ufcstats_fight_id)
    ) || [];

    // Process upserts
    let inserted = 0;
    let updated = 0;
    let canceled = 0;
    const errors: any[] = [];

    for (const fight of fights) {
      try {
        if (existingFightIds.has(fight.ufcstats_fight_id)) {
          // Update existing bout
          const { error } = await supabase
            .from("bouts")
            .update({
              order_index: fight.order_index,
              weight_class: fight.weight_class,
              red_fighter_ufcstats_id: fight.red_fighter_id,
              blue_fighter_ufcstats_id: fight.blue_fighter_id,
              red_name: fight.red_name,
              blue_name: fight.blue_name,
              last_synced_at: new Date().toISOString(),
            })
            .eq("ufcstats_fight_id", fight.ufcstats_fight_id);

          if (error) throw error;
          updated++;
        } else {
          // Insert new bout
          const { error } = await supabase
            .from("bouts")
            .insert({
              ufcstats_fight_id: fight.ufcstats_fight_id,
              event_id: event.id,
              order_index: fight.order_index,
              weight_class: fight.weight_class,
              red_fighter_ufcstats_id: fight.red_fighter_id,
              blue_fighter_ufcstats_id: fight.blue_fighter_id,
              red_name: fight.red_name,
              blue_name: fight.blue_name,
              status: "scheduled",
              last_synced_at: new Date().toISOString(),
            });

          if (error) throw error;
          inserted++;
        }
      } catch (error) {
        logger.error("Error processing fight", error, { fightId: fight.ufcstats_fight_id });
        errors.push({
          fight: `${fight.red_name} vs ${fight.blue_name}`,
          error: error.message,
        });
      }
    }

    // Handle canceled fights
    for (const canceledBout of canceledFights) {
      try {
        logger.info("Marking fight as canceled", { fightId: canceledBout.ufcstats_fight_id });

        // Update bout status
        await supabase
          .from("bouts")
          .update({ status: "canceled" })
          .eq("id", canceledBout.id);

        // Void associated picks
        await supabase
          .from("picks")
          .update({ status: "voided", score: null })
          .eq("bout_id", canceledBout.id)
          .eq("status", "active");

        canceled++;
      } catch (error) {
        logger.error("Error canceling bout", error, { boutId: canceledBout.id });
        errors.push({
          bout_id: canceledBout.id,
          error: error.message,
        });
      }
    }

    // Update event sync timestamp
    await supabase
      .from("events")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", event.id);

    const duration = Date.now() - startTime;

    const result = {
      success: true,
      event: {
        id: event.id,
        name: event.name,
        date: event.event_date,
      },
      fights_inserted: inserted,
      fights_updated: updated,
      fights_canceled: canceled,
      total_fights: fights.length,
      errors: errors.length > 0 ? errors : undefined,
      duration_ms: duration,
    };

    logger.success("Event card sync complete", duration, {
      event: event.name,
      inserted,
      updated,
      canceled,
      total: fights.length,
    });

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("Fatal error during event card sync", error);

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
