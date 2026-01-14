/**
 * sync-sportsdata Edge Function
 *
 * Syncs data from SportsData.io API to the sportsdata_* tables.
 * This runs separately from the UFCStats sync and populates a parallel data set.
 *
 * Endpoints:
 *   POST /sync-sportsdata              - Full sync (events, fighters, fight cards)
 *   POST /sync-sportsdata?type=events  - Sync events only
 *   POST /sync-sportsdata?type=fighters - Sync fighters only
 *   POST /sync-sportsdata?type=event&id=891 - Sync specific event with fights
 *   GET  /sync-sportsdata?health=true  - Health check
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { createLogger } from "../_shared/logger.ts";
import {
  createSportsDataProvider,
  mapEventToDb,
  mapFighterToDb,
  mapFightToDb,
  mapFightFighterToDb,
  SportsDataUnauthorizedException,
} from "../_shared/sportsdata-provider.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SPORTSDATA_API_KEY = Deno.env.get("SPORTSDATA_API_KEY") || "";

const logger = createLogger("sync-sportsdata");

interface SyncResult {
  type: string;
  fetched: number;
  created: number;
  updated: number;
  failed: number;
  errors: string[];
}

serve(async (req) => {
  const startTime = Date.now();
  const url = new URL(req.url);

  // Create provider
  const provider = createSportsDataProvider({ apiKey: SPORTSDATA_API_KEY });

  // Health check
  if (
    url.pathname.endsWith("/health") ||
    url.searchParams.get("health") === "true"
  ) {
    const health = await provider.healthCheck();
    return new Response(JSON.stringify(health), {
      status: health.status === "healthy" ? 200 : health.status === "degraded" ? 206 : 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Check API key
    if (!SPORTSDATA_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "SPORTSDATA_API_KEY environment variable is not set",
          help: "Set the API key using: supabase secrets set SPORTSDATA_API_KEY=your_key",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    logger.info("Starting SportsData.io sync");

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Determine sync type
    const syncType = url.searchParams.get("type") || "all";
    const eventId = url.searchParams.get("id");
    const season = parseInt(url.searchParams.get("season") || new Date().getFullYear().toString());

    const results: SyncResult[] = [];

    // Create sync log entry
    const { data: syncLog, error: logError } = await supabase
      .from("sportsdata_sync_log")
      .insert({
        sync_type: syncType,
        status: "running",
      })
      .select()
      .single();

    if (logError) {
      logger.warn("Failed to create sync log entry", { error: logError.message });
    }

    try {
      // Sync events
      if (syncType === "all" || syncType === "events") {
        logger.info("Syncing events", { season });
        const eventResult = await syncEvents(supabase, provider, season);
        results.push(eventResult);
      }

      // Sync fighters
      if (syncType === "all" || syncType === "fighters") {
        logger.info("Syncing fighters");
        const fighterResult = await syncFighters(supabase, provider);
        results.push(fighterResult);
      }

      // Sync specific event with fights
      if (syncType === "event" && eventId) {
        logger.info("Syncing specific event", { eventId });
        const eventFightsResult = await syncEventWithFights(
          supabase,
          provider,
          parseInt(eventId)
        );
        results.push(eventFightsResult);
      }

      // Update sync log
      if (syncLog) {
        const totals = results.reduce(
          (acc, r) => ({
            fetched: acc.fetched + r.fetched,
            created: acc.created + r.created,
            updated: acc.updated + r.updated,
            failed: acc.failed + r.failed,
          }),
          { fetched: 0, created: 0, updated: 0, failed: 0 }
        );

        await supabase
          .from("sportsdata_sync_log")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            items_fetched: totals.fetched,
            items_created: totals.created,
            items_updated: totals.updated,
            items_failed: totals.failed,
          })
          .eq("id", syncLog.id);
      }

      const duration = Date.now() - startTime;

      logger.success("SportsData.io sync complete", duration, {
        results: results.map((r) => ({
          type: r.type,
          created: r.created,
          updated: r.updated,
        })),
      });

      return new Response(
        JSON.stringify({
          success: true,
          results,
          duration_ms: duration,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      // Update sync log on error
      if (syncLog) {
        await supabase
          .from("sportsdata_sync_log")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : "Unknown error",
            error_details: { stack: error instanceof Error ? error.stack : null },
          })
          .eq("id", syncLog.id);
      }
      throw error;
    }
  } catch (error) {
    logger.error("Fatal error during SportsData.io sync", error);

    // Check for unauthorized error (need paid subscription)
    if (error instanceof SportsDataUnauthorizedException) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "API key requires paid subscription",
          message: error.message,
          help: "Contact SportsData.io sales for pricing: sales@sportsdata.io",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : null,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// ============================================================================
// Sync Functions
// ============================================================================

async function syncEvents(
  supabase: ReturnType<typeof createClient>,
  provider: ReturnType<typeof createSportsDataProvider>,
  season: number
): Promise<SyncResult> {
  const result: SyncResult = {
    type: "events",
    fetched: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  try {
    const events = await provider.getSchedule(season);
    result.fetched = events.length;

    logger.info(`Fetched ${events.length} events from SportsData.io`);

    for (const event of events) {
      try {
        const dbEvent = mapEventToDb(event);

        // Check if exists
        const { data: existing } = await supabase
          .from("sportsdata_events")
          .select("id")
          .eq("sportsdata_event_id", event.EventId)
          .single();

        if (existing) {
          // Update
          const { error } = await supabase
            .from("sportsdata_events")
            .update(dbEvent)
            .eq("sportsdata_event_id", event.EventId);

          if (error) throw error;
          result.updated++;
        } else {
          // Insert
          const { error } = await supabase
            .from("sportsdata_events")
            .insert(dbEvent);

          if (error) throw error;
          result.created++;
        }
      } catch (error) {
        result.failed++;
        result.errors.push(`Event ${event.Name}: ${error}`);
        logger.warn(`Failed to sync event ${event.Name}`, { error });
      }
    }
  } catch (error) {
    logger.error("Failed to fetch events", error);
    throw error;
  }

  return result;
}

async function syncFighters(
  supabase: ReturnType<typeof createClient>,
  provider: ReturnType<typeof createSportsDataProvider>
): Promise<SyncResult> {
  const result: SyncResult = {
    type: "fighters",
    fetched: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  try {
    const fighters = await provider.getFightersBasic();
    result.fetched = fighters.length;

    logger.info(`Fetched ${fighters.length} fighters from SportsData.io`);

    // Process in batches to avoid timeouts
    const batchSize = 100;
    for (let i = 0; i < fighters.length; i += batchSize) {
      const batch = fighters.slice(i, i + batchSize);

      for (const fighter of batch) {
        try {
          const dbFighter = mapFighterToDb(fighter);

          // Check if exists
          const { data: existing } = await supabase
            .from("sportsdata_fighters")
            .select("id")
            .eq("sportsdata_fighter_id", fighter.FighterId)
            .single();

          if (existing) {
            // Update
            const { error } = await supabase
              .from("sportsdata_fighters")
              .update(dbFighter)
              .eq("sportsdata_fighter_id", fighter.FighterId);

            if (error) throw error;
            result.updated++;
          } else {
            // Insert
            const { error } = await supabase
              .from("sportsdata_fighters")
              .insert(dbFighter);

            if (error) throw error;
            result.created++;
          }
        } catch (error) {
          result.failed++;
          const name = `${fighter.FirstName} ${fighter.LastName}`;
          result.errors.push(`Fighter ${name}: ${error}`);
        }
      }

      logger.info(`Processed fighters batch ${i + batch.length}/${fighters.length}`);
    }
  } catch (error) {
    logger.error("Failed to fetch fighters", error);
    throw error;
  }

  return result;
}

async function syncEventWithFights(
  supabase: ReturnType<typeof createClient>,
  provider: ReturnType<typeof createSportsDataProvider>,
  eventId: number
): Promise<SyncResult> {
  const result: SyncResult = {
    type: "event_fights",
    fetched: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  try {
    const event = await provider.getEvent(eventId);
    result.fetched = 1 + (event.Fights?.length || 0);

    logger.info(`Fetched event ${event.Name} with ${event.Fights?.length || 0} fights`);

    // Sync event
    const dbEvent = mapEventToDb(event);
    const { data: existingEvent } = await supabase
      .from("sportsdata_events")
      .select("id")
      .eq("sportsdata_event_id", event.EventId)
      .single();

    if (existingEvent) {
      await supabase
        .from("sportsdata_events")
        .update(dbEvent)
        .eq("sportsdata_event_id", event.EventId);
      result.updated++;
    } else {
      await supabase.from("sportsdata_events").insert(dbEvent);
      result.created++;
    }

    // Sync fights
    for (const fight of event.Fights || []) {
      try {
        const dbFight = mapFightToDb(fight, event.EventId);

        const { data: existingFight } = await supabase
          .from("sportsdata_fights")
          .select("id")
          .eq("sportsdata_fight_id", fight.FightId)
          .single();

        if (existingFight) {
          await supabase
            .from("sportsdata_fights")
            .update(dbFight)
            .eq("sportsdata_fight_id", fight.FightId);
          result.updated++;
        } else {
          await supabase.from("sportsdata_fights").insert(dbFight);
          result.created++;
        }

        // Sync fight fighters
        if (fight.Fighters && fight.Fighters.length >= 2) {
          const redFighter = fight.Fighters[0];
          const blueFighter = fight.Fighters[1];

          // Red corner
          const dbRedFighter = mapFightFighterToDb(fight.FightId, redFighter, "red");
          await supabase
            .from("sportsdata_fight_fighters")
            .upsert(dbRedFighter, {
              onConflict: "sportsdata_fight_id,sportsdata_fighter_id",
            });

          // Blue corner
          const dbBlueFighter = mapFightFighterToDb(fight.FightId, blueFighter, "blue");
          await supabase
            .from("sportsdata_fight_fighters")
            .upsert(dbBlueFighter, {
              onConflict: "sportsdata_fight_id,sportsdata_fighter_id",
            });
        }
      } catch (error) {
        result.failed++;
        result.errors.push(`Fight ${fight.FightId}: ${error}`);
        logger.warn(`Failed to sync fight ${fight.FightId}`, { error });
      }
    }
  } catch (error) {
    logger.error("Failed to fetch event with fights", error);
    throw error;
  }

  return result;
}
