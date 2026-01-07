/**
 * MMA API Provider (RapidAPI)
 * Data provider implementation using the MMA API from RapidAPI
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

const DEFAULT_BASE_URL = "https://mma-api1.p.rapidapi.com";
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRIES = 2;

// Rate limiting
const DELAY_MS = 300;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MMAApiProvider implements DataProvider {
  name = "MMA API (RapidAPI)";
  idType: "ufcstats" | "espn" = "espn";

  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private retries: number;
  private lastRequestTime = 0;

  constructor(config?: ProviderConfig) {
    this.apiKey = config?.apiKey || Deno.env.get("MMA_API_KEY") || "";
    this.baseUrl = config?.baseUrl || DEFAULT_BASE_URL;
    this.timeout = config?.timeout || DEFAULT_TIMEOUT;
    this.retries = config?.retries || DEFAULT_RETRIES;

    if (!this.apiKey) {
      console.warn("MMA API key not configured - provider will not work");
    }
  }

  private async fetch(endpoint: string, params: Record<string, string> = {}): Promise<any> {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < DELAY_MS) {
      await sleep(DELAY_MS - timeSinceLastRequest);
    }
    this.lastRequestTime = Date.now();

    const url = new URL(endpoint, this.baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "x-rapidapi-host": "mma-api1.p.rapidapi.com",
            "x-rapidapi-key": this.apiKey,
            "Accept": "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        lastError = error as Error;
        console.error(`MMA API request failed (attempt ${attempt + 1}):`, lastError.message);

        if (attempt < this.retries) {
          await sleep(1000 * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }

    throw lastError || new Error("Request failed");
  }

  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      // Try to fetch UFC rankings as a health check
      const data = await this.fetch("/ufc-rankings");
      const canFetch = !!data;
      const canParse = Array.isArray(data) || (data && typeof data === "object");

      return {
        status: canFetch && canParse ? "healthy" : "degraded",
        latencyMs: Date.now() - startTime,
        canFetch,
        canParse,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        latencyMs: Date.now() - startTime,
        canFetch: false,
        canParse: false,
        error: (error as Error).message,
      };
    }
  }

  async getUpcomingEvents(): Promise<EventData[]> {
    try {
      const year = new Date().getFullYear();
      const data = await this.fetch("/schedule", { year: year.toString(), league: "ufc" });

      if (!data || !Array.isArray(data)) {
        console.warn("Unexpected schedule response format");
        return [];
      }

      const now = new Date();
      const events: EventData[] = [];

      for (const event of data) {
        const eventDate = event.date ? new Date(event.date) : null;

        // Only include future events
        if (eventDate && eventDate > now) {
          events.push({
            externalId: event.eventId || event.id || "",
            name: event.name || event.title || "",
            date: eventDate,
            location: event.location || event.venue || null,
            status: "upcoming",
          });
        }
      }

      return events.sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return a.date.getTime() - b.date.getTime();
      });
    } catch (error) {
      console.error("Error fetching upcoming events:", error);
      throw error;
    }
  }

  async getCompletedEvents(limit = 20): Promise<EventData[]> {
    try {
      const year = new Date().getFullYear();
      const data = await this.fetch("/schedule", { year: year.toString(), league: "ufc" });

      if (!data || !Array.isArray(data)) {
        return [];
      }

      const now = new Date();
      const events: EventData[] = [];

      for (const event of data) {
        const eventDate = event.date ? new Date(event.date) : null;

        // Only include past events
        if (eventDate && eventDate < now) {
          events.push({
            externalId: event.eventId || event.id || "",
            name: event.name || event.title || "",
            date: eventDate,
            location: event.location || event.venue || null,
            status: "completed",
          });
        }
      }

      return events
        .sort((a, b) => {
          if (!a.date || !b.date) return 0;
          return b.date.getTime() - a.date.getTime(); // Most recent first
        })
        .slice(0, limit);
    } catch (error) {
      console.error("Error fetching completed events:", error);
      throw error;
    }
  }

  async getEventFightCard(eventExternalId: string): Promise<FightData[]> {
    try {
      const data = await this.fetch("/scoreboard-by-event", {
        eventId: eventExternalId,
        league: "ufc",
      });

      if (!data) {
        return [];
      }

      // The API returns scoreboard data with fights/competitions
      const competitions = data.competitions || data.events?.[0]?.competitions || [];
      const fights: FightData[] = [];

      for (let i = 0; i < competitions.length; i++) {
        const comp = competitions[i];
        const competitors = comp.competitors || [];

        if (competitors.length < 2) continue;

        // Red corner is usually first, blue is second
        const redFighter = competitors[0];
        const blueFighter = competitors[1];

        // Determine winner
        let winnerCorner: "red" | "blue" | "draw" | "nc" | null = null;
        if (redFighter.winner === true) winnerCorner = "red";
        else if (blueFighter.winner === true) winnerCorner = "blue";
        else if (comp.status?.type?.name === "STATUS_FINAL" && !redFighter.winner && !blueFighter.winner) {
          // Check for draw or NC
          const notes = (comp.notes || []).map((n: any) => n.headline?.toLowerCase() || "");
          if (notes.some((n: string) => n.includes("draw"))) winnerCorner = "draw";
          else if (notes.some((n: string) => n.includes("no contest"))) winnerCorner = "nc";
        }

        fights.push({
          externalId: comp.id || `${eventExternalId}_${i}`,
          eventExternalId,
          orderIndex: i,
          redFighter: {
            externalId: redFighter.athlete?.id || redFighter.id || "",
            name: redFighter.athlete?.displayName || redFighter.name || "",
          },
          blueFighter: {
            externalId: blueFighter.athlete?.id || blueFighter.id || "",
            name: blueFighter.athlete?.displayName || blueFighter.name || "",
          },
          weightClass: comp.type?.text || comp.weightClass || null,
          scheduledRounds: comp.format?.regulation?.periods || 3,
          winnerCorner,
          method: comp.status?.result?.method || null,
          round: comp.status?.result?.round || null,
          time: comp.status?.result?.time || null,
        });
      }

      return fights;
    } catch (error) {
      console.error("Error fetching event fight card:", error);
      throw error;
    }
  }

  async getFightResult(fightExternalId: string): Promise<FightData | null> {
    // The MMA API doesn't have a dedicated fight details endpoint
    // We'd need to get it from the event scoreboard
    console.warn("getFightResult not directly supported - use getEventFightCard instead");
    return null;
  }

  async searchFighters(query: string, limit = 20): Promise<FighterSearchResult[]> {
    try {
      const data = await this.fetch("/search", {
        query,
        limit: limit.toString(),
      });

      if (!data || !Array.isArray(data)) {
        return [];
      }

      return data.map((fighter: any) => ({
        externalId: fighter.playerId || fighter.id || "",
        name: fighter.name || fighter.displayName || "",
        nickname: fighter.nickname || null,
        record: fighter.record || "",
        weightClass: fighter.weightClass || null,
      }));
    } catch (error) {
      console.error("Error searching fighters:", error);
      throw error;
    }
  }

  async getFighterDetails(fighterExternalId: string): Promise<FighterData | null> {
    try {
      const data = await this.fetch("/fighter-details", {
        fighterId: fighterExternalId,
      });

      if (!data) {
        return null;
      }

      // Parse record string "20-5-0" into components
      const recordMatch = (data.record || "").match(/(\d+)-(\d+)-?(\d+)?/);
      const wins = recordMatch ? parseInt(recordMatch[1]) || 0 : 0;
      const losses = recordMatch ? parseInt(recordMatch[2]) || 0 : 0;
      const draws = recordMatch ? parseInt(recordMatch[3]) || 0 : 0;

      return {
        externalId: data.playerId || data.id || fighterExternalId,
        name: data.name || data.displayName || "",
        nickname: data.nickname || null,
        record: { wins, losses, draws, nc: 0 },
        weightClass: data.weightClass || null,
        ranking: data.rank ? parseInt(data.rank) : null,
        imageUrl: data.headshot?.href || data.image || null,
      };
    } catch (error) {
      console.error("Error fetching fighter details:", error);
      return null;
    }
  }

  async getRankings(division?: string): Promise<FighterData[]> {
    try {
      let data: any;

      if (division) {
        // Map division name to divisional ID
        const divisionMap: Record<string, number> = {
          heavyweight: 1,
          "light heavyweight": 2,
          middleweight: 3,
          welterweight: 4,
          lightweight: 5,
          featherweight: 6,
          bantamweight: 7,
          flyweight: 8,
          "women's featherweight": 9,
          "women's bantamweight": 10,
          "women's flyweight": 11,
          strawweight: 12,
        };

        const idDivisional = divisionMap[division.toLowerCase()];
        if (idDivisional) {
          data = await this.fetch("/drankings/details", {
            idDivisional: idDivisional.toString(),
          });
        }
      } else {
        data = await this.fetch("/ufc-rankings");
      }

      if (!data) {
        return [];
      }

      const fighters: FighterData[] = [];

      // Handle divisional details response
      if (data.currentchampion) {
        for (const champ of data.currentchampion) {
          const fighter = champ.fighter || champ;
          fighters.push({
            externalId: fighter.fighterId || fighter.id || "",
            name: fighter.name || "",
            nickname: null,
            record: { wins: 0, losses: 0, draws: 0, nc: 0 },
            weightClass: division || null,
            ranking: 0, // Champion
            imageUrl: fighter.image || fighter.headshot || null,
          });
        }
      }

      // Handle rankings array
      const rankings = data.rankings || data;
      if (Array.isArray(rankings)) {
        for (const fighter of rankings) {
          fighters.push({
            externalId: fighter.fighterId || fighter.playerId || fighter.id || "",
            name: fighter.fighter || fighter.name || "",
            nickname: null,
            record: { wins: 0, losses: 0, draws: 0, nc: 0 },
            weightClass: fighter.division || division || null,
            ranking: fighter.rank || null,
            imageUrl: fighter.headshot || fighter.image || null,
          });
        }
      }

      return fighters;
    } catch (error) {
      console.error("Error fetching rankings:", error);
      throw error;
    }
  }
}

/**
 * Create MMA API provider instance
 */
export function createMMAApiProvider(config?: ProviderConfig): DataProvider {
  return new MMAApiProvider(config);
}
