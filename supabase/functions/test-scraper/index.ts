/**
 * Test scraper to explore UFCStats data structure
 * This is a temporary function to understand the data before building the schema
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  scrapeEventsList,
  scrapeEventCard,
  scrapeFightDetails,
  parseUFCStatsDate,
} from "../_shared/ufcstats-scraper.ts";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "events";

    let result: any = {};

    switch (action) {
      case "events": {
        // Get list of recent events
        console.log("=== TESTING: Scraping Events List ===");
        const events = await scrapeEventsList();

        // Take first 10 to see the structure
        result = {
          action: "events",
          count: events.length,
          sample: events.slice(0, 10),
          first_event: events[0],
        };
        break;
      }

      case "event-card": {
        // Get fight card for a specific event
        const eventUrl = url.searchParams.get("event_url");
        if (!eventUrl) {
          // Use the most recent event from the list
          console.log("=== TESTING: Getting latest event card ===");
          const events = await scrapeEventsList();
          if (events.length === 0) {
            throw new Error("No events found");
          }

          const latestEvent = events[0];
          console.log(`Using latest event: ${latestEvent.name}`);

          const fights = await scrapeEventCard(latestEvent.event_url);

          result = {
            action: "event-card",
            event: latestEvent,
            fight_count: fights.length,
            fights: fights,
          };
        } else {
          const fights = await scrapeEventCard(eventUrl);
          result = {
            action: "event-card",
            event_url: eventUrl,
            fight_count: fights.length,
            fights: fights,
          };
        }
        break;
      }

      case "fight-details": {
        // Get detailed results for a specific fight
        const fightUrl = url.searchParams.get("fight_url");
        if (!fightUrl) {
          // Get first fight from latest event
          console.log("=== TESTING: Getting latest fight details ===");
          const events = await scrapeEventsList();
          if (events.length === 0) {
            throw new Error("No events found");
          }

          const latestEvent = events[0];
          const fights = await scrapeEventCard(latestEvent.event_url);

          if (fights.length === 0) {
            throw new Error("No fights found");
          }

          const firstFight = fights[0];
          const details = await scrapeFightDetails(firstFight.fight_url);

          result = {
            action: "fight-details",
            event: latestEvent,
            fight: firstFight,
            result: details,
          };
        } else {
          const details = await scrapeFightDetails(fightUrl);
          result = {
            action: "fight-details",
            fight_url: fightUrl,
            result: details,
          };
        }
        break;
      }

      case "full-sample": {
        // Get complete sample: events -> event card -> fight details
        console.log("=== TESTING: Full data exploration ===");

        console.log("Step 1: Scraping events...");
        const events = await scrapeEventsList();

        // Get the most recent completed event (one with results)
        let eventWithResults = null;
        let fights = [];

        for (const event of events.slice(0, 5)) {
          console.log(`Checking event: ${event.name}`);
          const eventFights = await scrapeEventCard(event.event_url);

          // Check if first fight has results (method is populated)
          if (eventFights.length > 0 && eventFights[0].method) {
            eventWithResults = event;
            fights = eventFights;
            console.log(`Found event with results: ${event.name}`);
            break;
          }
        }

        if (!eventWithResults) {
          throw new Error("Could not find a recent event with results");
        }

        console.log("Step 2: Getting fight details...");
        // Get details for first 3 fights
        const fightDetails = [];
        for (const fight of fights.slice(0, 3)) {
          const details = await scrapeFightDetails(fight.fight_url);
          fightDetails.push({
            fight,
            details,
          });
        }

        result = {
          action: "full-sample",
          event: eventWithResults,
          total_fights: fights.length,
          fights_sampled: fights.slice(0, 5),
          detailed_fights: fightDetails,
          date_parsed: parseUFCStatsDate(eventWithResults.date_text),
        };
        break;
      }

      default: {
        result = {
          error: "Invalid action",
          available_actions: [
            "events - list recent events",
            "event-card - get fights for an event",
            "fight-details - get result details for a fight",
            "full-sample - complete data exploration (recommended)",
          ],
          usage: "Add ?action=<action> to the URL",
        };
      }
    }

    return new Response(JSON.stringify(result, null, 2), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Test scraper error:", error);

    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack,
      }, null, 2),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
});
