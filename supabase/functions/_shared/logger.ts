/**
 * Edge Function Logger
 *
 * Structured logging for Supabase Edge Functions with Sentry integration.
 * Provides consistent log formatting and error tracking.
 *
 * Usage:
 *   logger.info('Syncing events', { count: 10 });
 *   logger.error('Failed to fetch data', error, { url: 'https://...' });
 */

type LogContext = Record<string, any>;

class EdgeLogger {
  private functionName: string;

  constructor(functionName: string) {
    this.functionName = functionName;
  }

  /**
   * Format log message with timestamp and function name
   */
  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${this.functionName}] ${message}`;
  }

  /**
   * Log informational messages
   */
  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage('INFO', message), context || '');
  }

  /**
   * Log warning messages
   */
  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('WARN', message), context || '');

    // TODO: Add Sentry breadcrumb in production
    // if (Deno.env.get('ENVIRONMENT') === 'production') {
    //   Sentry.addBreadcrumb({ message, level: 'warning', data: context });
    // }
  }

  /**
   * Log error messages and send to Sentry
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    console.error(this.formatMessage('ERROR', message), error || '', context || '');

    // TODO: Add Sentry error capture in production
    // if (Deno.env.get('ENVIRONMENT') === 'production' && Sentry) {
    //   Sentry.captureException(error || new Error(message), {
    //     extra: { message, functionName: this.functionName, ...context },
    //   });
    // }
  }

  /**
   * Log debug messages (development only)
   */
  debug(message: string, context?: LogContext): void {
    if (Deno.env.get('ENVIRONMENT') !== 'production') {
      console.log(this.formatMessage('DEBUG', message), context || '');
    }
  }

  /**
   * Log successful operation completion with duration
   */
  success(message: string, durationMs?: number, context?: LogContext): void {
    const ctx = durationMs ? { ...context, durationMs } : context;
    console.log(this.formatMessage('SUCCESS', message), ctx || '');
  }
}

/**
 * Create logger instance for Edge Function
 * @param functionName - Name of the Edge Function
 */
export function createLogger(functionName: string): EdgeLogger {
  return new EdgeLogger(functionName);
}

/**
 * Measure execution time of async function
 * @param fn - Async function to measure
 * @returns Tuple of [result, durationMs]
 */
export async function measureTime<T>(
  fn: () => Promise<T>
): Promise<[T, number]> {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return [result, duration];
}
