/**
 * sync-events Edge Function
 * Syncs UFC events from UFCStats into the events table
 * Runs daily via scheduled job
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { scrapeEventsList, parseUFCStatsDate } from "../_shared/ufcstats-scraper.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  const startTime = Date.now();

  try {
    console.log("=== SYNC EVENTS: Starting ===");

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Scrape events from UFCStats
    console.log("Fetching events from UFCStats...");
    const events = await scrapeEventsList();

    if (events.length === 0) {
      console.warn("No events returned from scraper - skipping to avoid data loss");
      return new Response(
        JSON.stringify({
          success: false,
          error: "No events found",
          message: "Scraper returned 0 events - possible parsing error",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Scraped ${events.length} events, upserting to database...`);

    // Process events and upsert
    let inserted = 0;
    let updated = 0;
    const errors: any[] = [];

    for (const event of events) {
      try {
        // Parse date
        const eventDate = parseUFCStatsDate(event.date_text);
        if (!eventDate) {
          console.warn(`Could not parse date for event: ${event.name} (${event.date_text})`);
          continue;
        }

        // Determine status based on event date
        // If event is more than 1 day in the past, mark as completed (heuristic)
        // Otherwise, keep as upcoming (will be refined by results sync)
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        const status = eventDate < oneDayAgo ? "completed" : "upcoming";

        // Check if event exists
        const { data: existing } = await supabase
          .from("events")
          .select("id")
          .eq("ufcstats_event_id", event.ufcstats_event_id)
          .single();

        if (existing) {
          // Update existing event
          const { error } = await supabase
            .from("events")
            .update({
              name: event.name,
              event_date: eventDate.toISOString(),
              location: event.location,
              status,
              last_synced_at: new Date().toISOString(),
            })
            .eq("ufcstats_event_id", event.ufcstats_event_id);

          if (error) throw error;
          updated++;
        } else {
          // Insert new event
          const { error } = await supabase
            .from("events")
            .insert({
              ufcstats_event_id: event.ufcstats_event_id,
              name: event.name,
              event_date: eventDate.toISOString(),
              location: event.location,
              status,
              last_synced_at: new Date().toISOString(),
            });

          if (error) throw error;
          inserted++;
        }
      } catch (error) {
        console.error(`Error processing event ${event.name}:`, error);
        errors.push({
          event: event.name,
          error: error.message,
        });
      }
    }

    const duration = Date.now() - startTime;

    const result = {
      success: true,
      inserted,
      updated,
      total: events.length,
      errors: errors.length > 0 ? errors : undefined,
      duration_ms: duration,
    };

    console.log("=== SYNC EVENTS: Complete ===");
    console.log(JSON.stringify(result, null, 2));

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("=== SYNC EVENTS: Fatal Error ===");
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
