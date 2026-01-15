/**
 * UFCStats Provider
 * Data provider implementation wrapping the UFCStats.com scraper
 */

import {
  DataProvider,
  EventData,
  FightData,
  FighterData,
  FighterSearchResult,
  HealthStatus,
  ProviderConfig,
} from "./data-provider-types.ts";

import {
  scrapeEventsList,
  scrapeEventCard,
  scrapeFightDetails,
  healthCheck as scraperHealthCheck,
  parseUFCStatsDate,
} from "./ufcstats-scraper.ts";

export class UFCStatsProvider implements DataProvider {
  name = "UFCStats.com Scraper";
  idType: "ufcstats" = "ufcstats";

  constructor(_config?: ProviderConfig) {
    // UFCStats scraper doesn't need configuration
  }

  async healthCheck(): Promise<HealthStatus> {
    const result = await scraperHealthCheck();
    return {
      status: result.status,
      latencyMs: result.latency_ms,
      canFetch: result.can_fetch,
      canParse: result.can_parse,
      error: result.error,
    };
  }

  async getUpcomingEvents(): Promise<EventData[]> {
    const events = await scrapeEventsList();
    const now = new Date();

    return events
      .map((event) => {
        const date = parseUFCStatsDate(event.date_text);
        return {
          externalId: event.ufcstats_event_id,
          name: event.name,
          date,
          location: event.location,
          status: (date && date > now ? "upcoming" : "completed") as EventData["status"],
        };
      })
      .filter((event) => event.status === "upcoming")
      .sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return a.date.getTime() - b.date.getTime();
      });
  }

  async getCompletedEvents(limit = 20): Promise<EventData[]> {
    const events = await scrapeEventsList();
    const now = new Date();

    return events
      .map((event) => {
        const date = parseUFCStatsDate(event.date_text);
        return {
          externalId: event.ufcstats_event_id,
          name: event.name,
          date,
          location: event.location,
          status: (date && date < now ? "completed" : "upcoming") as EventData["status"],
        };
      })
      .filter((event) => event.status === "completed")
      .sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return b.date.getTime() - a.date.getTime();
      })
      .slice(0, limit);
  }

  async getEventFightCard(eventExternalId: string): Promise<FightData[]> {
    const eventUrl = `http://ufcstats.com/event-details/${eventExternalId}`;
    const fights = await scrapeEventCard(eventUrl);

    return fights.map((fight) => ({
      externalId: fight.ufcstats_fight_id,
      eventExternalId,
      orderIndex: fight.order_index,
      redFighter: {
        externalId: fight.red_fighter_id,
        name: fight.red_name,
      },
      blueFighter: {
        externalId: fight.blue_fighter_id,
        name: fight.blue_name,
      },
      weightClass: fight.weight_class,
      scheduledRounds: fight.weight_class?.toLowerCase().includes("title") ? 5 : 3,
      winnerCorner: null, // Scraper gets this from fight details
      method: fight.method,
      round: fight.round,
      time: fight.time,
    }));
  }

  async getFightResult(fightExternalId: string): Promise<FightData | null> {
    const fightUrl = `http://ufcstats.com/fight-details/${fightExternalId}`;
    const result = await scrapeFightDetails(fightUrl);

    if (!result) return null;

    return {
      externalId: fightExternalId,
      eventExternalId: "", // Not available from fight details
      orderIndex: 0,
      redFighter: { externalId: "", name: "" },
      blueFighter: { externalId: "", name: "" },
      weightClass: null,
      scheduledRounds: 3,
      winnerCorner: result.winner_corner as FightData["winnerCorner"],
      method: result.method,
      round: result.round,
      time: result.time,
    };
  }

  async searchFighters(_query: string, _limit = 20): Promise<FighterSearchResult[]> {
    // UFCStats doesn't have a search endpoint
    // This would need to be done via database search
    console.warn("Fighter search not supported by UFCStats scraper - use database search");
    return [];
  }

  async getFighterDetails(_fighterExternalId: string): Promise<FighterData | null> {
    // UFCStats fighter details would require scraping individual fighter pages
    // For now, this data comes from the pre-imported database
    console.warn("Fighter details not supported by UFCStats scraper - use database");
    return null;
  }

  async getRankings(_division?: string): Promise<FighterData[]> {
    // UFCStats doesn't have rankings data
    // Rankings would need to be manually entered or scraped from another source
    console.warn("Rankings not supported by UFCStats scraper");
    return [];
  }
}

/**
 * Create UFCStats provider instance
 */
export function createUFCStatsProvider(config?: ProviderConfig): DataProvider {
  return new UFCStatsProvider(config);
}
