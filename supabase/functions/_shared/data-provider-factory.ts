/**
 * Data Provider Factory
 * Creates and manages data providers, supports switching between sources
 */

import {
  DataProvider,
  DataProviderType,
  ProviderConfig,
  HealthStatus,
} from "./data-provider-types.ts";
import { createUFCStatsProvider } from "./ufcstats-provider.ts";
import { createMMAApiProvider } from "./mma-api-provider.ts";

// ============================================================================
// Provider Configuration from Environment
// ============================================================================

function getDefaultProviderType(): DataProviderType {
  const envProvider = Deno.env.get("DATA_PROVIDER");
  if (envProvider === "mma-api") return "mma-api";
  return "ufcstats"; // Default to scraper
}

function getMMAApiKey(): string | undefined {
  return Deno.env.get("MMA_API_KEY") || Deno.env.get("RAPIDAPI_KEY");
}

// ============================================================================
// Provider Factory
// ============================================================================

/**
 * Create a data provider instance
 */
export function createProvider(type?: DataProviderType, config?: ProviderConfig): DataProvider {
  const providerType = type || config?.type || getDefaultProviderType();

  switch (providerType) {
    case "mma-api":
      return createMMAApiProvider({
        ...config,
        apiKey: config?.apiKey || getMMAApiKey(),
      });

    case "ufcstats":
    default:
      return createUFCStatsProvider(config);
  }
}

/**
 * Get the default provider based on environment configuration
 */
export function getDefaultProvider(): DataProvider {
  return createProvider();
}

// ============================================================================
// Multi-Provider Support
// ============================================================================

interface MultiProviderOptions {
  primary: DataProviderType;
  fallback?: DataProviderType;
  healthCheckBeforeUse?: boolean;
}

/**
 * Multi-provider that can fallback to secondary source
 */
export class MultiProvider implements DataProvider {
  name = "Multi-Provider";
  idType: "ufcstats" | "espn" = "ufcstats";

  private primary: DataProvider;
  private fallback: DataProvider | null;
  private options: MultiProviderOptions;

  constructor(options: MultiProviderOptions) {
    this.options = options;
    this.primary = createProvider(options.primary);
    this.fallback = options.fallback ? createProvider(options.fallback) : null;
    this.idType = this.primary.idType;
  }

  private async getActiveProvider(): Promise<DataProvider> {
    if (!this.options.healthCheckBeforeUse) {
      return this.primary;
    }

    try {
      const health = await this.primary.healthCheck();
      if (health.status !== "unhealthy") {
        return this.primary;
      }
    } catch (error) {
      console.error("Primary provider health check failed:", error);
    }

    if (this.fallback) {
      console.log(`Falling back to ${this.fallback.name}`);
      return this.fallback;
    }

    return this.primary; // Use primary anyway if no fallback
  }

  async healthCheck(): Promise<HealthStatus> {
    const primary = await this.primary.healthCheck();

    if (primary.status === "healthy" || !this.fallback) {
      return primary;
    }

    const fallback = await this.fallback.healthCheck();

    return {
      status: fallback.status === "healthy" ? "degraded" : primary.status,
      latencyMs: primary.latencyMs,
      canFetch: primary.canFetch || fallback.canFetch,
      canParse: primary.canParse || fallback.canParse,
      error: primary.error || fallback.error,
    };
  }

  async getUpcomingEvents() {
    const provider = await this.getActiveProvider();
    return provider.getUpcomingEvents();
  }

  async getCompletedEvents(limit?: number) {
    const provider = await this.getActiveProvider();
    return provider.getCompletedEvents(limit);
  }

  async getEventFightCard(eventExternalId: string) {
    const provider = await this.getActiveProvider();
    return provider.getEventFightCard(eventExternalId);
  }

  async getFightResult(fightExternalId: string) {
    const provider = await this.getActiveProvider();
    return provider.getFightResult(fightExternalId);
  }

  async searchFighters(query: string, limit?: number) {
    const provider = await this.getActiveProvider();
    return provider.searchFighters(query, limit);
  }

  async getFighterDetails(fighterExternalId: string) {
    const provider = await this.getActiveProvider();
    return provider.getFighterDetails(fighterExternalId);
  }

  async getRankings(division?: string) {
    const provider = await this.getActiveProvider();
    return provider.getRankings(division);
  }
}

/**
 * Create a multi-provider with fallback support
 */
export function createMultiProvider(options: MultiProviderOptions): DataProvider {
  return new MultiProvider(options);
}

// ============================================================================
// Provider Comparison (for testing/debugging)
// ============================================================================

interface ComparisonResult {
  provider1: string;
  provider2: string;
  endpoint: string;
  provider1Result: any;
  provider2Result: any;
  match: boolean;
  differences?: string[];
}

/**
 * Compare results from two providers (for debugging/testing)
 */
export async function compareProviders(
  type1: DataProviderType,
  type2: DataProviderType,
  endpoint: "events" | "health"
): Promise<ComparisonResult> {
  const provider1 = createProvider(type1);
  const provider2 = createProvider(type2);

  let result1: any;
  let result2: any;

  switch (endpoint) {
    case "events":
      result1 = await provider1.getUpcomingEvents();
      result2 = await provider2.getUpcomingEvents();
      break;
    case "health":
      result1 = await provider1.healthCheck();
      result2 = await provider2.healthCheck();
      break;
  }

  const match = JSON.stringify(result1) === JSON.stringify(result2);

  return {
    provider1: provider1.name,
    provider2: provider2.name,
    endpoint,
    provider1Result: result1,
    provider2Result: result2,
    match,
    differences: match ? undefined : ["Results differ - manual comparison needed"],
  };
}

// ============================================================================
// Exports
// ============================================================================

export { DataProvider, DataProviderType, ProviderConfig };
