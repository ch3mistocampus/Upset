/**
 * Structured Logger
 * Centralized logging with different severity levels and Sentry integration
 *
 * Usage:
 *   logger.info('User signed in', { userId: 'abc123' });
 *   logger.warn('Slow query detected', { duration: 5000, query: 'SELECT...' });
 *   logger.error('Failed to fetch data', error, { endpoint: '/api/users' });
 */

import * as Sentry from './sentry';

type LogContext = Record<string, any>;

class Logger {
  /**
   * Log informational messages
   * These are not sent to Sentry, only console in development
   */
  info(message: string, context?: LogContext): void {
    if (__DEV__) {
      console.log(`[INFO] ${message}`, context || '');
    }
  }

  /**
   * Log warning messages
   * Sent to Sentry in production as warnings
   */
  warn(message: string, context?: LogContext): void {
    console.warn(`[WARN] ${message}`, context || '');

    // Send to Sentry in production
    if (!__DEV__) {
      Sentry.captureMessage(message, 'warning', context);
    }
  }

  /**
   * Log error messages
   * Always sent to Sentry in production
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    console.error(`[ERROR] ${message}`, error || '', context || '');

    // Send to Sentry in production
    if (!__DEV__) {
      if (error instanceof Error) {
        Sentry.captureException(error, { message, ...context });
      } else {
        Sentry.captureException(new Error(message), { originalError: error, ...context });
      }
    }
  }

  /**
   * Log debug messages (development only)
   * Never sent to Sentry
   */
  debug(message: string, context?: LogContext): void {
    if (__DEV__) {
      console.log(`[DEBUG] ${message}`, context || '');
    }
  }

  /**
   * Add breadcrumb for debugging context
   * Helps trace user actions leading to errors
   */
  breadcrumb(message: string, category: string, data?: LogContext): void {
    if (__DEV__) {
      console.log(`[BREADCRUMB] ${category}: ${message}`, data || '');
    }

    // Add breadcrumb to Sentry (works in production)
    Sentry.addBreadcrumb(message, category, data);
  }
}

export const logger = new Logger();
