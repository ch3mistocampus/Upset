/**
 * Data Provider Types
 * Abstraction layer for UFC data sources
 */

// ============================================================================
// Common Data Types
// ============================================================================

export interface EventData {
  externalId: string;          // Source-specific ID (ufcstats_event_id)
  name: string;
  date: Date | null;
  location: string | null;
  status: 'upcoming' | 'live' | 'completed';
}

export interface FightData {
  externalId: string;          // Source-specific ID
  eventExternalId: string;
  orderIndex: number;
  redFighter: {
    externalId: string;
    name: string;
  };
  blueFighter: {
    externalId: string;
    name: string;
  };
  weightClass: string | null;
  scheduledRounds: number;
  // Result (if completed)
  winnerCorner: 'red' | 'blue' | 'draw' | 'nc' | null;
  method: string | null;
  round: number | null;
  time: string | null;
}

export interface FighterData {
  externalId: string;
  name: string;
  nickname: string | null;
  record: {
    wins: number;
    losses: number;
    draws: number;
    nc: number;
  };
  weightClass: string | null;
  ranking: number | null;       // 0 = champion, 1-15 = ranked
  imageUrl: string | null;
}

export interface FighterSearchResult {
  externalId: string;
  name: string;
  nickname: string | null;
  record: string;               // "20-5-0" format
  weightClass: string | null;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  canFetch: boolean;
  canParse: boolean;
  error?: string;
}

// ============================================================================
// Provider Interface
// ============================================================================

export interface DataProvider {
  /** Provider name for logging */
  name: string;

  /** ID type used by this provider */
  idType: 'ufcstats';

  /** Check provider health/connectivity */
  healthCheck(): Promise<HealthStatus>;

  /** Get list of upcoming events */
  getUpcomingEvents(): Promise<EventData[]>;

  /** Get list of completed events */
  getCompletedEvents(limit?: number): Promise<EventData[]>;

  /** Get fight card for a specific event */
  getEventFightCard(eventExternalId: string): Promise<FightData[]>;

  /** Get detailed fight result */
  getFightResult(fightExternalId: string): Promise<FightData | null>;

  /** Search fighters by name */
  searchFighters(query: string, limit?: number): Promise<FighterSearchResult[]>;

  /** Get fighter details */
  getFighterDetails(fighterExternalId: string): Promise<FighterData | null>;

  /** Get current rankings by division */
  getRankings(division?: string): Promise<FighterData[]>;
}

// ============================================================================
// Provider Configuration
// ============================================================================

export type DataProviderType = 'ufcstats';

export interface ProviderConfig {
  type: DataProviderType;
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

// ============================================================================
// Provider Factory
// ============================================================================

export type ProviderFactory = (config?: ProviderConfig) => DataProvider;
