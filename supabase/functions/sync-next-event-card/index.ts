/**
 * sync-next-event-card Edge Function
 * Syncs bouts for the next upcoming UFC event
 * Detects canceled/changed fights and voids affected picks
 * Runs daily (more frequently near fight day)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { scrapeEventCard } from "../_shared/ufcstats-scraper.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  const startTime = Date.now();

  try {
    console.log("=== SYNC NEXT EVENT CARD: Starting ===");

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse query params for manual event override
    const url = new URL(req.url);
    const eventIdOverride = url.searchParams.get("event_id");

    let event: any;

    if (eventIdOverride) {
      // Manual override for specific event
      console.log(`Using event_id override: ${eventIdOverride}`);
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
      console.log("Finding next upcoming event...");
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .neq("status", "completed")
        .order("event_date", { ascending: true })
        .limit(1)
        .single();

      if (error || !data) {
        console.log("No upcoming events found");
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

    console.log(`Syncing event: ${event.name} (${event.event_date})`);

    // Get event URL from ufcstats_event_id
    const eventUrl = `http://ufcstats.com/event-details/${event.ufcstats_event_id}`;

    // Scrape fight card
    console.log(`Scraping event card from: ${eventUrl}`);
    const fights = await scrapeEventCard(eventUrl);

    if (fights.length === 0) {
      console.warn("No fights returned from scraper - skipping to avoid data loss");
      return new Response(
        JSON.stringify({
          success: false,
          error: "No fights found",
          message: "Scraper returned 0 fights - possible parsing error",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Scraped ${fights.length} fights`);

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
        console.error(`Error processing fight ${fight.ufcstats_fight_id}:`, error);
        errors.push({
          fight: `${fight.red_name} vs ${fight.blue_name}`,
          error: error.message,
        });
      }
    }

    // Handle canceled fights
    for (const canceledBout of canceledFights) {
      try {
        console.log(`Marking fight as canceled: ${canceledBout.ufcstats_fight_id}`);

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
        console.error(`Error canceling bout ${canceledBout.id}:`, error);
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

    console.log("=== SYNC NEXT EVENT CARD: Complete ===");
    console.log(JSON.stringify(result, null, 2));

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("=== SYNC NEXT EVENT CARD: Fatal Error ===");
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
