/**
 * Sentry Error Tracking Configuration
 *
 * Provides error tracking, performance monitoring, and crash reporting.
 *
 * Setup:
 * 1. Add EXPO_PUBLIC_SENTRY_DSN to your .env file
 * 2. Import and call initSentry() in _layout.tsx
 */

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// Flag to track initialization
let isInitialized = false;

/**
 * Initialize Sentry error tracking
 * Should be called once at app startup
 */
export function initSentry(): void {
  if (isInitialized) {
    return;
  }

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    if (__DEV__) {
      console.log('[Sentry] No DSN provided, skipping initialization');
    }
    return;
  }

  try {
    Sentry.init({
      dsn,

      // Environment
      environment: __DEV__ ? 'development' : 'production',
      release: Constants.expoConfig?.version ?? '1.0.0',

      // Performance monitoring - reduce in production
      tracesSampleRate: __DEV__ ? 1.0 : 0.2,
      enableAutoPerformanceTracing: true,

      // Native crash handling
      enableNative: true,
      enableNativeCrashHandling: true,

      // Only send events in production
      enabled: !__DEV__,

      // Filter out noisy errors
      beforeSend: (event, hint) => {
        const error = hint.originalException;
        if (error instanceof Error) {
          if (error.message.includes('Network request failed')) {
            return null;
          }
        }
        return event;
      },
    });

    isInitialized = true;

    if (__DEV__) {
      console.log('[Sentry] Initialized (disabled in dev)');
    }
  } catch (error) {
    console.error('[Sentry] Failed to initialize:', error);
  }
}

/**
 * Capture an exception and send to Sentry
 */
export function captureException(error: Error | unknown, context?: Record<string, unknown>): void {
  if (!isInitialized) {
    if (__DEV__) {
      console.error('[Sentry] captureException (not initialized):', error, context);
    }
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    Sentry.captureException(error);
  });
}

/**
 * Capture a message and send to Sentry
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, unknown>
): void {
  if (!isInitialized) {
    if (__DEV__) {
      console.log(`[Sentry] captureMessage (not initialized) (${level}):`, message, context);
    }
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    Sentry.captureMessage(message, level);
  });
}

/**
 * Add a breadcrumb for debugging context
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info'
): void {
  if (!isInitialized) return;

  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level,
  });
}

/**
 * Set user context for error tracking
 */
export function setUser(userId: string, username?: string, email?: string): void {
  if (!isInitialized) {
    if (__DEV__) {
      console.log('[Sentry] setUser (not initialized):', { userId, username, email });
    }
    return;
  }

  Sentry.setUser({
    id: userId,
    username,
    email,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearUser(): void {
  if (!isInitialized) return;
  Sentry.setUser(null);
}

/**
 * Set a custom tag for filtering in Sentry dashboard
 */
export function setTag(key: string, value: string): void {
  if (!isInitialized) return;
  Sentry.setTag(key, value);
}

/**
 * Set extra context data
 */
export function setExtra(key: string, value: unknown): void {
  if (!isInitialized) return;
  Sentry.setExtra(key, value);
}

/**
 * Wrap a component with Sentry error boundary
 */
export const ErrorBoundary = Sentry.ErrorBoundary;

/**
 * Wrap navigation container for performance tracking
 */
export const wrap = Sentry.wrap;

/**
 * Check if Sentry is initialized and ready
 */
export function isSentryReady(): boolean {
  return isInitialized;
}

// Re-export for direct access if needed
export { Sentry };
