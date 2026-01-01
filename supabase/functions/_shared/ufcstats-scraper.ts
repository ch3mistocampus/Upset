/**
 * UFCStats.com scraper utilities
 * Defensive parsing with rate limiting and retries
 */

import { load } from "https://esm.sh/cheerio@1.0.0-rc.12";

const BASE_URL = "http://ufcstats.com/statistics";
const DELAY_MS = 800; // Rate limiting between requests

interface ScraperOptions {
  retries?: number;
  delay?: number;
}

/**
 * Sleep utility for rate limiting
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with retry logic and rate limiting
 */
async function fetchWithRetry(
  url: string,
  options: ScraperOptions = {}
): Promise<string> {
  const { retries = 3, delay = DELAY_MS } = options;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      if (attempt > 0) {
        const backoff = delay * Math.pow(2, attempt - 1);
        console.log(`Retry attempt ${attempt}, waiting ${backoff}ms`);
        await sleep(backoff);
      } else {
        await sleep(delay); // Rate limit even on first request
      }

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      lastError = error as Error;
      console.error(`Fetch attempt ${attempt + 1} failed:`, error);
    }
  }

  throw new Error(`Failed after ${retries} attempts: ${lastError?.message}`);
}

/**
 * Scrape a single events page and return parsed events
 */
async function scrapeEventsPage(url: string): Promise<any[]> {
  const html = await fetchWithRetry(url);
  const $ = load(html);
  const events: any[] = [];

  // UFCStats lists events in a table (class changed from b-statistics__table to b-statistics__table-events)
  $("table.b-statistics__table-events tbody tr").each((_, row) => {
    const $row = $(row);
    const link = $row.find("a.b-link").first();
    const eventUrl = link.attr("href");
    const eventName = link.text().trim();
    const dateText = $row.find("span.b-statistics__date").text().trim();
    const location = $row.find("td").eq(1).text().trim();

    if (eventUrl && eventName) {
      // Extract event ID from URL (e.g., http://ufcstats.com/event-details/abc123)
      const eventId = eventUrl.split("/").pop() || "";

      events.push({
        ufcstats_event_id: eventId,
        event_url: eventUrl,
        name: eventName,
        date_text: dateText,
        location: location || null,
      });
    }
  });

  return events;
}

/**
 * Scrape upcoming and recent events from UFCStats
 * Fetches BOTH upcoming and completed events pages for comprehensive coverage
 */
export async function scrapeEventsList() {
  console.log("Scraping events list from UFCStats...");

  try {
    // Fetch BOTH upcoming and completed events for comprehensive data
    const upcomingUrl = `${BASE_URL}/events/upcoming`;
    const completedUrl = `${BASE_URL}/events/completed?page=all`;

    console.log("Fetching upcoming events...");
    const upcomingEvents = await scrapeEventsPage(upcomingUrl);
    console.log(`Found ${upcomingEvents.length} upcoming events`);

    // Wait between requests to respect rate limiting
    await sleep(DELAY_MS);

    console.log("Fetching completed events...");
    const completedEvents = await scrapeEventsPage(completedUrl);
    console.log(`Found ${completedEvents.length} completed events`);

    // Merge events, removing duplicates by ufcstats_event_id
    const eventMap = new Map<string, any>();

    // Add upcoming events first (higher priority)
    for (const event of upcomingEvents) {
      eventMap.set(event.ufcstats_event_id, event);
    }

    // Add completed events (won't overwrite upcoming)
    for (const event of completedEvents) {
      if (!eventMap.has(event.ufcstats_event_id)) {
        eventMap.set(event.ufcstats_event_id, event);
      }
    }

    const events = Array.from(eventMap.values());
    console.log(`Total unique events: ${events.length}`);
    return events;
  } catch (error) {
    console.error("Error scraping events list:", error);
    throw error;
  }
}

/**
 * Scrape fight card for a specific event
 */
export async function scrapeEventCard(eventUrl: string) {
  console.log(`Scraping event card: ${eventUrl}`);

  try {
    const html = await fetchWithRetry(eventUrl);
    const $ = load(html);
    const fights: any[] = [];

    // Find all fight rows
    $("table.b-fight-details__table tbody tr").each((index, row) => {
      const $row = $(row);

      // Get fighter names (red corner first, blue corner second)
      const fighters = $row.find("p.b-fight-details__table-text a.b-link");
      if (fighters.length < 2) return; // Skip rows without both fighters

      const redFighterLink = fighters.eq(0).attr("href") || "";
      const blueFighterLink = fighters.eq(1).attr("href") || "";
      const redName = fighters.eq(0).text().trim();
      const blueName = fighters.eq(1).text().trim();

      // Get fight link from "View Matchup" link or construct from fighter IDs
      let fightLink = $row.find("a[data-link]").attr("data-link");
      if (!fightLink) {
        // Try finding any fight details link in the row
        fightLink = $row.find("a[href*='/fight-details/']").attr("href");
      }

      // If still no link, construct a placeholder (will be updated when results are available)
      const fightId = fightLink ? fightLink.split("/").pop() || `${index}` : `${index}`;

      // Weight class
      const weightClass = $row.find("td.b-fight-details__table-col").eq(6).text().trim();

      // Method (if available)
      const method = $row.find("td.b-fight-details__table-col").eq(7).text().trim();

      // Round (if available)
      const round = $row.find("td.b-fight-details__table-col").eq(8).text().trim();

      // Time (if available)
      const time = $row.find("td.b-fight-details__table-col").eq(9).text().trim();

      fights.push({
        ufcstats_fight_id: fightId,
        fight_url: fightLink,
        order_index: index,
        red_fighter_id: redFighterLink.split("/").pop() || "",
        blue_fighter_id: blueFighterLink.split("/").pop() || "",
        red_name: redName,
        blue_name: blueName,
        weight_class: weightClass || null,
        method: method || null,
        round: round ? parseInt(round) : null,
        time: time || null,
      });
    });

    console.log(`Found ${fights.length} fights for event`);
    return fights;
  } catch (error) {
    console.error("Error scraping event card:", error);
    throw error;
  }
}

/**
 * Scrape detailed fight results
 */
export async function scrapeFightDetails(fightUrl: string) {
  console.log(`Scraping fight details: ${fightUrl}`);

  try {
    const html = await fetchWithRetry(fightUrl);
    const $ = load(html);

    // Get winner indicator (check for "W" next to fighter name)
    const fighters = $("div.b-fight-details__person");
    let winnerCorner: string | null = null;

    fighters.each((index, el) => {
      const outcome = $(el).find("i.b-fight-details__person-status").text().trim();
      if (outcome === "W") {
        winnerCorner = index === 0 ? "red" : "blue";
      } else if (outcome === "D") {
        winnerCorner = "draw";
      } else if (outcome === "NC") {
        winnerCorner = "nc";
      }
    });

    // Get fight details from the bottom section
    const detailsItems = $("p.b-fight-details__text");
    let method: string | null = null;
    let round: number | null = null;
    let time: string | null = null;
    let details: string | null = null;

    detailsItems.each((_, el) => {
      const text = $(el).text();

      if (text.includes("Method:")) {
        method = text.replace("Method:", "").trim();
      } else if (text.includes("Round:")) {
        const roundText = text.replace("Round:", "").trim();
        round = parseInt(roundText) || null;
      } else if (text.includes("Time:")) {
        time = text.replace("Time:", "").trim();
      } else if (text.includes("Details:")) {
        details = text.replace("Details:", "").trim();
      }
    });

    const result = {
      winner_corner: winnerCorner,
      method,
      round,
      time,
      details,
    };

    console.log("Fight result:", result);
    return result;
  } catch (error) {
    console.error("Error scraping fight details:", error);
    throw error;
  }
}

/**
 * Parse date string from UFCStats (e.g., "January 25, 2025")
 */
export function parseUFCStatsDate(dateText: string): Date | null {
  try {
    // UFCStats uses format like "January 25, 2025"
    const parsed = new Date(dateText);
    if (isNaN(parsed.getTime())) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
