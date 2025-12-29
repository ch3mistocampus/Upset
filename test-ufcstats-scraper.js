/**
 * Quick test script to explore UFCStats data structure
 * Run with: node test-ufcstats-scraper.js
 */

import { load } from 'cheerio';

const BASE_URL = "http://ufcstats.com/statistics";
const DELAY_MS = 800;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, retries = 3) {
  let lastError = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      if (attempt > 0) {
        const backoff = DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`Retry attempt ${attempt}, waiting ${backoff}ms`);
        await sleep(backoff);
      } else {
        await sleep(DELAY_MS);
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
      lastError = error;
      console.error(`Fetch attempt ${attempt + 1} failed:`, error.message);
    }
  }

  throw new Error(`Failed after ${retries} attempts: ${lastError?.message}`);
}

async function scrapeEventsList() {
  console.log("\n=== SCRAPING EVENTS LIST ===");
  const url = `${BASE_URL}/events/completed?page=all`;
  console.log(`URL: ${url}\n`);

  const html = await fetchWithRetry(url);
  const $ = load(html);
  const events = [];

  $("table.b-statistics__table tbody tr").each((_, row) => {
    const $row = $(row);
    const link = $row.find("a.b-link").first();
    const eventUrl = link.attr("href");
    const eventName = link.text().trim();
    const dateText = $row.find("span.b-statistics__date").text().trim();
    const location = $row.find("td.b-statistics__table-col").eq(1).text().trim();

    if (eventUrl && eventName) {
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

  console.log(`✓ Found ${events.length} events\n`);
  return events;
}

async function scrapeEventCard(eventUrl) {
  console.log(`\n=== SCRAPING EVENT CARD ===`);
  console.log(`URL: ${eventUrl}\n`);

  const html = await fetchWithRetry(eventUrl);
  const $ = load(html);
  const fights = [];

  $("table.b-fight-details__table tbody tr").each((index, row) => {
    const $row = $(row);
    const fightLink = $row.find("a.b-flag").attr("href");
    if (!fightLink) return;

    const fightId = fightLink.split("/").pop() || "";
    const fighters = $row.find("p.b-fight-details__table-text a");
    const redFighterLink = fighters.eq(0).attr("href") || "";
    const blueFighterLink = fighters.eq(1).attr("href") || "";
    const redName = fighters.eq(0).text().trim();
    const blueName = fighters.eq(1).text().trim();
    const weightClass = $row.find("td.b-fight-details__table-col").eq(6).text().trim();
    const method = $row.find("td.b-fight-details__table-col").eq(7).text().trim();
    const round = $row.find("td.b-fight-details__table-col").eq(8).text().trim();
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

  console.log(`✓ Found ${fights.length} fights\n`);
  return fights;
}

async function scrapeFightDetails(fightUrl) {
  console.log(`\n=== SCRAPING FIGHT DETAILS ===`);
  console.log(`URL: ${fightUrl}\n`);

  const html = await fetchWithRetry(fightUrl);
  const $ = load(html);

  const fighters = $("div.b-fight-details__person");
  let winnerCorner = null;

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

  const detailsItems = $("p.b-fight-details__text");
  let method = null;
  let round = null;
  let time = null;
  let details = null;

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

  return {
    winner_corner: winnerCorner,
    method,
    round,
    time,
    details,
  };
}

async function main() {
  try {
    console.log("🔍 UFCStats Data Explorer");
    console.log("=" .repeat(50));

    // Step 1: Get events list
    const events = await scrapeEventsList();
    console.log("📋 Sample Events (first 3):");
    console.log(JSON.stringify(events.slice(0, 3), null, 2));

    // Step 2: Get a completed event with results
    console.log("\n🔎 Looking for a recent event with results...");
    let eventWithResults = null;
    let fights = [];

    for (const event of events.slice(0, 5)) {
      console.log(`Checking: ${event.name}`);
      const eventFights = await scrapeEventCard(event.event_url);

      if (eventFights.length > 0 && eventFights[0].method) {
        eventWithResults = event;
        fights = eventFights;
        console.log(`✓ Found event with results: ${event.name}\n`);
        break;
      }
    }

    if (!eventWithResults) {
      console.log("❌ Could not find a recent completed event");
      return;
    }

    // Step 3: Show fight card sample
    console.log("\n🥊 Fight Card Sample (first 3 fights):");
    console.log(JSON.stringify(fights.slice(0, 3), null, 2));

    // Step 4: Get detailed results for first fight
    const firstFight = fights[0];
    const fightDetails = await scrapeFightDetails(firstFight.fight_url);

    console.log("\n📊 Detailed Fight Result:");
    console.log(JSON.stringify({
      fight: {
        red: firstFight.red_name,
        blue: firstFight.blue_name,
        weight_class: firstFight.weight_class,
      },
      result: fightDetails,
    }, null, 2));

    console.log("\n" + "=".repeat(50));
    console.log("✅ Data exploration complete!");
    console.log("\n📝 Key Findings:");
    console.log(`- Total events found: ${events.length}`);
    console.log(`- Sample event: ${eventWithResults.name}`);
    console.log(`- Fights in event: ${fights.length}`);
    console.log(`- Data fields available: event_id, name, date, location, fighters, weight_class, method, round, time, winner`);

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
  }
}

main();
