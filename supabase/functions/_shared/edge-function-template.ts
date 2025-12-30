/**
 * Edge Function Template with Rate Limiting and Logging
 *
 * This template demonstrates how to integrate rate limiting and structured logging
 * into Supabase Edge Functions for production readiness.
 *
 * To use this template:
 * 1. Copy this file to your new Edge Function directory
 * 2. Replace 'my-function' with your function name
 * 3. Implement your business logic in the try block
 * 4. Adjust rate limits based on expected usage
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { createLogger, measureTime } from '../_shared/logger.ts';
import { checkRateLimit, getClientIp, createRateLimitResponse } from '../_shared/rate-limit.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Create logger for this function
const logger = createLogger('my-function');

serve(async (req) => {
  // 1. RATE LIMITING
  // Protect against abuse (10 requests per minute per IP)
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(clientIp, 10, 60000);

  if (!rateLimit.allowed) {
    logger.warn('Rate limit exceeded', {
      clientIp,
      retryAfter: rateLimit.retryAfter,
    });
    return createRateLimitResponse(rateLimit.retryAfter!);
  }

  logger.debug('Rate limit check passed', {
    clientIp,
    remaining: rateLimit.remaining,
  });

  // 2. REQUEST PROCESSING
  try {
    logger.info('Function invoked', { clientIp });

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // YOUR BUSINESS LOGIC HERE
    // Example: Measure execution time of a database operation
    const [result, duration] = await measureTime(async () => {
      // Simulate some work
      const { data, error } = await supabase
        .from('events')
        .select('count')
        .single();

      if (error) throw error;
      return data;
    });

    logger.success('Function completed', duration, { result });

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        executionTime: duration,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Execution-Time': `${duration}ms`,
        },
      }
    );
  } catch (error) {
    // 3. ERROR HANDLING
    logger.error('Function failed', error as Error, {
      clientIp,
      errorMessage: (error as Error).message,
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * INTEGRATION NOTES:
 *
 * 1. Rate Limiting Configuration:
 *    - Adjust maxRequests (default: 10) based on expected usage
 *    - Adjust windowMs (default: 60000 = 1 minute) for time window
 *    - Consider different limits for different endpoints
 *
 * 2. Logging Best Practices:
 *    - Use logger.info() for normal operations
 *    - Use logger.warn() for recoverable issues
 *    - Use logger.error() for failures (will go to Sentry in production)
 *    - Use logger.debug() for development debugging (production filtered)
 *    - Use logger.success() for operation completion with timing
 *
 * 3. Performance Monitoring:
 *    - Use measureTime() for critical operations
 *    - Log execution duration for slow query detection
 *    - Consider setting duration thresholds for warnings
 *
 * 4. Security Considerations:
 *    - Rate limiting prevents DoS attacks
 *    - Service role key bypasses RLS (use with caution)
 *    - Never log sensitive data (passwords, tokens, PII)
 *    - Validate all inputs before processing
 *
 * 5. Testing:
 *    - Test rate limiting by making rapid requests
 *    - Verify error handling with invalid inputs
 *    - Check logs in Supabase dashboard
 *    - Monitor execution time under load
 */
