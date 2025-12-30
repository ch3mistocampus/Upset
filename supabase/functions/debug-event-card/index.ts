/**
 * Debug event card scraper
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { load } from "https://esm.sh/cheerio@1.0.0-rc.12";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get next upcoming event
    const { data: events } = await supabase
      .from("events")
      .select("*")
      .gte("event_date", new Date().toISOString())
      .order("event_date", { ascending: true })
      .limit(1);

    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ error: "No upcoming events" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const event = events[0];
    const eventUrl = `http://ufcstats.com/event-details/${event.ufcstats_event_id}`;

    console.log(`Fetching: ${eventUrl}`);

    const response = await fetch(eventUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!response.ok) {
      return new Response(JSON.stringify({
        error: "HTTP error",
        status: response.status,
      }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const html = await response.text();
    const $ = load(html);

    // Debug info
    const tableCount = $("table").length;
    const fightDetailsTableCount = $("table.b-fight-details__table").length;
    const rowCount = $("table.b-fight-details__table tbody tr").length;
    const flagCount = $("a.b-flag").length;

    // Find what classes tables have
    const tableSummary: any[] = [];
    $("table").each((i, table) => {
      tableSummary.push({
        index: i,
        classes: $(table).attr("class"),
        rowCount: $(table).find("tr").length,
      });
    });

    // Try generic selector
    const sampleFights: any[] = [];
    $("table.b-fight-details__table tbody tr").slice(0, 3).each((index, row) => {
      const $row = $(row);
      const fightLink = $row.find("a").attr("href");
      const allCells = $row.find("td").map((_, td) => $(td).text().trim()).get();

      sampleFights.push({
        fightLink,
        cellCount: allCells.length,
        cells: allCells.slice(0, 10), // First 10 cells
        rowHtml: $row.html()?.substring(0, 1000),
      });
    });

    return new Response(JSON.stringify({
      success: true,
      event: {
        name: event.name,
        date: event.event_date,
        url: eventUrl,
      },
      htmlLength: html.length,
      selectors: {
        "table": tableCount,
        "table.b-fight-details__table": fightDetailsTableCount,
        "table.b-fight-details__table tbody tr": rowCount,
        "a.b-flag": flagCount,
      },
      tableSummary,
      sampleFights,
    }, null, 2), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack,
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
