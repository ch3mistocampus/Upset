/**
 * map-fighter-ids Edge Function
 *
 * Automatically maps fighter IDs between SportsData.io and UFCStats by matching names.
 * Creates entries in the fighter_id_mappings table.
 *
 * Endpoints:
 *   POST /map-fighter-ids              - Auto-map all unmatched fighters
 *   POST /map-fighter-ids?verify=true  - Only create high-confidence matches
 *   GET  /map-fighter-ids?stats=true   - Get mapping statistics
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { createLogger } from "../_shared/logger.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const logger = createLogger("map-fighter-ids");

interface MappingResult {
  sportsdata_fighter_id: number;
  sportsdata_name: string;
  ufcstats_fighter_id: string | null;
  ufcstats_name: string | null;
  match_method: string;
  match_confidence: number;
}

serve(async (req) => {
  const startTime = Date.now();
  const url = new URL(req.url);

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get statistics
    if (url.searchParams.get("stats") === "true") {
      const stats = await getMappingStats(supabase);
      return new Response(JSON.stringify(stats), {
        headers: { "Content-Type": "application/json" },
      });
    }

    logger.info("Starting fighter ID mapping");

    const verifyOnly = url.searchParams.get("verify") === "true";
    const minConfidence = verifyOnly ? 0.95 : 0.8;

    // Get all SportsData fighters
    const { data: sdFighters, error: sdError } = await supabase
      .from("sportsdata_fighters")
      .select("sportsdata_fighter_id, first_name, last_name, full_name, wins, losses, draws, weight_class");

    if (sdError) throw sdError;

    // Get all UFCStats fighters
    const { data: ufcFighters, error: ufcError } = await supabase
      .from("ufc_fighters")
      .select("fighter_id, first_name, last_name, full_name, record_wins, record_losses, record_draws, weight_class");

    if (ufcError) throw ufcError;

    // Get existing mappings
    const { data: existingMappings, error: mapError } = await supabase
      .from("fighter_id_mappings")
      .select("sportsdata_fighter_id");

    if (mapError) throw mapError;

    const existingIds = new Set(existingMappings?.map((m) => m.sportsdata_fighter_id) || []);

    logger.info(`Found ${sdFighters?.length || 0} SportsData fighters, ${ufcFighters?.length || 0} UFCStats fighters`);
    logger.info(`${existingIds.size} existing mappings`);

    // Create name index for UFCStats fighters
    const ufcByName = new Map<string, typeof ufcFighters[0]>();
    const ufcByNormalizedName = new Map<string, typeof ufcFighters[0][]>();

    for (const fighter of ufcFighters || []) {
      const fullName = fighter.full_name?.toLowerCase().trim();
      if (fullName) {
        ufcByName.set(fullName, fighter);

        // Normalized (remove special chars)
        const normalized = normalizeName(fullName);
        if (!ufcByNormalizedName.has(normalized)) {
          ufcByNormalizedName.set(normalized, []);
        }
        ufcByNormalizedName.get(normalized)!.push(fighter);
      }
    }

    const results: MappingResult[] = [];
    let created = 0;
    let skipped = 0;
    let lowConfidence = 0;

    // Process each SportsData fighter
    for (const sdFighter of sdFighters || []) {
      // Skip if already mapped
      if (existingIds.has(sdFighter.sportsdata_fighter_id)) {
        skipped++;
        continue;
      }

      const sdName = sdFighter.full_name?.toLowerCase().trim() || "";
      const sdNormalized = normalizeName(sdName);

      let match: typeof ufcFighters[0] | null = null;
      let matchMethod = "none";
      let confidence = 0;

      // Try exact name match
      if (ufcByName.has(sdName)) {
        match = ufcByName.get(sdName)!;
        matchMethod = "exact_name";
        confidence = 1.0;
      }
      // Try normalized name match
      else if (ufcByNormalizedName.has(sdNormalized)) {
        const candidates = ufcByNormalizedName.get(sdNormalized)!;
        if (candidates.length === 1) {
          match = candidates[0];
          matchMethod = "normalized_name";
          confidence = 0.95;
        } else {
          // Multiple matches - try to disambiguate by record
          const recordMatch = candidates.find(
            (c) =>
              c.record_wins === sdFighter.wins &&
              c.record_losses === sdFighter.losses
          );
          if (recordMatch) {
            match = recordMatch;
            matchMethod = "normalized_name_with_record";
            confidence = 0.9;
          }
        }
      }
      // Try fuzzy match (Levenshtein distance)
      else {
        const fuzzyMatch = findFuzzyMatch(sdFighter, ufcFighters || []);
        if (fuzzyMatch) {
          match = fuzzyMatch.fighter;
          matchMethod = "fuzzy_name";
          confidence = fuzzyMatch.confidence;
        }
      }

      // Create mapping result
      const result: MappingResult = {
        sportsdata_fighter_id: sdFighter.sportsdata_fighter_id,
        sportsdata_name: sdFighter.full_name || "",
        ufcstats_fighter_id: match?.fighter_id || null,
        ufcstats_name: match?.full_name || null,
        match_method: matchMethod,
        match_confidence: confidence,
      };

      results.push(result);

      // Insert mapping if confidence is high enough
      if (match && confidence >= minConfidence) {
        const { error: insertError } = await supabase
          .from("fighter_id_mappings")
          .insert({
            sportsdata_fighter_id: sdFighter.sportsdata_fighter_id,
            ufcstats_fighter_id: match.fighter_id,
            sportsdata_name: sdFighter.full_name,
            ufcstats_name: match.full_name,
            match_method: matchMethod,
            match_confidence: confidence,
            is_verified: confidence >= 0.95,
          });

        if (insertError) {
          logger.warn(`Failed to insert mapping for ${sdFighter.full_name}`, {
            error: insertError.message,
          });
        } else {
          created++;
        }

        // Update sportsdata_fighters with internal ID
        await supabase
          .from("sportsdata_fighters")
          .update({
            ufcstats_fighter_id: match.fighter_id,
            internal_fighter_id: match.fighter_id,
          })
          .eq("sportsdata_fighter_id", sdFighter.sportsdata_fighter_id);
      } else if (match && confidence < minConfidence) {
        lowConfidence++;
      }
    }

    const duration = Date.now() - startTime;

    // Summary statistics
    const summary = {
      total_sportsdata: sdFighters?.length || 0,
      total_ufcstats: ufcFighters?.length || 0,
      already_mapped: skipped,
      new_mappings_created: created,
      low_confidence_skipped: lowConfidence,
      unmatched: results.filter((r) => !r.ufcstats_fighter_id).length,
    };

    logger.success("Fighter ID mapping complete", duration, summary);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        duration_ms: duration,
        // Include sample of unmatched for review
        unmatched_sample: results
          .filter((r) => !r.ufcstats_fighter_id)
          .slice(0, 20)
          .map((r) => r.sportsdata_name),
        // Include low confidence matches for review
        low_confidence_sample: results
          .filter((r) => r.match_confidence > 0 && r.match_confidence < minConfidence)
          .slice(0, 20),
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    logger.error("Fatal error during fighter ID mapping", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // Remove special characters
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function findFuzzyMatch(
  sdFighter: { full_name: string | null; wins: number; losses: number; weight_class: string | null },
  ufcFighters: Array<{
    fighter_id: string;
    full_name: string | null;
    record_wins: number;
    record_losses: number;
    weight_class: string | null;
  }>
): { fighter: typeof ufcFighters[0]; confidence: number } | null {
  const sdName = normalizeName(sdFighter.full_name || "");
  if (!sdName) return null;

  let bestMatch: typeof ufcFighters[0] | null = null;
  let bestScore = Infinity;
  let bestConfidence = 0;

  for (const ufcFighter of ufcFighters) {
    const ufcName = normalizeName(ufcFighter.full_name || "");
    if (!ufcName) continue;

    const distance = levenshteinDistance(sdName, ufcName);
    const maxLen = Math.max(sdName.length, ufcName.length);
    const similarity = 1 - distance / maxLen;

    // Calculate confidence based on name similarity and record match
    let confidence = similarity;

    // Boost confidence if records match
    if (
      sdFighter.wins === ufcFighter.record_wins &&
      sdFighter.losses === ufcFighter.record_losses
    ) {
      confidence = Math.min(1.0, confidence + 0.1);
    }

    // Boost confidence if weight class matches
    if (
      sdFighter.weight_class &&
      ufcFighter.weight_class &&
      sdFighter.weight_class.toLowerCase().includes(ufcFighter.weight_class.toLowerCase().split(" ")[0])
    ) {
      confidence = Math.min(1.0, confidence + 0.05);
    }

    if (distance < bestScore && similarity > 0.7) {
      bestScore = distance;
      bestMatch = ufcFighter;
      bestConfidence = confidence;
    }
  }

  if (bestMatch && bestConfidence > 0.7) {
    return { fighter: bestMatch, confidence: bestConfidence };
  }

  return null;
}

async function getMappingStats(supabase: ReturnType<typeof createClient>) {
  // Get counts
  const [sdCount, ufcCount, mappedCount, verifiedCount] = await Promise.all([
    supabase.from("sportsdata_fighters").select("id", { count: "exact", head: true }),
    supabase.from("ufc_fighters").select("fighter_id", { count: "exact", head: true }),
    supabase.from("fighter_id_mappings").select("id", { count: "exact", head: true }),
    supabase.from("fighter_id_mappings").select("id", { count: "exact", head: true }).eq("is_verified", true),
  ]);

  // Get match method breakdown
  const { data: methodBreakdown } = await supabase
    .from("fighter_id_mappings")
    .select("match_method")
    .then((result) => {
      const counts: Record<string, number> = {};
      for (const row of result.data || []) {
        counts[row.match_method] = (counts[row.match_method] || 0) + 1;
      }
      return { data: counts };
    });

  return {
    sportsdata_fighters: sdCount.count || 0,
    ufcstats_fighters: ufcCount.count || 0,
    total_mappings: mappedCount.count || 0,
    verified_mappings: verifiedCount.count || 0,
    unmapped_sportsdata: (sdCount.count || 0) - (mappedCount.count || 0),
    match_methods: methodBreakdown,
    coverage_percent: ((mappedCount.count || 0) / (sdCount.count || 1) * 100).toFixed(1),
  };
}
