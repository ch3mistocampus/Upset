/**
 * Debug scraper - Returns raw HTML to diagnose parsing issues
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { load } from "https://esm.sh/cheerio@1.0.0-rc.12";

serve(async (req) => {
  try {
    const url = "http://ufcstats.com/statistics/events/completed?page=all";

    console.log(`Fetching: ${url}`);

    const response = await fetch(url, {
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
        statusText: response.statusText,
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const html = await response.text();
    const $ = load(html);

    // Debug info
    const tableCount = $("table").length;
    const tableBStatsCount = $("table.b-statistics__table").length;
    const rowCount = $("table.b-statistics__table tbody tr").length;
    const linkCount = $("a.b-link").length;

    // Find what classes the table actually has
    const tableClasses = $("table").first().attr("class");
    const tableHtml = $("table").first().html()?.substring(0, 2000);

    // Try generic table selector
    const genericRowCount = $("table tbody tr").length;
    const sampleEvents: any[] = [];

    $("table tbody tr").slice(0, 3).each((_, row) => {
      const $row = $(row);
      const link = $row.find("a").first();
      const eventUrl = link.attr("href");
      const eventName = link.text().trim();
      const allCells = $row.find("td").map((_, td) => $(td).text().trim()).get();

      sampleEvents.push({
        eventUrl,
        eventName,
        cellCount: allCells.length,
        cells: allCells,
        rowHtml: $row.html()?.substring(0, 800),
      });
    });

    return new Response(JSON.stringify({
      success: true,
      url,
      htmlLength: html.length,
      htmlPreview: html.substring(0, 1000),
      selectors: {
        "table": tableCount,
        "table.b-statistics__table": tableBStatsCount,
        "table.b-statistics__table tbody tr": rowCount,
        "table tbody tr (generic)": genericRowCount,
        "a.b-link": linkCount,
      },
      tableInfo: {
        classes: tableClasses,
        htmlPreview: tableHtml,
      },
      sampleEvents,
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
