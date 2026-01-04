/**
 * Sentry Error Tracking Configuration
 *
 * This module initializes Sentry for error tracking and provides utilities
 * for capturing errors, messages, and breadcrumbs.
 *
 * Setup:
 * 1. Install: npx expo install @sentry/react-native
 * 2. Add EXPO_PUBLIC_SENTRY_DSN to your .env file
 * 3. Import and call initSentry() in _layout.tsx useEffect
 *
 * Note: Sentry is temporarily disabled due to Hermes compatibility issues.
 * TODO: Re-enable once @sentry/react-native Hermes support is fixed.
 */

// Flag to track initialization
let isInitialized = false;

/**
 * Initialize Sentry error tracking
 * Should be called once at app startup inside useEffect
 */
export function initSentry(): void {
  // Temporarily disabled - Sentry has Hermes compatibility issues
  if (__DEV__) {
    console.log('[Sentry] Skipping initialization in development mode');
  }
  return;
}

/**
 * Capture an exception and send to Sentry
 * Currently a no-op due to Hermes compatibility issues
 */
export function captureException(error: Error | unknown, context?: Record<string, any>): void {
  if (__DEV__) {
    console.error('[Sentry] captureException:', error, context);
  }
}

/**
 * Capture a message and send to Sentry
 * Currently a no-op due to Hermes compatibility issues
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, any>
): void {
  if (__DEV__) {
    console.log(`[Sentry] captureMessage (${level}):`, message, context);
  }
}

/**
 * Add a breadcrumb for debugging context
 * Currently a no-op due to Hermes compatibility issues
 */
export function addBreadcrumb(
  _message: string,
  _category: string,
  _data?: Record<string, any>,
  _level: 'debug' | 'info' | 'warning' | 'error' = 'info'
): void {
  // No-op
}

/**
 * Set user context for error tracking
 * Currently a no-op due to Hermes compatibility issues
 */
export function setUser(userId: string, username?: string, email?: string): void {
  if (__DEV__) {
    console.log('[Sentry] setUser:', { userId, username, email });
  }
}

/**
 * Clear user context
 * Currently a no-op due to Hermes compatibility issues
 */
export function clearUser(): void {
  if (__DEV__) {
    console.log('[Sentry] clearUser');
  }
}

/**
 * Set a custom tag for filtering in Sentry dashboard
 * Currently a no-op due to Hermes compatibility issues
 */
export function setTag(_key: string, _value: string): void {
  // No-op
}

/**
 * Set extra context data
 * Currently a no-op due to Hermes compatibility issues
 */
export function setExtra(_key: string, _value: any): void {
  // No-op
}

/**
 * Wrap a component with Sentry error boundary
 * Currently a no-op due to Hermes compatibility issues
 */
export function wrapWithSentry<T>(Component: T): T {
  return Component;
}

/**
 * Check if Sentry is initialized and ready
 */
export function isSentryReady(): boolean {
  return false;
}
