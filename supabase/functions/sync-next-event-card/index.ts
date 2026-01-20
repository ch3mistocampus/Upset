/**
 * sync-next-event-card Edge Function
 * Syncs bouts for the next upcoming UFC event
 * Detects canceled/changed fights and voids affected picks
 * Uses UFCStats data source
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { createUFCStatsProvider } from "../_shared/ufcstats-provider.ts";
import { healthCheck as scraperHealthCheck, scrapeFighterProfile, sleep } from "../_shared/ufcstats-scraper.ts";
import { createLogger } from "../_shared/logger.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const logger = createLogger("sync-next-event-card");

// Minimum expected fights per event to detect scraping issues
const MIN_EXPECTED_FIGHTS = 3;

// Live sync snapshot ID for automated fighter syncs
const LIVE_SYNC_SNAPSHOT_ID = "live-sync-auto";

/**
 * Ensure the live sync snapshot exists
 */
async function ensureLiveSyncSnapshot(supabase: any): Promise<void> {
  const { data: existing } = await supabase
    .from("ufc_source_snapshots")
    .select("snapshot_id")
    .eq("snapshot_id", LIVE_SYNC_SNAPSHOT_ID)
    .single();

  if (!existing) {
    logger.info("Creating live sync snapshot");
    await supabase.from("ufc_source_snapshots").insert({
      snapshot_id: LIVE_SYNC_SNAPSHOT_ID,
      source: "ufcstats-live",
      notes: "Automated live sync from sync-next-event-card function",
      row_counts: {},
    });
  }
}

/**
 * Sync fighters for all bouts in an event
 * Scrapes and upserts fighter profiles for all fighters on the card
 */
async function syncFighters(
  supabase: any,
  fights: any[],
  eventName: string
): Promise<{ synced: number; skipped: number; errors: string[] }> {
  const result = { synced: 0, skipped: 0, errors: [] as string[] };

  // Ensure snapshot exists
  await ensureLiveSyncSnapshot(supabase);

  // Collect unique fighter IDs from all fights
  const fighterIds = new Set<string>();
  for (const fight of fights) {
    if (fight.redFighter?.externalId) fighterIds.add(fight.redFighter.externalId);
    if (fight.blueFighter?.externalId) fighterIds.add(fight.blueFighter.externalId);
  }

  logger.info(`Syncing ${fighterIds.size} unique fighters for ${eventName}`);

  // Check which fighters already exist in ufc_fighters
  const { data: existingFighters } = await supabase
    .from("ufc_fighters")
    .select("fighter_id")
    .in("fighter_id", Array.from(fighterIds));

  const existingIds = new Set(existingFighters?.map((f: any) => f.fighter_id) || []);

  // Sync each fighter (with rate limiting)
  for (const fighterId of fighterIds) {
    try {
      // Skip if already exists (we can add a force refresh option later)
      if (existingIds.has(fighterId)) {
        logger.info(`Fighter ${fighterId} already exists, skipping`);
        result.skipped++;
        continue;
      }

      // Rate limit to avoid overwhelming UFCStats
      await sleep(500);

      // Scrape fighter profile
      const profile = await scrapeFighterProfile(fighterId);

      if (!profile) {
        logger.warn(`Could not scrape profile for fighter ${fighterId}`);
        result.errors.push(`Failed to scrape fighter ${fighterId}`);
        continue;
      }

      // Upsert fighter to database
      const { error } = await supabase
        .from("ufc_fighters")
        .upsert({
          fighter_id: profile.fighter_id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          full_name: profile.full_name,
          nickname: profile.nickname,
          dob: profile.dob,
          height_inches: profile.height_inches,
          weight_lbs: profile.weight_lbs,
          reach_inches: profile.reach_inches,
          stance: profile.stance,
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
          ufcstats_url: profile.ufcstats_url,
          source_snapshot_id: LIVE_SYNC_SNAPSHOT_ID,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "fighter_id",
        });

      if (error) {
        logger.error("Error upserting fighter", error, { fighterId: profile.fighter_id });
        result.errors.push(`DB error for ${profile.full_name}: ${error.message}`);
      } else {
        logger.info(`Synced fighter: ${profile.full_name}`);
        result.synced++;
      }
    } catch (error) {
      logger.error("Error syncing fighter", error, { fighterId });
      result.errors.push(`Error for ${fighterId}: ${(error as Error).message}`);
    }
  }

  logger.info(`Fighter sync complete: ${result.synced} synced, ${result.skipped} skipped, ${result.errors.length} errors`);
  return result;
}

serve(async (req) => {
  const startTime = Date.now();

  // Parse query params
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
    logger.info("Starting event card sync");

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const eventIdOverride = url.searchParams.get("event_id");
    const force = url.searchParams.get('force') === 'true';

    logger.info("Using data source: UFCStats");

    // Create UFCStats provider
    const provider = createUFCStatsProvider();

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

    // Check if cache is still valid (unless force=true or event_id override)
    if (!force && !eventIdOverride && event.last_synced_at) {
      const lastSync = new Date(event.last_synced_at);
      const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);

      // Calculate dynamic cache duration based on event proximity
      const eventDate = new Date(event.event_date);
      const daysUntilEvent = (eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);

      // More frequent syncs closer to event day
      let cacheHours = 24; // Default: once per day
      if (daysUntilEvent <= 1) {
        cacheHours = 1; // Day of event: every hour
      } else if (daysUntilEvent <= 3) {
        cacheHours = 6; // Within 3 days: every 6 hours
      } else if (daysUntilEvent <= 7) {
        cacheHours = 12; // Within a week: every 12 hours
      }

      if (hoursSinceSync < cacheHours) {
        logger.info("Cache still valid, skipping sync", {
          lastSync: event.last_synced_at,
          cacheHours,
          daysUntilEvent: Math.round(daysUntilEvent),
        });
        return new Response(
          JSON.stringify({
            success: true,
            skipped: true,
            message: `Cache valid for ${Math.round(cacheHours - hoursSinceSync)} more hours`,
            event: { id: event.id, name: event.name },
            next_sync_in_hours: Math.round(cacheHours - hoursSinceSync),
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      }
    }

    logger.info("Syncing event", { name: event.name, date: event.event_date });

    // Run provider health check first
    logger.info("Running provider health check");
    const health = await provider.healthCheck();
    if (health.status === 'unhealthy') {
      logger.error("Provider health check failed", new Error(health.error || 'Unknown error'));
      return new Response(
        JSON.stringify({
          success: false,
          error: "Provider unhealthy",
          health,
          provider: provider.name,
          message: `${provider.name} is not responding correctly`,
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get the UFCStats event ID
    const externalId = event.ufcstats_event_id;

    if (!externalId) {
      logger.warn("Event missing UFCStats ID", {
        eventName: event.name,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: "Event missing UFCStats ID",
          message: `Event "${event.name}" has no ufcstats_event_id`,
          event: { id: event.id, name: event.name },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch fight card from provider
    logger.info("Fetching event card from provider");
    const fights = await provider.getEventFightCard(externalId);

    if (fights.length === 0) {
      logger.warn("No fights returned from provider - skipping to avoid data loss");
      return new Response(
        JSON.stringify({
          success: false,
          error: "No fights found",
          message: "Provider returned 0 fights - possible parsing error or event canceled",
          event: { id: event.id, name: event.name },
          provider: provider.name,
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

    logger.info("Fetched fights", { count: fights.length, provider: provider.name });

    // Get existing bouts for this event
    const { data: existingBouts } = await supabase
      .from("bouts")
      .select("ufcstats_fight_id, id")
      .eq("event_id", event.id);

    const existingFightIds = new Set(
      existingBouts?.map((b) => b.ufcstats_fight_id).filter(Boolean) || []
    );

    // Track fetched fight IDs to detect cancellations
    const fetchedFightIds = new Set(fights.map((f) => f.externalId));

    // Detect canceled fights (existed before, now missing)
    const canceledFights = existingBouts?.filter(
      (b) => b.ufcstats_fight_id && !fetchedFightIds.has(b.ufcstats_fight_id)
    ) || [];

    // Process upserts
    let inserted = 0;
    let updated = 0;
    let canceled = 0;
    const errors: any[] = [];

    for (const fight of fights) {
      try {
        if (existingFightIds.has(fight.externalId)) {
          // Update existing bout
          const { error } = await supabase
            .from("bouts")
            .update({
              order_index: fight.orderIndex,
              weight_class: fight.weightClass,
              red_name: fight.redFighter.name,
              blue_name: fight.blueFighter.name,
              red_fighter_ufcstats_id: fight.redFighter.externalId,
              blue_fighter_ufcstats_id: fight.blueFighter.externalId,
              last_synced_at: new Date().toISOString(),
            })
            .eq("ufcstats_fight_id", fight.externalId);

          if (error) throw error;
          updated++;
        } else {
          // Insert new bout
          const { error } = await supabase
            .from("bouts")
            .insert({
              event_id: event.id,
              ufcstats_fight_id: fight.externalId,
              order_index: fight.orderIndex,
              weight_class: fight.weightClass,
              red_name: fight.redFighter.name,
              blue_name: fight.blueFighter.name,
              red_fighter_ufcstats_id: fight.redFighter.externalId,
              blue_fighter_ufcstats_id: fight.blueFighter.externalId,
              status: "scheduled",
              last_synced_at: new Date().toISOString(),
            });

          if (error) throw error;
          inserted++;
        }
      } catch (error) {
        logger.error("Error processing fight", error, { fightId: fight.externalId });
        errors.push({
          fight: `${fight.redFighter.name} vs ${fight.blueFighter.name}`,
          error: (error as Error).message,
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
          error: (error as Error).message,
        });
      }
    }

    // Sync fighter profiles for all fighters on the card
    logger.info("Starting fighter profile sync");
    const fighterSyncResult = await syncFighters(supabase, fights, event.name);

    // Update event sync timestamp
    await supabase
      .from("events")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", event.id);

    const duration = Date.now() - startTime;

    const result = {
      success: true,
      provider: provider.name,
      event: {
        id: event.id,
        name: event.name,
        date: event.event_date,
      },
      fights_inserted: inserted,
      fights_updated: updated,
      fights_canceled: canceled,
      total_fights: fights.length,
      fighters_synced: fighterSyncResult.synced,
      fighters_skipped: fighterSyncResult.skipped,
      fighter_errors: fighterSyncResult.errors.length > 0 ? fighterSyncResult.errors : undefined,
      errors: errors.length > 0 ? errors : undefined,
      duration_ms: duration,
    };

    logger.success("Event card sync complete", duration, {
      provider: provider.name,
      event: event.name,
      inserted,
      updated,
      canceled,
      total: fights.length,
      fighters_synced: fighterSyncResult.synced,
      fighters_skipped: fighterSyncResult.skipped,
    });

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("Fatal error during event card sync", error);

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
