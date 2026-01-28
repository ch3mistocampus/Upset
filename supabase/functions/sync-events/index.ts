/**
 * sync-events Edge Function
 * Syncs UFC events from UFCStats.com
 * Respects cache settings to minimize requests
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { UFCStatsProvider } from "../_shared/ufcstats-provider.ts";
import { healthCheck as scraperHealthCheck } from "../_shared/ufcstats-scraper.ts";
import { createLogger } from "../_shared/logger.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const logger = createLogger("sync-events");

// Minimum expected events to prevent accidental data wipe
const MIN_EXPECTED_EVENTS = 5;

serve(async (req) => {
  const startTime = Date.now();
  const url = new URL(req.url);

  // Handle health check endpoint
  if (url.pathname.endsWith('/health') || url.searchParams.get('health') === 'true') {
    const health = await scraperHealthCheck();
    return new Response(JSON.stringify(health), {
      status: health.status === 'healthy' ? 200 : health.status === 'degraded' ? 206 : 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    logger.info("Starting events sync");

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if sync is needed (unless force=true)
    const force = url.searchParams.get('force') === 'true';
    if (!force) {
      const { data: shouldSync } = await supabase.rpc('should_sync', { p_sync_type: 'events' });

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
    const provider = new UFCStatsProvider();

    // Run health check first
    logger.info("Running provider health check");
    const health = await provider.healthCheck();
    if (health.status === 'unhealthy' || health.status === 'degraded') {
      logger.error("Provider health check failed", new Error(health.error || `Status: ${health.status}`));
      return new Response(
        JSON.stringify({
          success: false,
          error: `Provider ${health.status}`,
          health,
          provider: provider.name,
          message: `${provider.name} is ${health.status} — aborting sync to prevent partial data`,
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch all events in a single scrape call (2 HTTP requests instead of 4)
    logger.info("Fetching events from provider");
    const { upcoming: upcomingEvents, completed: completedEvents } = await provider.getAllEvents(50);

    // Merge events (upcoming takes priority for duplicates)
    const eventMap = new Map<string, any>();
    for (const event of upcomingEvents) {
      eventMap.set(event.externalId, { ...event, status: 'upcoming' });
    }
    for (const event of completedEvents) {
      if (!eventMap.has(event.externalId)) {
        eventMap.set(event.externalId, { ...event, status: 'completed' });
      }
    }

    const events = Array.from(eventMap.values());

    if (events.length === 0) {
      logger.warn("No events returned from provider - skipping to avoid data loss");
      return new Response(
        JSON.stringify({
          success: false,
          error: "No events found",
          message: "Provider returned 0 events - possible API issue",
          provider: provider.name,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Sanity check: ensure we have at least a few events
    if (events.length < MIN_EXPECTED_EVENTS) {
      logger.warn(`Only ${events.length} events found (expected at least ${MIN_EXPECTED_EVENTS})`);
    }

    logger.info("Fetched events, upserting to database", { count: events.length });

    // Process events and upsert
    let inserted = 0;
    let updated = 0;
    const errors: any[] = [];

    for (const event of events) {
      try {
        if (!event.date) {
          logger.warn("Event has no date, skipping", { name: event.name });
          continue;
        }

        // Check if event exists by ufcstats_event_id
        const { data: existing } = await supabase
          .from("events")
          .select("id, status")
          .eq('ufcstats_event_id', event.externalId)
          .single();

        if (existing) {
          // Don't revert completed events back to upcoming
          const newStatus = existing.status === 'completed' ? 'completed' : event.status;

          // Update existing event
          const { error } = await supabase
            .from("events")
            .update({
              name: event.name,
              event_date: event.date.toISOString(),
              location: event.location,
              status: newStatus,
              last_synced_at: new Date().toISOString(),
            })
            .eq('ufcstats_event_id', event.externalId);

          if (error) throw error;
          updated++;
        } else {
          // Insert new event
          const { error } = await supabase
            .from("events")
            .insert({
              name: event.name,
              event_date: event.date.toISOString(),
              location: event.location,
              status: event.status,
              last_synced_at: new Date().toISOString(),
              ufcstats_event_id: event.externalId,
            });

          if (error) throw error;
          inserted++;
        }
      } catch (error) {
        logger.error("Error processing event", error, { event: event.name });
        errors.push({
          event: event.name,
          error: (error as Error).message,
        });
      }
    }

    // Update sync timestamp
    await supabase.rpc('update_sync_timestamp', { p_sync_type: 'events' });

    const duration = Date.now() - startTime;

    const result = {
      success: true,
      provider: provider.name,
      inserted,
      updated,
      total: events.length,
      errors: errors.length > 0 ? errors : undefined,
      duration_ms: duration,
    };

    logger.success("Events sync complete", duration, {
      provider: provider.name,
      inserted,
      updated,
      total: events.length,
      errors: errors.length
    });

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("Fatal error during events sync", error);

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
