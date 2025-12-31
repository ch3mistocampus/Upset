/**
 * Sentry Error Tracking Configuration
 *
 * This module initializes Sentry for error tracking and provides utilities
 * for capturing errors, messages, and breadcrumbs.
 *
 * Setup:
 * 1. Install: npx expo install @sentry/react-native
 * 2. Add EXPO_PUBLIC_SENTRY_DSN to your .env file
 * 3. Import and call initSentry() in _layout.tsx
 *
 * Note: Sentry is only active in production builds.
 */

// Placeholder type - will be replaced when @sentry/react-native is installed
type SentryType = {
  init: (config: any) => void;
  captureException: (error: Error | unknown, context?: any) => void;
  captureMessage: (message: string, context?: any) => void;
  addBreadcrumb: (breadcrumb: any) => void;
  setUser: (user: any) => void;
  setTag: (key: string, value: string) => void;
  setExtra: (key: string, value: any) => void;
  wrap: (component: any) => any;
};

// Sentry instance - will be set when installed
let Sentry: SentryType | null = null;

// Flag to track initialization
let isInitialized = false;

/**
 * Initialize Sentry error tracking
 * Should be called once at app startup
 */
export function initSentry(): void {
  // Skip in development or if already initialized
  if (__DEV__ || isInitialized) {
    if (__DEV__) {
      console.log('[Sentry] Skipping initialization in development mode');
    }
    return;
  }

  try {
    // Dynamic import to handle when package isn't installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SentryModule = require('@sentry/react-native');
    Sentry = SentryModule;

    const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

    if (!dsn) {
      console.warn('[Sentry] No DSN configured. Error tracking disabled.');
      return;
    }

    SentryModule.init({
      dsn,
      // Enable automatic error tracking
      enableAutoSessionTracking: true,
      // Track 100% of transactions in production (adjust as needed)
      tracesSampleRate: 1.0,
      // Attach stack traces to breadcrumbs
      attachStacktrace: true,
      // Environment based on build
      environment: 'production',
      // Only send events in production
      enabled: !__DEV__,
      // Debugging options (set to true temporarily to debug issues)
      debug: false,
    });

    isInitialized = true;
    console.log('[Sentry] Initialized successfully');
  } catch (error) {
    // Sentry not installed - fail silently
    console.log('[Sentry] @sentry/react-native not installed. Run: npx expo install @sentry/react-native');
  }
}

/**
 * Capture an exception and send to Sentry
 */
export function captureException(error: Error | unknown, context?: Record<string, any>): void {
  if (__DEV__) {
    console.error('[Sentry] captureException:', error, context);
    return;
  }

  if (Sentry) {
    Sentry.captureException(error, {
      extra: context,
    });
  }
}

/**
 * Capture a message and send to Sentry
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, any>
): void {
  if (__DEV__) {
    console.log(`[Sentry] captureMessage (${level}):`, message, context);
    return;
  }

  if (Sentry) {
    Sentry.captureMessage(message, {
      level,
      extra: context,
    });
  }
}

/**
 * Add a breadcrumb for debugging context
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, any>,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info'
): void {
  if (__DEV__) {
    // Already logged by logger.ts
    return;
  }

  if (Sentry) {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level,
    });
  }
}

/**
 * Set user context for error tracking
 * Call after user signs in
 */
export function setUser(userId: string, username?: string, email?: string): void {
  if (__DEV__) {
    console.log('[Sentry] setUser:', { userId, username, email });
    return;
  }

  if (Sentry) {
    Sentry.setUser({
      id: userId,
      username,
      email,
    });
  }
}

/**
 * Clear user context
 * Call after user signs out
 */
export function clearUser(): void {
  if (__DEV__) {
    console.log('[Sentry] clearUser');
    return;
  }

  if (Sentry) {
    Sentry.setUser(null);
  }
}

/**
 * Set a custom tag for filtering in Sentry dashboard
 */
export function setTag(key: string, value: string): void {
  if (Sentry) {
    Sentry.setTag(key, value);
  }
}

/**
 * Set extra context data
 */
export function setExtra(key: string, value: any): void {
  if (Sentry) {
    Sentry.setExtra(key, value);
  }
}

/**
 * Wrap a component with Sentry error boundary
 * Use for critical components that should report render errors
 */
export function wrapWithSentry<T>(Component: T): T {
  if (Sentry) {
    return Sentry.wrap(Component);
  }
  return Component;
}

/**
 * Check if Sentry is initialized and ready
 */
export function isSentryReady(): boolean {
  return isInitialized && Sentry !== null;
}
