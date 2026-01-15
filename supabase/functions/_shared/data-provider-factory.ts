/**
 * Data Provider Factory
 * Creates UFCStats data provider
 */

import {
  DataProvider,
  DataProviderType,
  ProviderConfig,
  HealthStatus,
} from "./data-provider-types.ts";
import { createUFCStatsProvider } from "./ufcstats-provider.ts";

// ============================================================================
// Provider Factory
// ============================================================================

/**
 * Create a data provider instance
 */
export function createProvider(_type?: DataProviderType, config?: ProviderConfig): DataProvider {
  return createUFCStatsProvider(config);
}

/**
 * Get the default provider (UFCStats)
 */
export function getDefaultProvider(): DataProvider {
  return createProvider();
}

// ============================================================================
// Exports
// ============================================================================

export { DataProvider, DataProviderType, ProviderConfig };
