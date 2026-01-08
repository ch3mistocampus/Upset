/**
 * sync-espn-ids Edge Function
 * Maps ESPN fighter IDs to existing UFCStats fighters
 * Run manually or on schedule to keep ID mappings updated
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { createMMAApiProvider } from "../_shared/mma-api-provider.ts";
import { createLogger } from "../_shared/logger.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const logger = createLogger("sync-espn-ids");

// Rate limiting between API calls
const DELAY_BETWEEN_SEARCHES = 500;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Normalize fighter name for comparison
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "") // Remove special characters
    .replace(/\s+/g, " ")     // Normalize whitespace
    .trim();
}

/**
 * Calculate name similarity score (0-1)
 */
function nameSimilarity(name1: string, name2: string): number {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);

  if (n1 === n2) return 1;

  // Check if one contains the other
  if (n1.includes(n2) || n2.includes(n1)) return 0.9;

  // Check last name match
  const parts1 = n1.split(" ");
  const parts2 = n2.split(" ");
  const lastName1 = parts1[parts1.length - 1];
  const lastName2 = parts2[parts2.length - 1];

  if (lastName1 === lastName2) {
    // Same last name - check first name similarity
    const firstName1 = parts1[0];
    const firstName2 = parts2[0];
    if (firstName1 === firstName2) return 0.95;
    if (firstName1.startsWith(firstName2) || firstName2.startsWith(firstName1)) return 0.85;
    return 0.6;
  }

  return 0;
}

serve(async (req) => {
  const startTime = Date.now();

  try {
    logger.info("Starting ESPN ID sync");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse query params
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const forceUpdate = url.searchParams.get("force") === "true";

    // Get fighters without ESPN IDs (or all if force update)
    let query = supabase
      .from("ufc_fighters")
      .select("fighter_id, full_name, record_wins, record_losses, weight_lbs")
      .order("record_wins", { ascending: false }); // Most active fighters first

    if (!forceUpdate) {
      query = query.is("espn_fighter_id", null);
    }

    const { data: fighters, error: fetchError } = await query.limit(limit);

    if (fetchError) throw fetchError;

    if (!fighters || fighters.length === 0) {
      logger.info("No fighters need ESPN ID mapping");
      return new Response(
        JSON.stringify({ success: true, message: "No fighters to process", mapped: 0 }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    logger.info(`Processing ${fighters.length} fighters`);

    // Create MMA API provider
    const mmaApi = createMMAApiProvider();

    // Check API health first
    const health = await mmaApi.healthCheck();
    if (health.status === "unhealthy") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "MMA API is unhealthy",
          health,
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    let mapped = 0;
    let skipped = 0;
    let notFound = 0;
    const errors: any[] = [];

    for (const fighter of fighters) {
      try {
        // Search for fighter by name
        const searchResults = await mmaApi.searchFighters(fighter.full_name, 5);

        if (searchResults.length === 0) {
          // Try searching with just last name
          const lastName = fighter.full_name.split(" ").pop() || fighter.full_name;
          const lastNameResults = await mmaApi.searchFighters(lastName, 10);

          if (lastNameResults.length === 0) {
            notFound++;
            continue;
          }

          // Find best match by full name
          let bestMatch = null;
          let bestScore = 0;

          for (const result of lastNameResults) {
            const score = nameSimilarity(fighter.full_name, result.name);
            if (score > bestScore && score >= 0.6) {
              bestScore = score;
              bestMatch = result;
            }
          }

          if (bestMatch) {
            await updateEspnId(supabase, fighter.fighter_id, bestMatch.externalId);
            mapped++;
            logger.info(`Mapped ${fighter.full_name} -> ${bestMatch.name} (${bestMatch.externalId}), score: ${bestScore}`);
          } else {
            notFound++;
          }
        } else {
          // Find best match
          let bestMatch = null;
          let bestScore = 0;

          for (const result of searchResults) {
            const score = nameSimilarity(fighter.full_name, result.name);
            if (score > bestScore) {
              bestScore = score;
              bestMatch = result;
            }
          }

          if (bestMatch && bestScore >= 0.6) {
            await updateEspnId(supabase, fighter.fighter_id, bestMatch.externalId);
            mapped++;
            logger.info(`Mapped ${fighter.full_name} -> ${bestMatch.name} (${bestMatch.externalId}), score: ${bestScore}`);
          } else if (bestMatch) {
            skipped++;
            logger.info(`Skipped ${fighter.full_name} - best match "${bestMatch.name}" score too low: ${bestScore}`);
          } else {
            notFound++;
          }
        }

        // Rate limiting
        await sleep(DELAY_BETWEEN_SEARCHES);
      } catch (error) {
        errors.push({
          fighter: fighter.full_name,
          error: (error as Error).message,
        });
      }
    }

    const duration = Date.now() - startTime;

    const result = {
      success: true,
      processed: fighters.length,
      mapped,
      skipped,
      notFound,
      errors: errors.length > 0 ? errors : undefined,
      duration_ms: duration,
    };

    logger.success("ESPN ID sync complete", duration, result);

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("Fatal error during ESPN ID sync", error);

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

async function updateEspnId(supabase: any, fighterId: string, espnId: string): Promise<void> {
  const { error } = await supabase
    .from("ufc_fighters")
    .update({
      espn_fighter_id: espnId,
      updated_at: new Date().toISOString(),
    })
    .eq("fighter_id", fighterId);

  if (error) throw error;
}
