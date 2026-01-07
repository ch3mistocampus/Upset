/**
 * sync-events Edge Function
 * Syncs UFC events from UFCStats into the events table
 * Runs daily via scheduled job
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { scrapeEventsList, parseUFCStatsDate, healthCheck } from "../_shared/ufcstats-scraper.ts";
import { createLogger, measureTime } from "../_shared/logger.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const logger = createLogger("sync-events");

// Minimum expected events to prevent accidental data wipe
const MIN_EXPECTED_EVENTS = 5;

serve(async (req) => {
  const startTime = Date.now();

  // Handle health check endpoint
  const url = new URL(req.url);
  if (url.pathname.endsWith('/health') || url.searchParams.get('health') === 'true') {
    const health = await healthCheck();
    return new Response(JSON.stringify(health), {
      status: health.status === 'healthy' ? 200 : health.status === 'degraded' ? 206 : 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    logger.info("Starting events sync");

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Run health check first
    logger.info("Running scraper health check");
    const health = await healthCheck();
    if (health.status === 'unhealthy') {
      logger.error("Scraper health check failed", new Error(health.error || 'Unknown error'));
      return new Response(
        JSON.stringify({
          success: false,
          error: "Scraper unhealthy",
          health,
          message: "UFCStats scraper is not responding correctly",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    // Scrape events from UFCStats
    logger.info("Fetching events from UFCStats");
    const events = await scrapeEventsList();

    if (events.length === 0) {
      logger.warn("No events returned from scraper - skipping to avoid data loss");
      return new Response(
        JSON.stringify({
          success: false,
          error: "No events found",
          message: "Scraper returned 0 events - possible parsing error",
          health,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Sanity check: ensure we have at least a few events
    if (events.length < MIN_EXPECTED_EVENTS) {
      logger.warn(`Only ${events.length} events found (expected at least ${MIN_EXPECTED_EVENTS})`);
    }

    logger.info("Scraped events, upserting to database", { count: events.length });

    // Process events and upsert
    let inserted = 0;
    let updated = 0;
    const errors: any[] = [];

    for (const event of events) {
      try {
        // Parse date
        const eventDate = parseUFCStatsDate(event.date_text);
        if (!eventDate) {
          logger.warn("Could not parse date for event", { name: event.name, date: event.date_text });
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
        logger.error("Error processing event", error, { event: event.name });
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

    logger.success("Events sync complete", duration, { inserted, updated, total: events.length, errors: errors.length });

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("Fatal error during events sync", error);

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
