/**
 * UFCStats.com scraper utilities
 * Defensive parsing with rate limiting, retries, and fallback selectors
 */

import { load } from "https://esm.sh/cheerio@1.0.0-rc.12";

const BASE_URL = "http://ufcstats.com/statistics";
const DELAY_MS = 800; // Rate limiting between requests
const REQUEST_TIMEOUT_MS = 30000; // 30 second timeout

interface ScraperOptions {
  retries?: number;
  delay?: number;
  timeout?: number;
}

// Multiple selector fallbacks for robustness
const EVENT_TABLE_SELECTORS = [
  "table.b-statistics__table-events tbody tr",
  "table.b-statistics__table tbody tr",
  ".b-statistics__table-events tbody tr",
  ".b-statistics__table tbody tr",
  "table tbody tr",
];

const FIGHT_TABLE_SELECTORS = [
  "table.b-fight-details__table tbody tr",
  ".b-fight-details__table tbody tr",
  "table.b-fight-details tbody tr",
  "table tbody tr.b-fight-details__table-row",
  "tr.b-fight-details__table-row",
];

// Fallback selectors for fighter links in fight tables
const FIGHTER_LINK_SELECTORS = [
  "p.b-fight-details__table-text a.b-link",
  "td a.b-link[href*='fighter-details']",
  "a[href*='fighter-details']",
];

// Fallback selectors for fight details page
const FIGHT_PERSON_SELECTORS = [
  "div.b-fight-details__person",
  ".b-fight-details__person",
  "div.b-fight-details__fighter",
];

const FIGHT_TEXT_SELECTORS = [
  "p.b-fight-details__text",
  ".b-fight-details__text",
  "p.b-fight-details__table-text",
];

/**
 * Sleep utility for rate limiting
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with retry logic, rate limiting, and timeout
 */
async function fetchWithRetry(
  url: string,
  options: ScraperOptions = {}
): Promise<string> {
  const { retries = 3, delay = DELAY_MS, timeout = REQUEST_TIMEOUT_MS } = options;
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

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();

        // Validate we got actual HTML content
        if (!html || html.length < 100) {
          throw new Error("Empty or invalid response received");
        }

        return html;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      lastError = error as Error;
      const errorMessage = lastError.name === 'AbortError' ? 'Request timeout' : lastError.message;
      console.error(`Fetch attempt ${attempt + 1} failed:`, errorMessage);
    }
  }

  throw new Error(`Failed after ${retries} attempts: ${lastError?.message}`);
}

/**
 * Try multiple selectors and return first match with results
 */
function trySelectors($: any, selectors: string[]): any {
  for (const selector of selectors) {
    const elements = $(selector);
    if (elements.length > 0) {
      console.log(`Using selector: ${selector} (found ${elements.length} rows)`);
      return elements;
    }
  }
  console.warn(`No matching selector found. Tried: ${selectors.join(", ")}`);
  return $([]);
}

/**
 * Scrape a single events page and return parsed events
 */
async function scrapeEventsPage(url: string): Promise<any[]> {
  const html = await fetchWithRetry(url);
  const $ = load(html);
  const events: any[] = [];

  // Try multiple selectors for robustness
  const rows = trySelectors($, EVENT_TABLE_SELECTORS);

  rows.each((_: number, row: any) => {
    const $row = $(row);

    // Try multiple ways to find the event link
    let link = $row.find("a.b-link").first();
    if (!link.length) {
      link = $row.find("a[href*='event-details']").first();
    }
    if (!link.length) {
      link = $row.find("td a").first();
    }

    const eventUrl = link.attr("href");
    const eventName = link.text().trim();

    // Try multiple ways to find the date
    let dateText = $row.find("span.b-statistics__date").text().trim();
    if (!dateText) {
      // Fallback: second td often contains date
      dateText = $row.find("td").eq(0).find("span").text().trim();
    }

    // Location is usually in second column
    const location = $row.find("td").eq(1).text().trim();

    if (eventUrl && eventName && eventUrl.includes("event-details")) {
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
 * Try multiple selectors to find fighter links in a row
 */
function findFighterLinks($: any, $row: any): any {
  for (const selector of FIGHTER_LINK_SELECTORS) {
    const fighters = $row.find(selector);
    if (fighters.length >= 2) {
      return fighters;
    }
  }
  // Last resort: find all links with fighter-details in href
  const allLinks = $row.find("a[href*='fighter-details']");
  if (allLinks.length >= 2) {
    return allLinks;
  }
  return $([]);
}

/**
 * Scrape fight card for a specific event
 * Uses fallback selectors for robust parsing
 */
export async function scrapeEventCard(eventUrl: string) {
  console.log(`Scraping event card: ${eventUrl}`);

  try {
    const html = await fetchWithRetry(eventUrl);
    const $ = load(html);
    const fights: any[] = [];

    // Try multiple selectors for fight table rows
    const rows = trySelectors($, FIGHT_TABLE_SELECTORS);

    if (rows.length === 0) {
      console.warn("No fight rows found with any selector");
      return fights;
    }

    rows.each((index: number, row: any) => {
      const $row = $(row);

      // Get fighter links using fallback selectors
      const fighters = findFighterLinks($, $row);
      if (fighters.length < 2) return; // Skip rows without both fighters

      const redFighterLink = fighters.eq(0).attr("href") || "";
      const blueFighterLink = fighters.eq(1).attr("href") || "";
      const redName = fighters.eq(0).text().trim();
      const blueName = fighters.eq(1).text().trim();

      // Skip if no fighter names found
      if (!redName || !blueName) return;

      // Get fight link from "View Matchup" link or construct from fighter IDs
      let fightLink = $row.find("a[data-link]").attr("data-link");
      if (!fightLink) {
        // Try finding any fight details link in the row
        fightLink = $row.find("a[href*='/fight-details/']").attr("href");
      }

      // If still no link, construct a deterministic ID from fighter IDs
      const redId = redFighterLink.split("/").pop() || "";
      const blueId = blueFighterLink.split("/").pop() || "";
      const fightId = fightLink
        ? fightLink.split("/").pop() || `${redId}_${blueId}`
        : `${redId}_${blueId}`;

      // Weight class - try multiple column positions
      let weightClass = "";
      const cols = $row.find("td");
      for (let i = 5; i < Math.min(cols.length, 8); i++) {
        const text = cols.eq(i).text().trim();
        if (text && (text.includes("weight") || text.includes("Weight") ||
            text.match(/^(Flyweight|Bantamweight|Featherweight|Lightweight|Welterweight|Middleweight|Light Heavyweight|Heavyweight|Strawweight|Women)/i))) {
          weightClass = text;
          break;
        }
      }

      // Method (if available) - look for common patterns
      let method = "";
      for (let i = 0; i < cols.length; i++) {
        const text = cols.eq(i).text().trim();
        if (text.match(/^(KO|TKO|SUB|DEC|Decision|Submission|Knockout)/i)) {
          method = text;
          break;
        }
      }

      // Round - look for single digit
      let round = "";
      for (let i = 0; i < cols.length; i++) {
        const text = cols.eq(i).text().trim();
        if (text.match(/^[1-5]$/)) {
          round = text;
          break;
        }
      }

      // Time - look for MM:SS pattern
      let time = "";
      for (let i = 0; i < cols.length; i++) {
        const text = cols.eq(i).text().trim();
        if (text.match(/^\d{1,2}:\d{2}$/)) {
          time = text;
          break;
        }
      }

      fights.push({
        ufcstats_fight_id: fightId,
        fight_url: fightLink || null,
        order_index: index,
        red_fighter_id: redId,
        blue_fighter_id: blueId,
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
 * Uses fallback selectors for robust parsing
 */
export async function scrapeFightDetails(fightUrl: string) {
  console.log(`Scraping fight details: ${fightUrl}`);

  try {
    const html = await fetchWithRetry(fightUrl);
    const $ = load(html);

    // Get winner indicator using fallback selectors
    const fighters = trySelectors($, FIGHT_PERSON_SELECTORS);
    let winnerCorner: string | null = null;

    fighters.each((index: number, el: any) => {
      // Try multiple ways to find outcome indicator
      let outcome = $(el).find("i.b-fight-details__person-status").text().trim();
      if (!outcome) {
        outcome = $(el).find(".b-fight-details__person-status").text().trim();
      }
      if (!outcome) {
        outcome = $(el).find("i[class*='status']").text().trim();
      }

      if (outcome === "W") {
        winnerCorner = index === 0 ? "red" : "blue";
      } else if (outcome === "D") {
        winnerCorner = "draw";
      } else if (outcome === "NC") {
        winnerCorner = "nc";
      }
    });

    // Get fight details using fallback selectors
    const detailsItems = trySelectors($, FIGHT_TEXT_SELECTORS);
    let method: string | null = null;
    let round: number | null = null;
    let time: string | null = null;
    let details: string | null = null;

    detailsItems.each((_: number, el: any) => {
      const text = $(el).text();

      if (text.includes("Method:")) {
        method = text.replace("Method:", "").trim();
        // Clean up extra whitespace
        method = method.replace(/\s+/g, " ");
      } else if (text.includes("Round:")) {
        const roundText = text.replace("Round:", "").trim();
        round = parseInt(roundText) || null;
      } else if (text.includes("Time:")) {
        time = text.replace("Time:", "").trim();
      } else if (text.includes("Details:")) {
        details = text.replace("Details:", "").trim();
        details = details.replace(/\s+/g, " ");
      }
    });

    // Fallback: try to find method/round/time in any text element
    if (!method) {
      $("*").each((_: number, el: any) => {
        const text = $(el).text();
        if (text.includes("Method:") && !method) {
          const match = text.match(/Method:\s*([^R]+?)(?:Round:|Time:|$)/);
          if (match) {
            method = match[1].trim();
          }
        }
      });
    }

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
 * Parse date string from UFCStats
 * Handles multiple formats: "January 25, 2025", "Jan 25, 2025", "2025-01-25"
 */
export function parseUFCStatsDate(dateText: string): Date | null {
  if (!dateText || typeof dateText !== 'string') {
    return null;
  }

  const cleanedText = dateText.trim();
  if (!cleanedText) {
    return null;
  }

  try {
    // Try standard Date parsing first (handles "January 25, 2025")
    let parsed = new Date(cleanedText);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    // Try ISO format (YYYY-MM-DD)
    if (cleanedText.match(/^\d{4}-\d{2}-\d{2}/)) {
      parsed = new Date(cleanedText);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    // Try to extract and parse date components manually
    // Match patterns like "Jan 25, 2025" or "January 25 2025"
    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
    ];
    const monthAbbrevs = [
      'jan', 'feb', 'mar', 'apr', 'may', 'jun',
      'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
    ];

    const lowerText = cleanedText.toLowerCase();
    let month = -1;

    // Find month
    for (let i = 0; i < monthNames.length; i++) {
      if (lowerText.includes(monthNames[i]) || lowerText.includes(monthAbbrevs[i])) {
        month = i;
        break;
      }
    }

    if (month >= 0) {
      // Extract day and year using regex
      const numbers = cleanedText.match(/\d+/g);
      if (numbers && numbers.length >= 2) {
        const day = parseInt(numbers[0]);
        const year = parseInt(numbers[1]);
        if (day >= 1 && day <= 31 && year >= 2000 && year <= 2100) {
          return new Date(year, month, day);
        }
      }
    }

    console.warn(`Could not parse date: "${cleanedText}"`);
    return null;
  } catch (error) {
    console.error(`Error parsing date "${cleanedText}":`, error);
    return null;
  }
}

/**
 * Health check for UFCStats scraper
 * Returns connectivity status and basic scraping ability
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency_ms: number;
  can_fetch: boolean;
  can_parse: boolean;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    // Try to fetch the events page
    const testUrl = `${BASE_URL}/events/upcoming`;
    const html = await fetchWithRetry(testUrl, { retries: 1, timeout: 10000 });

    const canFetch = html.length > 100;

    // Try to parse it
    const $ = load(html);
    const rows = trySelectors($, EVENT_TABLE_SELECTORS);
    const canParse = rows.length > 0;

    const latency = Date.now() - startTime;

    return {
      status: canFetch && canParse ? 'healthy' : canFetch ? 'degraded' : 'unhealthy',
      latency_ms: latency,
      can_fetch: canFetch,
      can_parse: canParse,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency_ms: Date.now() - startTime,
      can_fetch: false,
      can_parse: false,
      error: (error as Error).message,
    };
  }
}
