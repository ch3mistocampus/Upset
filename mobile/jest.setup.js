/**
 * Jest Setup File
 * Loaded before each test suite to configure mocks and extensions
 */

// Jest matchers are now built-in to @testing-library/react-native v12.4+
// No need to import @testing-library/jest-native

// ============================================================================
// AsyncStorage Mock
// ============================================================================
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// ============================================================================
// Expo Router Mocks
// ============================================================================
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  useSegments: jest.fn(() => []),
  usePathname: jest.fn(() => '/'),
  Redirect: jest.fn(({ href }) => `Redirect to ${href}`),
  Link: jest.fn(({ href, children }) => children),
  Stack: jest.fn(({ children }) => children),
  Tabs: jest.fn(({ children }) => children),
}));

// ============================================================================
// Expo Modules Mocks
// ============================================================================
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'test-anon-key',
    },
  },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: jest.fn(() => null),
}));

// ============================================================================
// React Query - Use real implementation for proper testing
// ============================================================================
// Note: We use the real React Query implementation to properly test hooks
// that depend on QueryClient. Individual tests can create their own
// QueryClient with appropriate test settings.

// ============================================================================
// Sentry Mock
// ============================================================================
jest.mock('./lib/sentry', () => ({
  initSentry: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  clearUser: jest.fn(),
  setTag: jest.fn(),
  setExtra: jest.fn(),
  wrapWithSentry: jest.fn((component) => component),
  isSentryReady: jest.fn(() => false),
}));

// ============================================================================
// Supabase Client Mock
// ============================================================================
// Default mock - can be overridden in individual test files
const mockSupabaseClient = {
  auth: {
    signInWithOtp: jest.fn(),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
    resetPasswordForEmail: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
  })),
  rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
};

jest.mock('./lib/supabase', () => ({
  supabase: mockSupabaseClient,
}));

// Export mock for use in tests
export { mockSupabaseClient };

// ============================================================================
// Global Test Utilities
// ============================================================================

// Silence console errors in tests unless explicitly needed
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};

// Set test timeout
jest.setTimeout(10000); // 10 seconds

// ============================================================================
// Test Environment Setup
// ============================================================================

// Mock environment variables
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
