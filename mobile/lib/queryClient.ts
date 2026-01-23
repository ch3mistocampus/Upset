/**
 * Shared React Query client instance
 * Exported for use in contexts that need direct cache access
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      networkMode: 'offlineFirst', // Use cached data when offline, fetch when online
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
      networkMode: 'offlineFirst',
    },
  },
});
